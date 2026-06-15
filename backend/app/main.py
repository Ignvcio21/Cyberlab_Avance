"""
main.py — CyberLab Backend
Versión producción: JWT + Rate Limiting + CORS estricto + PostgreSQL
"""
from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy.orm import Session
from sqlalchemy import text, desc
from sqlalchemy.exc import IntegrityError

from typing import Dict, Any, List
from datetime import datetime, timezone, timedelta
import json
import os
import random
import re

from dotenv import load_dotenv
from openai import OpenAI

from .database import SesionLocal, engine, Base
from .models import (
    Usuario, Evento, Alerta, IpBloqueada, AccionUsuario,
    Curso, Capitulo, Leccion, ProgresoUsuario,
    EjercicioDocente, ItemEjercicioDocente, EntregaEjercicioDocente,
    SesionEjercicio, ContenidoInformativo,
)
from .sesiones import (
    crear_sesion, finalizar_sesion, obtener_sesion_activa,
    verificar_expiracion, sesion_a_dict, evaluar_comando_en_sesion,
    materializar_fases, materializar_fases_usuario,
    item_verificable, CATEGORIAS_VERIFICABLES, comandos_sugeridos_para_item,
    finalizar_sesiones_vencidas, registrar_pista,
    aware_utc,
)
from .terminal_comandos import (
    REGISTRO_ATAQUE, REGISTRO_DEFENSA, ALIAS_ATAQUE, despachar,
    q_eventos as _q_eventos, q_alertas as _q_alertas,
)
from .schemas import (
    SolicitudInicioSesion, SolicitudRegistroEstudiante, SolicitudFeedbackIA,
    SolicitudCrearUsuario,
    SolicitudCrearCurso, SolicitudCrearCapitulo, SolicitudCrearLeccion, SolicitudCrearEjercicio,
    SolicitudActualizarProgreso,
    SolicitudEvaluarIntento,
    SolicitudCrearEscenario, EscenarioInstanciaSalida, VariableInstanciaSalida,
    SolicitudSimular,
    EstructuraSalida, RespuestaUsuario,
    SolicitudTerminal, RespuestaTerminal,
    SolicitudTerminalDefensa,
    SolicitudCambiarRol, SolicitudEliminarUsuario,
    SolicitudCrearEjercicioDocente, EjercicioDocenteSalida,
    SolicitudEntregarEjercicio, SolicitudEvaluarEntrega, EntregaSalida,
    SolicitudIaAsistir, SolicitudGuardarContenido,
    SolicitudRecuperarContrasena, SolicitudResetContrasena,
    SolicitudActualizarPerfil, SolicitudCambiarContrasenaPerfil,
)
from .email_utils import (
    correo_recuperar_contrasena,
)
from .auth import (
    hashear_contrasena, verificar_contrasena,
    crear_token, decodificar_token, obtener_usuario_actual,
    solo_admin, solo_docente, cualquier_rol,
    obtener_bd,
)

load_dotenv()
cliente_openai = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
Base.metadata.create_all(bind=engine)


def _migrar_columnas_nuevas():
    """create_all no altera tablas existentes: agrega aquí las columnas
    nuevas en bases ya desplegadas (SQLite local / PostgreSQL en Railway)."""
    from sqlalchemy import inspect
    inspector = inspect(engine)
    es_sqlite = engine.dialect.name == "sqlite"
    bool_def = "BOOLEAN DEFAULT 0" if es_sqlite else "BOOLEAN DEFAULT FALSE"
    pendientes = {
        "entregas_ejercicio_docente": [("detalle", "TEXT"), ("reintento_habilitado", bool_def)],
        "sesiones_ejercicio": [("pistas", "TEXT")],
    }
    with engine.begin() as conexion:
        for tabla, columnas in pendientes.items():
            if tabla not in inspector.get_table_names():
                continue
            existentes = {c["name"] for c in inspector.get_columns(tabla)}
            for nombre, tipo in columnas:
                if nombre not in existentes:
                    conexion.execute(text(f"ALTER TABLE {tabla} ADD COLUMN {nombre} {tipo}"))

    # ips_bloqueadas pasó de global a por-usuario. El UNIQUE viejo sobre
    # direccion_ip no se puede quitar con ALTER de forma portable, así que se
    # recrea la tabla: los bloqueos antiguos no tienen dueño y de todos modos
    # se limpian por ejercicio.
    if "ips_bloqueadas" in inspector.get_table_names():
        cols_ip = {c["name"] for c in inspector.get_columns("ips_bloqueadas")}
        if "usuario_id" not in cols_ip:
            IpBloqueada.__table__.drop(engine)
            IpBloqueada.__table__.create(engine)


_migrar_columnas_nuevas()

# ── Rate limiter ──────────────────────────────────────────────────
# Detrás del proxy de Railway todos los clientes comparten la IP del
# proxy: se limita por usuario autenticado (sub del JWT) y, si no hay
# token, por la IP real informada en X-Forwarded-For.
def _clave_rate_limit(request: Request) -> str:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        try:
            payload = decodificar_token(auth[7:])
            sub = payload.get("sub")
            if sub:
                return f"user:{sub}"
        except Exception:
            pass
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=_clave_rate_limit, default_limits=["200/minute"])

# ── Orígenes permitidos ───────────────────────────────────────────
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
ORIGENES_PERMITIDOS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    FRONTEND_URL,
]

app = FastAPI(
    title="CyberLab API",
    version="2.0.0",
    docs_url=None,        # Deshabilitar Swagger en producción
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGENES_PERMITIDOS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# ── Helpers internos ──────────────────────────────────────────────

def registrar_accion(bd: Session, comando: str, resultado: str, usuario_id: int | None = None):
    bd.add(AccionUsuario(comando=comando, resultado=resultado, usuario_id=usuario_id))
    bd.commit()


def obtener_usuario_por_nombre(bd: Session, nombre: str) -> Usuario | None:
    return bd.query(Usuario).filter(Usuario.nombre_usuario == nombre).first()


def exigir_rol(usuario: Usuario | None, roles: list[str]):
    if not usuario or usuario.rol not in roles:
        raise HTTPException(status_code=403, detail="No autorizado")


# ── Variables aleatorias para escenarios ─────────────────────────

def _ip():
    return f"192.168.{random.randint(1,10)}.{random.randint(10,250)}"

def _usuario():
    return random.choice(["admin","root","operador","soporte","sysadmin","backup","deploy","usuario"])

def _servicio():
    return random.choice(["ssh","rdp","vpn","panel-web","ftp","smtp","api-rest"])

def _puertos():
    return random.choice([
        "22, 80, 443","22, 3389","21, 22, 80",
        "80, 443, 8080","25, 110, 143","3306, 5432","8000, 8080, 8443"
    ])

def _empresa():
    return random.choice([
        "Tecnoserv S.A.","DataCore Ltda.","SecureNet Corp.",
        "Infranet Solutions","CloudOps Chile","NetGuard Sistemas","BankTech S.A."
    ])

def _render(plantilla: str, vars: dict) -> str:
    t = plantilla
    for k, v in vars.items():
        t = t.replace("{{" + k + "}}", str(v))
    return t


# ── Narrativas ────────────────────────────────────────────────────

PLANTILLAS_FB = [
    {"nombre": "Fuerza bruta: ataque SSH corporativo",
     "narrativa": "El sistema de monitoreo de {{empresa}} ha detectado múltiples intentos de autenticación fallidos contra el servicio {{servicio}} desde la dirección {{ip_atacante}}. El objetivo parece ser la cuenta privilegiada '{{usuario_objetivo}}'. Se han registrado más de 10 intentos en menos de 30 segundos, lo que indica automatización. Analiza las alertas y eventos, luego contén el ataque bloqueando la IP origen."},
    {"nombre": "Fuerza bruta: acceso a panel de administración",
     "narrativa": "Se detectó actividad inusual en el panel de administración de {{empresa}}. Un agente externo desde {{ip_atacante}} intenta obtener acceso al servicio {{servicio}} mediante un ataque automatizado contra el usuario '{{usuario_objetivo}}'. Los registros muestran intentos con diccionario de contraseñas comunes. Tu misión: revisar evidencia, identificar el origen y bloquearlo."},
    {"nombre": "Fuerza bruta: credenciales de servicio crítico",
     "narrativa": "Alerta de seguridad en {{empresa}}: el servicio {{servicio}} reporta actividad sospechosa. La IP {{ip_atacante}} ha generado múltiples errores de autenticación contra '{{usuario_objetivo}}'. El patrón sugiere uso de herramientas automatizadas tipo Hydra o Medusa. Revisa los eventos del sistema, valida las alertas generadas y aplica la medida de contención."},
    {"nombre": "Fuerza bruta: enumeración de cuentas válidas",
     "narrativa": "El equipo de seguridad de {{empresa}} notificó comportamiento anómalo en {{servicio}}. Desde {{ip_atacante}} se realizan intentos de autenticación con múltiples variantes del usuario '{{usuario_objetivo}}'. Este patrón es típico de ataques de enumeración. Analiza las alertas activas, examina el log de eventos y bloquea la IP atacante."},
    {"nombre": "Fuerza bruta: ataque de baja velocidad (slow brute)",
     "narrativa": "Se detectó un ataque de fuerza bruta de baja velocidad en {{empresa}}. La IP {{ip_atacante}} envía intentos contra {{servicio}} con intervalos calculados para evadir umbrales básicos, apuntando a la cuenta '{{usuario_objetivo}}'. El sistema lo identificó por acumulación progresiva de fallos. Revisa la evidencia, confirma el patrón y bloquea el origen."},
]

PLANTILLAS_EP = [
    {"nombre": "Escaneo de puertos: reconocimiento inicial",
     "narrativa": "Se detectó actividad de reconocimiento de red en {{empresa}}. La IP {{ip_atacante}} está realizando un escaneo sobre los puertos {{puertos}} del host interno. Este tipo de actividad suele preceder a un ataque más específico. Revisa los eventos, confirma el patrón de reconocimiento y contén la amenaza."},
    {"nombre": "Escaneo de puertos: barrido SYN sigiloso",
     "narrativa": "El IDS de {{empresa}} registró múltiples paquetes SYN sin completar el handshake TCP. La fuente es {{ip_atacante}} y los puertos objetivo son {{puertos}}. Este patrón corresponde a un escaneo SYN (half-open) típico de herramientas como Nmap. Analiza los eventos, revisa las alertas generadas e impide que el atacante continúe."},
    {"nombre": "Escaneo de puertos: detección de servicios expuestos",
     "narrativa": "Un agente desde {{ip_atacante}} sondea la red de {{empresa}} intentando identificar servicios activos en los puertos {{puertos}}. Los registros muestran solicitudes de banner grabbing para determinar versiones de software. Esta fase de reconocimiento activo debe contenerse de inmediato: alertas, eventos, bloqueo."},
    {"nombre": "Escaneo de puertos: barrido UDP",
     "narrativa": "Se detectó un barrido de puertos UDP desde {{ip_atacante}} hacia activos de {{empresa}}. Los puertos afectados incluyen {{puertos}}. Los escaneos UDP apuntan a servicios como DNS, SNMP o NTP y son difíciles de detectar. El patrón fue capturado por correlación de logs. Analiza alertas, revisa eventos y bloquea."},
    {"nombre": "Escaneo de puertos: fingerprinting de sistema operativo",
     "narrativa": "El sistema de monitoreo de {{empresa}} detectó intentos de fingerprinting desde {{ip_atacante}}. El atacante sondea los puertos {{puertos}} con paquetes especialmente crafteados para identificar el sistema operativo del host objetivo. Revisa alertas y eventos para confirmar la amenaza y bloquea la IP."},
]


def _enriquecer_ia(narrativa_base: str, variables: dict, tipo: str) -> str:
    try:
        vars_str = "\n".join(f"- {k}: {v}" for k, v in variables.items())
        prompt = (
            f"Eres un instructor de ciberseguridad. Reescribe esta narrativa de laboratorio en español, "
            f"más detallada y realista (máximo 6 oraciones). Mantén exactamente los mismos datos "
            f"({', '.join(variables.values())}). No inventes comandos nuevos.\n\n"
            f"TIPO: {tipo}\nNARRATIVA:\n{narrativa_base}\nVARIABLES:\n{vars_str}\n\nSolo la narrativa:"
        )
        resp = cliente_openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300, temperature=0.7
        )
        texto = resp.choices[0].message.content.strip()
        return texto if texto else narrativa_base
    except Exception as e:
        print(f"[IA] Narrativa no enriquecida: {e}")
        return narrativa_base


# ── Siembra de contenido ──────────────────────────────────────────

def sembrar_contenido_si_falta(bd: Session):
    if bd.query(Curso).first():
        return

    # ── Curso ATAQUE ──
    curso_ataque = Curso(
        titulo="CyberLab: Fundamentos ofensivos y práctica progresiva",
        descripcion="Curso ofensivo con niveles secuenciales (teoría + práctica).",
        nivel="Ataque", activo=True
    )
    bd.add(curso_ataque); bd.commit(); bd.refresh(curso_ataque)

    secciones = [
        ("introduccion","Introducción"),("objetivos","Objetivos del nivel"),
        ("fundamentos","Fundamentos teóricos"),("metodologia","Metodología de trabajo"),
        ("comandos","Comandos y explicación"),("evidencia","Evidencia y análisis"),
        ("procedimiento","Procedimiento guiado"),("errores","Errores comunes"),
        ("buenas_practicas","Buenas prácticas"),("criterio","Criterio de aprobación"),
    ]
    niveles_ataque = [
        (1,"Introducción y fundamentos"),(2,"Fuerza bruta y control de acceso"),
        (3,"Reconocimiento y escaneo de puertos"),(4,"Inyección SQL: detección y mitigación"),
        (5,"XSS: análisis y prevención"),(6,"Defensa: contención y hardening básico"),
        (7,"Defensa: monitoreo, eventos y alertas"),
    ]
    for orden_cap, titulo_cap in niveles_ataque:
        cap = Capitulo(curso_id=curso_ataque.id, titulo=f"Nivel {orden_cap}: {titulo_cap}", orden=orden_cap)
        bd.add(cap); bd.commit(); bd.refresh(cap)
        for i, (id_md, titulo_lec) in enumerate(secciones, 1):
            bd.add(Leccion(
                capitulo_id=cap.id, titulo=titulo_lec, tipo="teoria", orden=i,
                ruta_contenido=f"/contenidos/ataque/nivel{orden_cap}/{id_md}.md"
            ))
        bd.commit()

    # ── Curso DEFENSA ──
    curso_defensa = Curso(
        titulo="CyberLab: Fundamentos defensivos y análisis SOC",
        descripcion="Curso defensivo con niveles secuenciales (teoría + práctica SOC).",
        nivel="Defensa", activo=True
    )
    bd.add(curso_defensa); bd.commit(); bd.refresh(curso_defensa)

    niveles_defensa = [
        (1,"Monitoreo básico y orientación SOC"),
        (2,"Detección de fuerza bruta"),
        (3,"Reconocimiento y escaneo — defensa"),
        (4,"Investigación de incidentes"),
        (5,"Respuesta defensiva activa"),
        (6,"Escenarios complejos multi-vector"),
        (7,"Defensa integral autónoma"),
    ]
    for orden_cap, titulo_cap in niveles_defensa:
        cap = Capitulo(curso_id=curso_defensa.id, titulo=f"Nivel {orden_cap}: {titulo_cap}", orden=orden_cap)
        bd.add(cap); bd.commit(); bd.refresh(cap)
        for i, (id_md, titulo_lec) in enumerate(secciones, 1):
            bd.add(Leccion(
                capitulo_id=cap.id, titulo=titulo_lec, tipo="teoria", orden=i,
                ruta_contenido=f"/contenidos/defensa/nivel{orden_cap}/{id_md}.md"
            ))
        bd.commit()

    # Los ejercicios que rinde el estudiante son los que crea el docente
    # (tabla ejercicios_docente). Las tablas de contenido (cursos/capitulos/
    # lecciones) solo sostienen el progreso de lectura de la teoría.


# ── Startup ───────────────────────────────────────────────────────

@app.on_event("startup")
def iniciar_sistema():
    # Migración DDL con AUTOCOMMIT para evitar transacciones abortadas en PostgreSQL
    dialect = engine.dialect.name
    ac_engine = engine.execution_options(isolation_level="AUTOCOMMIT")

    with ac_engine.connect() as con:
        # Leer columnas existentes
        if dialect == "sqlite":
            columnas = [row[1] for row in con.execute(text("PRAGMA table_info(usuarios)"))]
        else:
            columnas = [row[0] for row in con.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='usuarios'"
            ))]

        # Agregar columnas faltantes (cada una independiente, AUTOCOMMIT = sin tx que abortar)
        for col, tipo in [
            ("nombre",             "TEXT"),
            ("correo",             "TEXT"),
            ("token_reset",        "TEXT"),
            ("token_reset_expira", "TIMESTAMP"),
        ]:
            if col not in columnas:
                try:
                    con.execute(text(f"ALTER TABLE usuarios ADD COLUMN {col} {tipo}"))
                except Exception:
                    pass

        # Crear índice único si no existe
        try:
            if dialect == "sqlite":
                con.execute(text("CREATE UNIQUE INDEX ix_usuarios_correo ON usuarios(correo) WHERE correo IS NOT NULL"))
            else:
                con.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_usuarios_correo ON usuarios(correo) WHERE correo IS NOT NULL"))
        except Exception:
            pass

        # Migración: columna fecha_limite en ejercicios_docente
        try:
            if dialect == "sqlite":
                cols_ej = [row[1] for row in con.execute(text("PRAGMA table_info(ejercicios_docente)"))]
            else:
                cols_ej = [row[0] for row in con.execute(text(
                    "SELECT column_name FROM information_schema.columns WHERE table_name='ejercicios_docente'"
                ))]
            if "fecha_limite" not in cols_ej:
                con.execute(text("ALTER TABLE ejercicios_docente ADD COLUMN fecha_limite TIMESTAMP WITH TIME ZONE"))
        except Exception:
            pass

        # Migración: columna ip_atacante en sesiones_ejercicio
        try:
            if dialect == "sqlite":
                cols_ses = [row[1] for row in con.execute(text("PRAGMA table_info(sesiones_ejercicio)"))]
            else:
                cols_ses = [row[0] for row in con.execute(text(
                    "SELECT column_name FROM information_schema.columns WHERE table_name='sesiones_ejercicio'"
                ))]
            if cols_ses and "ip_atacante" not in cols_ses:
                con.execute(text("ALTER TABLE sesiones_ejercicio ADD COLUMN ip_atacante TEXT"))
            if cols_ses and "fases" not in cols_ses:
                con.execute(text("ALTER TABLE sesiones_ejercicio ADD COLUMN fases TEXT DEFAULT '[]'"))
            if cols_ses and "ips_atacantes" not in cols_ses:
                con.execute(text("ALTER TABLE sesiones_ejercicio ADD COLUMN ips_atacantes TEXT"))
        except Exception:
            pass

        # Migración: columna usuario_id en eventos y alertas (laboratorio por usuario)
        for tabla in ("eventos", "alertas"):
            try:
                if dialect == "sqlite":
                    cols_t = [row[1] for row in con.execute(text(f"PRAGMA table_info({tabla})"))]
                else:
                    cols_t = [row[0] for row in con.execute(text(
                        f"SELECT column_name FROM information_schema.columns WHERE table_name='{tabla}'"
                    ))]
                if cols_t and "usuario_id" not in cols_t:
                    con.execute(text(f"ALTER TABLE {tabla} ADD COLUMN usuario_id INTEGER"))
            except Exception:
                pass

    bd = SesionLocal()
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@gmail.com")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
    admin = bd.query(Usuario).filter(Usuario.nombre_usuario == "admin").first()
    if not admin:
        bd.add(Usuario(
            nombre_usuario="admin",
            nombre="Administrador",
            correo=ADMIN_EMAIL,
            contrasena=hashear_contrasena(ADMIN_PASSWORD),
            rol="admin"
        ))
        bd.commit()
    else:
        if admin.rol != "admin":
            admin.rol = "admin"
        if not admin.correo:
            admin.correo = ADMIN_EMAIL
        if not admin.nombre:
            admin.nombre = "Administrador"
        bd.commit()
    # Limpiar entregas duplicadas (conservar la más reciente por ejercicio+usuario)
    try:
        duplicados = bd.execute(text("""
            DELETE FROM entregas_ejercicio_docente
            WHERE id NOT IN (
                SELECT MAX(id) FROM entregas_ejercicio_docente
                GROUP BY ejercicio_id, usuario_id
            )
        """))
        bd.commit()
    except Exception:
        bd.rollback()
    # Crear índice único si no existe
    try:
        bd.execute(text("CREATE UNIQUE INDEX uq_entrega_ejercicio_usuario ON entregas_ejercicio_docente(ejercicio_id, usuario_id)"))
        bd.commit()
    except Exception:
        bd.rollback()
    sembrar_contenido_si_falta(bd)
    bd.close()


# ================================================================
# ENDPOINTS
# ================================================================

@app.get("/")
def raiz():
    return {"mensaje": "CyberLab API v2.0 operativa"}


# ── Health check ──────────────────────────────────────────────────
@app.get("/health")
def health():
    import os
    return {"status": "ok"}



# ── Auth ──────────────────────────────────────────────────────────

@app.post("/iniciar-sesion")
@limiter.limit("10/minute")
def iniciar_sesion(request: Request, datos: SolicitudInicioSesion, bd: Session = Depends(obtener_bd)):
    from sqlalchemy import func
    correo = (datos.correo or "").strip()
    u = bd.query(Usuario).filter(func.lower(Usuario.correo) == correo.lower()).first()
    if not u or not verificar_contrasena(datos.contrasena, u.contrasena):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    # Migración automática: cuentas antiguas con contraseña en texto plano
    # se re-cifran con bcrypt en su primer login exitoso
    if not (u.contrasena or "").startswith("$2"):
        u.contrasena = hashear_contrasena(datos.contrasena)
        bd.commit()
    token = crear_token({"sub": u.nombre_usuario, "rol": u.rol})
    return {"mensaje": "Inicio de sesión correcto", "nombre_usuario": u.nombre_usuario, "nombre": u.nombre, "rol": u.rol, "token": token}


@app.post("/registrar")
@limiter.limit("5/minute")
def registrar_estudiante(request: Request, datos: SolicitudRegistroEstudiante, bd: Session = Depends(obtener_bd)):
    correo = datos.correo.strip().lower()
    if bd.query(Usuario).filter(Usuario.correo == correo).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    bd.add(Usuario(
        nombre_usuario=correo,
        nombre=datos.nombre.strip(),
        correo=correo,
        contrasena=hashear_contrasena(datos.contrasena),
        rol="estudiante"
    ))
    bd.commit()
    return {"mensaje": "Registro completado (estudiante)"}


# ── Admin ─────────────────────────────────────────────────────────

@app.post("/admin/crear-usuario")
def admin_crear_usuario(datos: SolicitudCrearUsuario, usuario_actual: Usuario = Depends(solo_admin), bd: Session = Depends(obtener_bd)):
    rol = (datos.rol or "").strip().lower()
    if rol not in ["estudiante", "docente"]:
        raise HTTPException(status_code=400, detail="Rol inválido")
    correo = datos.correo.strip().lower()
    if bd.query(Usuario).filter(Usuario.correo == correo).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    bd.add(Usuario(nombre_usuario=correo, nombre=datos.nombre.strip(), correo=correo, contrasena=hashear_contrasena(datos.contrasena), rol=rol))
    bd.commit()
    return {"mensaje": f"Usuario creado ({rol})"}


@app.get("/admin/usuarios", response_model=list[RespuestaUsuario])
def admin_listar_usuarios(usuario_actual: Usuario = Depends(solo_admin), bd: Session = Depends(obtener_bd), q: str = ""):
    query = bd.query(Usuario)
    if q:
        termino = f"%{q.strip().lower()}%"
        query = query.filter(
            (Usuario.correo.ilike(termino)) | (Usuario.nombre.ilike(termino)) | (Usuario.nombre_usuario.ilike(termino))
        )
    return query.order_by(Usuario.id.asc()).all()


@app.post("/admin/cambiar-rol")
def admin_cambiar_rol(datos: SolicitudCambiarRol, usuario_actual: Usuario = Depends(solo_admin), bd: Session = Depends(obtener_bd)):
    rol = (datos.nuevo_rol or "").strip().lower()
    if rol not in ["estudiante", "docente", "admin"]:
        raise HTTPException(status_code=400, detail="Rol inválido — usa: estudiante, docente o admin")
    u = bd.query(Usuario).filter(Usuario.nombre_usuario == datos.nombre_usuario).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    u.rol = rol
    bd.commit()
    return {"mensaje": f"Rol de '{datos.nombre_usuario}' cambiado a '{rol}'"}


@app.delete("/admin/eliminar-usuario")
def admin_eliminar_usuario(
    datos: SolicitudEliminarUsuario,
    usuario_actual: Usuario = Depends(solo_admin),
    bd: Session = Depends(obtener_bd)
):
    # Protecciones básicas
    if datos.nombre_usuario == usuario_actual.nombre_usuario:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")

    u = obtener_usuario_por_nombre(bd, datos.nombre_usuario)
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Protección: no permitir eliminar si es el único admin
    if u.rol == "admin":
        total_admins = bd.query(Usuario).filter(Usuario.rol == "admin").count()
        if total_admins <= 1:
            raise HTTPException(status_code=400, detail="No se puede eliminar el único administrador del sistema")

    uid = u.id

    # 1. Nullificar FKs opcionales que apuntan al usuario
    bd.query(AccionUsuario).filter(AccionUsuario.usuario_id == uid).update({"usuario_id": None})
    bd.query(Curso).filter(Curso.creado_por_usuario_id == uid).update({"creado_por_usuario_id": None})

    # 2. Eliminar progreso de lecciones
    bd.query(ProgresoUsuario).filter(ProgresoUsuario.usuario_id == uid).delete()

    # 3. Eliminar entregas de ejercicios docente
    bd.query(EntregaEjercicioDocente).filter(EntregaEjercicioDocente.usuario_id == uid).delete()

    # 4. Eliminar el usuario
    bd.delete(u)
    bd.commit()

    return {"mensaje": f"Usuario '{datos.nombre_usuario}' eliminado correctamente"}


@app.post("/admin/curso")
def admin_crear_curso(datos: SolicitudCrearCurso, usuario_actual: Usuario = Depends(solo_docente), bd: Session = Depends(obtener_bd)):
    curso = Curso(titulo=datos.titulo, descripcion=datos.descripcion, nivel=datos.nivel, activo=True, creado_por_usuario_id=usuario_actual.id)
    bd.add(curso); bd.commit(); bd.refresh(curso)
    return {"mensaje": "Curso creado", "curso_id": curso.id}


@app.post("/admin/capitulo")
def admin_crear_capitulo(datos: SolicitudCrearCapitulo, usuario_actual: Usuario = Depends(solo_docente), bd: Session = Depends(obtener_bd)):
    if not bd.query(Curso).filter(Curso.id == datos.curso_id).first():
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    cap = Capitulo(curso_id=datos.curso_id, titulo=datos.titulo, orden=datos.orden)
    bd.add(cap); bd.commit(); bd.refresh(cap)
    return {"mensaje": "Capítulo creado", "capitulo_id": cap.id}


@app.post("/admin/leccion")
def admin_crear_leccion(datos: SolicitudCrearLeccion, usuario_actual: Usuario = Depends(solo_docente), bd: Session = Depends(obtener_bd)):
    if not bd.query(Capitulo).filter(Capitulo.id == datos.capitulo_id).first():
        raise HTTPException(status_code=404, detail="Capítulo no encontrado")
    lec = Leccion(capitulo_id=datos.capitulo_id, titulo=datos.titulo, tipo=datos.tipo, orden=datos.orden, ruta_contenido=datos.ruta_contenido)
    bd.add(lec); bd.commit(); bd.refresh(lec)
    return {"mensaje": "Lección creada", "leccion_id": lec.id}


# ── Progreso de lectura ───────────────────────────────────────────


@app.post("/progreso/actualizar")
def actualizar_progreso(datos: SolicitudActualizarProgreso, usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    if not bd.query(Leccion).filter(Leccion.id == datos.leccion_id).first():
        raise HTTPException(status_code=404, detail="Lección no encontrada")
    pct = max(0, min(100, int(datos.porcentaje)))
    reg = bd.query(ProgresoUsuario).filter(ProgresoUsuario.usuario_id == usuario_actual.id, ProgresoUsuario.leccion_id == datos.leccion_id).first()
    if reg:
        if pct > reg.porcentaje: reg.porcentaje = pct
        reg.completado = reg.porcentaje >= 100
        bd.commit()
        return {"mensaje": "Progreso actualizado", "porcentaje": reg.porcentaje, "completado": reg.completado}
    reg = ProgresoUsuario(usuario_id=usuario_actual.id, leccion_id=datos.leccion_id, porcentaje=pct, completado=pct >= 100)
    bd.add(reg); bd.commit()
    return {"mensaje": "Progreso creado", "porcentaje": reg.porcentaje, "completado": reg.completado}


@app.get("/progreso/{nombre_usuario}")
def obtener_progreso_usuario(nombre_usuario: str, usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    # Solo el propio usuario o docente/admin puede ver el progreso
    if usuario_actual.nombre_usuario != nombre_usuario and usuario_actual.rol not in ["admin", "docente"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    u = bd.query(Usuario).filter(Usuario.nombre_usuario == nombre_usuario).first()
    if not u: raise HTTPException(status_code=404, detail="Usuario no encontrado")
    registros = bd.query(ProgresoUsuario).filter(ProgresoUsuario.usuario_id == u.id).all()
    return {
        "nombre_usuario": u.nombre_usuario, "rol": u.rol,
        "progreso": [{"leccion_id": r.leccion_id, "porcentaje": r.porcentaje, "completado": r.completado,
                      "ultima_actualizacion": r.ultima_actualizacion.isoformat() if r.ultima_actualizacion else None} for r in registros]
    }


@app.get("/progreso/laboratorio/{nombre_usuario}")
def obtener_niveles_desbloqueados(
    nombre_usuario: str,
    tipo: str | None = None,   # "ataque" | "defensa" | None (todos)
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd)
):
    if usuario_actual.nombre_usuario != nombre_usuario and usuario_actual.rol not in ["admin", "docente"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    u = bd.query(Usuario).filter(Usuario.nombre_usuario == nombre_usuario).first()
    if not u: raise HTTPException(status_code=404, detail="Usuario no encontrado")

    conteo = {n: 0 for n in range(1, 8)}
    totales = {n: 0 for n in range(1, 8)}

    # Total real de ejercicios publicados por nivel (filtrado por tipo si se indica)
    q_ej = bd.query(EjercicioDocente).filter(EjercicioDocente.activo == True)
    if tipo:
        q_ej = q_ej.filter(EjercicioDocente.tipo == tipo)
    for ej_doc in q_ej.all():
        niv = ej_doc.nivel or 1
        if 1 <= niv <= 7:
            totales[niv] += 1

    # Entregas del usuario por nivel
    entregas = bd.query(EntregaEjercicioDocente).filter(
        EntregaEjercicioDocente.usuario_id == u.id,
        EntregaEjercicioDocente.estado.in_(["entregado", "evaluado"])
    ).all()
    for en in entregas:
        ej_doc = bd.query(EjercicioDocente).filter(EjercicioDocente.id == en.ejercicio_id).first()
        if ej_doc:
            if tipo and ej_doc.tipo != tipo:
                continue
            niv = ej_doc.nivel or 1
            if 1 <= niv <= 7:
                conteo[niv] += 1

    niveles_completados = [n for n in range(1, 8) if totales[n] > 0 and conteo[n] >= totales[n]]
    return {
        "nombre_usuario": u.nombre_usuario,
        "niveles_completados": niveles_completados,
        "detalle": {str(n): {
            "completados": min(conteo[n], totales[n]) if totales[n] else conteo[n],
            "total": totales[n],
            "completo": totales[n] > 0 and conteo[n] >= totales[n],
        } for n in range(1, 8)}
    }


def _parse_tiempo_legible(respuesta: str) -> int | None:
    """Extrae los segundos del texto 'Tiempo: X h Y min Z s' de la entrega."""
    m = re.search(r"Tiempo:\s*([^.]+)", respuesta or "")
    if not m:
        return None
    s = m.group(1)
    seg = 0
    h = re.search(r"(\d+)\s*h", s)
    mn = re.search(r"(\d+)\s*min", s)
    sc = re.search(r"(\d+)\s*s\b", s)
    if h:  seg += int(h.group(1)) * 3600
    if mn: seg += int(mn.group(1)) * 60
    if sc: seg += int(sc.group(1))
    return seg or None


def _detalle_entrega(en: EntregaEjercicioDocente) -> dict | None:
    """Snapshot estructurado de la entrega (columna detalle), si existe."""
    try:
        det = json.loads(en.detalle) if en.detalle else None
        return det if isinstance(det, dict) else None
    except Exception:
        return None


def _resumen_entrega(en: EntregaEjercicioDocente) -> dict:
    """Resumen estructurado para las vistas del docente. Usa el snapshot
    `detalle` cuando existe; para entregas antiguas reconstruye lo posible
    desde la frase de texto (único formato que tenían)."""
    det = _detalle_entrega(en)
    if det:
        return {
            "cierre": det.get("cierre"),
            "porcentaje": det.get("porcentaje"),
            "penalizacion": det.get("penalizacion"),
            "porcentaje_final": det.get("porcentaje_final"),
            "tiempo_seg": det.get("tiempo_seg"),
            "ayudas": det.get("ayudas"),
            "nota_sugerida": det.get("nota_sugerida"),
            "fase_max": det.get("fase_max"),
            "total_fases": det.get("total_fases"),
            "tiene_informe": bool(det.get("informe")),
            "items": [
                {"descripcion": i.get("descripcion"), "completado": bool(i.get("completado"))}
                for i in (det.get("items") or [])
            ],
        }
    texto = en.respuesta or ""
    m_final = re.search(r"Resultado:\s*(\d+)%", texto)
    pct_final = int(m_final.group(1)) if m_final else None
    m_check = re.search(r"Checklist:\s*(\d+)%", texto)
    penal = min((en.ayudas_pedidas or 0) * 5, 30)
    pct = int(m_check.group(1)) if m_check else pct_final
    cierre = None
    if texto.startswith("Completado"):
        cierre = "completada"
    elif texto.startswith("Tiempo agotado"):
        cierre = "expirada"
    return {
        "cierre": cierre,
        "porcentaje": pct,
        "penalizacion": penal,
        "porcentaje_final": pct_final,
        "tiempo_seg": _parse_tiempo_legible(texto),
        "ayudas": en.ayudas_pedidas or 0,
        "nota_sugerida": round(1.0 + 6.0 * pct_final / 100.0, 1) if pct_final is not None else None,
        "fase_max": None,
        "total_fases": None,
        "tiene_informe": False,
        "items": None,
    }


# ── Intentos (sistema histórico, solo lectura) ────────────────────
# El endpoint de escritura /intentos/crear fue eliminado: aceptaba el
# porcentaje y estado declarados por el cliente, lo que permitía forjar
# resultados. Los resultados actuales se generan exclusivamente desde
# las sesiones de ejercicio validadas por el servidor (sesiones.py).
# Las lecturas se mantienen para conservar el historial en el panel.

@app.get("/docente/entregas")
def docente_listar_entregas(usuario_actual: Usuario = Depends(solo_docente), bd: Session = Depends(obtener_bd)):
    """Todas las entregas de ejercicios docente, con la misma forma de
    campos que /docente/intentos para que las vistas de estadísticas
    funcionen sin cambios (el sistema de intentos quedó histórico)."""
    # Estudiantes que abandonaron sin volver: sus sesiones vencidas se
    # finalizan aquí para que la entrega parcial sea visible al docente
    finalizar_sesiones_vencidas(bd)
    entregas = bd.query(EntregaEjercicioDocente).order_by(EntregaEjercicioDocente.id.desc()).limit(500).all()
    salida = []
    for en in entregas:
        u = bd.query(Usuario).filter(Usuario.id == en.usuario_id).first()
        ej = bd.query(EjercicioDocente).filter(EjercicioDocente.id == en.ejercicio_id).first()
        resumen = _resumen_entrega(en)
        salida.append({
            "intento_id": en.id,  # alias para compatibilidad con las vistas
            "entrega_id": en.id,
            "usuario": u.nombre_usuario if u else None,
            "ejercicio_id": en.ejercicio_id,
            "descripcion_ejercicio": ej.titulo if ej else f"Ejercicio #{en.ejercicio_id}",
            "tipo": ej.tipo if ej else None,
            "nivel": ej.nivel if ej else None,
            "estado": en.estado,
            "porcentaje": resumen.get("porcentaje_final"),
            "tiempo_seg": resumen.get("tiempo_seg"),
            "errores": None,
            "ayudas_pedidas": en.ayudas_pedidas or 0,
            "nota": en.nota,
            "comentarios": en.comentarios_docente,
            "tiene_evaluacion": en.nota is not None,
            "fecha_inicio": en.fecha_entrega.isoformat() if en.fecha_entrega else None,
            "fecha_fin": en.fecha_evaluacion.isoformat() if en.fecha_evaluacion else None,
        })
    return {"entregas": salida}


@app.get("/docente/intentos")
def docente_listar_intentos(usuario_actual: Usuario = Depends(solo_docente), bd: Session = Depends(obtener_bd)):
    # Sistema de intentos histórico descontinuado: las evaluaciones vigentes
    # viven en entregas_ejercicio_docente (ver /docente/entregas).
    return {"intentos": []}


@app.get("/mis-entregas-docente")
def mis_entregas_docente(usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    # Las entregas con reintento habilitado NO bloquean: el ejercicio vuelve
    # a estar disponible para que el estudiante lo rinda de nuevo.
    entregas = bd.query(EntregaEjercicioDocente).filter(
        EntregaEjercicioDocente.usuario_id == usuario_actual.id,
        EntregaEjercicioDocente.reintento_habilitado == False,
    ).all()
    return {"ejercicio_ids": [e.ejercicio_id for e in entregas]}


@app.get("/mis-evaluaciones")
def mis_evaluaciones(usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    # Sistema de intentos histórico descontinuado (ver /mis-entregas-docente).
    return {"intentos": []}


@app.post("/docente/evaluar")
def docente_evaluar_intento(datos: SolicitudEvaluarIntento, usuario_actual: Usuario = Depends(solo_docente), bd: Session = Depends(obtener_bd)):
    # Sistema de intentos histórico descontinuado: la evaluación vigente se
    # realiza sobre las entregas (ver /ejercicios-docente/entregas/{id}/evaluar).
    raise HTTPException(status_code=410, detail="El sistema de intentos fue descontinuado; evalúa desde las entregas.")


# Las simulaciones y la ayuda por escenario (sistema viejo) fueron retiradas:
# el flujo vigente siembra el laboratorio desde la sesión del ejercicio docente
# (sesiones.py) y las pistas se piden en /ejercicios-docente/sesion/pista.


# ── Estadísticas ──────────────────────────────────────────────────

@app.get("/estadisticas")
def obtener_estadisticas(usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    # El polling del dashboard mantiene vivo el ataque en tiempo real
    materializar_fases_usuario(bd, usuario_actual.id)
    return {
        "total_eventos": _q_eventos(bd, usuario_actual.id).count(),
        "total_alertas": _q_alertas(bd, usuario_actual.id).count(),
        "eventos_recientes": [{"id": e.id, "tipo_evento": e.tipo_evento, "ip_origen": e.ip_origen, "descripcion": e.descripcion, "fecha_creacion": e.fecha_creacion.isoformat() if e.fecha_creacion else None} for e in _q_eventos(bd, usuario_actual.id).order_by(Evento.fecha_creacion.desc()).limit(10).all()],
        "alertas_recientes": [{"id": a.id, "titulo": a.titulo, "severidad": a.severidad, "descripcion": a.descripcion, "evento_id": a.evento_id, "fecha_creacion": a.fecha_creacion.isoformat() if a.fecha_creacion else None} for a in _q_alertas(bd, usuario_actual.id).order_by(Alerta.fecha_creacion.desc()).limit(10).all()],
    }


# ── Terminal ataque ───────────────────────────────────────────────

def _construir_contexto_real(bd: Session, usuario_id: int) -> str:
    """Construye contexto con datos reales de la BD para enriquecer el prompt de IA."""
    eventos = _q_eventos(bd, usuario_id).order_by(Evento.fecha_creacion.desc()).limit(8).all()
    alertas = _q_alertas(bd, usuario_id).order_by(Alerta.fecha_creacion.desc()).limit(5).all()
    bloqueadas = bd.query(IpBloqueada).filter(IpBloqueada.usuario_id == usuario_id).limit(5).all()
    ips_activas = list(set(e.ip_origen for e in eventos))[:5]

    ctx = "=== CONTEXTO DEL LABORATORIO (datos reales) ===\n"
    ctx += f"IPs activas detectadas: {', '.join(ips_activas) if ips_activas else 'ninguna'}\n"
    if alertas:
        ctx += f"Alertas activas ({len(alertas)}): " + " | ".join(f"{a.severidad}:{a.titulo}" for a in alertas) + "\n"
    if eventos:
        ctx += f"Últimos eventos ({len(eventos)}): " + " | ".join(f"{e.tipo_evento} src={e.ip_origen}" for e in eventos) + "\n"
    if bloqueadas:
        ctx += f"IPs bloqueadas: {', '.join(ip.direccion_ip for ip in bloqueadas)}\n"
    ctx += "=== FIN CONTEXTO ===\n"
    return ctx


@app.post("/terminal", response_model=RespuestaTerminal)
@limiter.limit("60/minute")
def ejecutar_terminal(request: Request, datos: SolicitudTerminal, usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    materializar_fases_usuario(bd, usuario_actual.id)
    resp = _terminal_ataque(datos, usuario_actual, bd)
    info_sesion = evaluar_comando_en_sesion(bd, usuario_actual.id, datos.comando or "", resp.get("salida", ""))
    if info_sesion:
        resp["sesion"] = info_sesion
    return resp


def _terminal_ataque(datos: SolicitudTerminal, usuario_actual: Usuario, bd: Session) -> dict:
    raw = (datos.comando or "").strip()

    def guardar(res: str):
        bd.add(AccionUsuario(comando=raw, resultado=res, usuario_id=usuario_actual.id))
        bd.commit()

    if not raw:
        guardar("ERROR"); return {"salida": "bash: command not found"}

    # Patrón Command: cada comando es un handler registrado; lo que no
    # está implementado se delega en la IA con contexto real (fallback).
    cmd_l = ALIAS_ATAQUE.get(raw.lower().strip(), raw.lower().strip())
    sesion_activa = obtener_sesion_activa(bd, usuario_actual.id)
    salida = despachar(REGISTRO_ATAQUE, bd, usuario_actual, cmd_l,
                       ctx={"sesion": sesion_activa})
    if salida is not None:
        guardar("OK"); return {"salida": salida}

    # ── Todo lo demás → OpenAI con contexto real ─────────────────
    try:
        contexto_real = _construir_contexto_real(bd, usuario_actual.id)

        ai_resp = cliente_openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Eres una terminal Kali Linux real en un laboratorio educativo de ciberseguridad (CyberLab). "
                        "El usuario es un estudiante de ciberseguridad realizando ejercicios de pentesting. "
                        "Responde EXACTAMENTE como lo haría la terminal real de Kali Linux al ejecutar el comando. "
                        "Usa el contexto del laboratorio para hacer las respuestas coherentes con el escenario real. "
                        "Responde SOLO con la salida del terminal, sin explicaciones ni comentarios fuera de la salida. "
                        "Máximo 25 líneas. Formato realista de terminal Linux. "
                        "Si el comando no existe o falla, responde con el error exacto que daría bash/Kali.\n\n"
                        + contexto_real
                    )
                },
                {"role": "user", "content": raw}
            ],
            max_tokens=500,
            temperature=0.2,
        )
        salida_ia = ai_resp.choices[0].message.content.strip()
        guardar("OK")
        return {"salida": salida_ia}
    except Exception:
        guardar("ERROR")
        return {"salida": f"bash: {raw}: command not found"}


# ── Terminal defensa ──────────────────────────────────────────────
# (Importar el contenido del archivo backend_defensa.py aquí)
# El endpoint /defensa/terminal va completo abajo

@app.post("/defensa/terminal")
@limiter.limit("60/minute")
def terminal_defensiva(request: Request, datos: SolicitudTerminalDefensa, usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    materializar_fases_usuario(bd, usuario_actual.id)
    resp = _terminal_defensa(datos, usuario_actual, bd)
    info_sesion = evaluar_comando_en_sesion(bd, usuario_actual.id, datos.comando or "", resp.get("salida", ""))
    if info_sesion:
        resp["sesion"] = info_sesion
    return resp


def _terminal_defensa(datos: SolicitudTerminalDefensa, usuario_actual: Usuario, bd: Session) -> dict:
    raw = (datos.comando or "").strip()

    def guardar(res: str):
        bd.add(AccionUsuario(comando=raw, resultado=res, usuario_id=usuario_actual.id))
        bd.commit()

    if not raw:
        guardar("ERROR"); return {"salida": "bash: command not found"}

    # Patrón Command: registro de handlers SOC; lo no implementado va a IA.
    salida = despachar(REGISTRO_DEFENSA, bd, usuario_actual, raw,
                       ctx={"ip_escenario": datos.ip_escenario})
    if salida is not None:
        guardar("OK"); return {"salida": salida}

    # ── Fallback → OpenAI con contexto real ──────────────────────
    try:
        contexto_real = _construir_contexto_real(bd, usuario_actual.id)
        ai_resp = cliente_openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Eres una terminal SOC (Security Operations Center) de un laboratorio educativo de ciberseguridad (CyberLab). "
                        "El operador es un estudiante de blue team / defensa. "
                        "Responde EXACTAMENTE como lo haría la terminal real al ejecutar el comando. "
                        "Usa el contexto del laboratorio para hacer las respuestas coherentes con el escenario real. "
                        "Responde SOLO con la salida del terminal, sin explicaciones ni comentarios fuera de la salida. "
                        "Máximo 25 líneas. Formato realista de terminal Linux. "
                        "Si el comando no existe, responde con el error exacto que daría bash.\n\n"
                        + contexto_real
                    )
                },
                {"role": "user", "content": raw}
            ],
            max_tokens=500,
            temperature=0.2,
        )
        salida_ia = ai_resp.choices[0].message.content.strip()
        guardar("OK")
        return {"salida": salida_ia}
    except Exception:
        guardar("ERROR")
        return {"salida": f"bash: {raw}: command not found\nEscribe 'ayuda' para ver los comandos del SOC."}


# ── Perfil de usuario ─────────────────────────────────────────────

@app.get("/perfil")
def obtener_perfil(usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    # Las estadísticas salen del sistema REAL de entregas (no del legacy
    # IntentoEjercicio, que dejaba los números en 0 aunque el alumno entregara).
    entregas = bd.query(EntregaEjercicioDocente).filter(EntregaEjercicioDocente.usuario_id == usuario_actual.id).all()
    evaluadas = [e for e in entregas if e.nota is not None]
    aprobadas = [e for e in evaluadas if e.nota >= 4]
    nota_prom = round(sum(e.nota for e in evaluadas) / len(evaluadas), 1) if evaluadas else None
    return {
        "id": usuario_actual.id,
        "nombre_usuario": usuario_actual.nombre_usuario,
        "nombre": usuario_actual.nombre,
        "correo": usuario_actual.correo,
        "rol": usuario_actual.rol,
        "fecha_creacion": usuario_actual.fecha_creacion.isoformat() if usuario_actual.fecha_creacion else None,
        "stats": {
            "entregas_total": len(entregas),
            "entregas_evaluadas": len(evaluadas),
            "nota_promedio": nota_prom,
            "entregas_aprobadas": len(aprobadas),
        }
    }


@app.put("/perfil/actualizar")
def actualizar_perfil(datos: SolicitudActualizarPerfil, usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    nombre = (datos.nombre or "").strip()
    nuevo_username = (datos.nombre_usuario or "").strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre no puede estar vacío")
    if not nuevo_username or len(nuevo_username) < 3:
        raise HTTPException(status_code=400, detail="El nombre de usuario debe tener al menos 3 caracteres")
    username_cambio = nuevo_username != usuario_actual.nombre_usuario
    if username_cambio:
        existente = bd.query(Usuario).filter(Usuario.nombre_usuario == nuevo_username, Usuario.id != usuario_actual.id).first()
        if existente:
            raise HTTPException(status_code=400, detail="Ese nombre de usuario ya está en uso")
    usuario_actual.nombre = nombre
    usuario_actual.nombre_usuario = nuevo_username
    bd.commit()
    return {"mensaje": "Perfil actualizado correctamente", "username_cambio": username_cambio}


@app.put("/perfil/cambiar-contrasena")
def cambiar_contrasena_perfil(datos: SolicitudCambiarContrasenaPerfil, usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    from .auth import verificar_contrasena, hashear_contrasena
    if not verificar_contrasena(datos.contrasena_actual, usuario_actual.contrasena):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")
    usuario_actual.contrasena = hashear_contrasena(datos.nueva_contrasena)
    bd.commit()
    return {"mensaje": "Contraseña actualizada correctamente"}


# ── Contenido informativo (teoría editable desde el panel) ────────

SECCIONES_CONTENIDO = {
    "introduccion", "objetivos", "fundamentos", "metodologia", "comandos",
    "evidencia", "procedimiento", "errores", "buenas_practicas", "criterio",
}
TIPOS_CONTENIDO = {"ataque", "defensa"}


def _validar_ref_contenido(tipo: str, nivel: int, seccion: str):
    if tipo not in TIPOS_CONTENIDO:
        raise HTTPException(status_code=400, detail="Tipo inválido (ataque|defensa)")
    if not (1 <= nivel <= 7):
        raise HTTPException(status_code=400, detail="Nivel fuera de rango (1-7)")
    if seccion not in SECCIONES_CONTENIDO:
        raise HTTPException(status_code=400, detail="Sección desconocida")


@app.get("/contenido-informativo/{tipo}/{nivel}")
def overrides_contenido(tipo: str, nivel: int, usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    """Secciones de este tipo/nivel que tienen contenido editado en BD."""
    rows = bd.query(ContenidoInformativo).filter(
        ContenidoInformativo.tipo == tipo, ContenidoInformativo.nivel == nivel,
    ).all()
    return {"overrides": [r.seccion for r in rows]}


@app.get("/contenido-informativo/{tipo}/{nivel}/{seccion}")
def obtener_contenido_informativo(tipo: str, nivel: int, seccion: str, usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    """Devuelve el override editado si existe; si no, origen=null y el cliente
    usa el archivo .md estático."""
    row = bd.query(ContenidoInformativo).filter(
        ContenidoInformativo.tipo == tipo, ContenidoInformativo.nivel == nivel,
        ContenidoInformativo.seccion == seccion,
    ).first()
    if not row:
        return {"contenido": None, "origen": None}
    return {
        "contenido": row.contenido, "origen": "db",
        "fecha_actualizacion": row.fecha_actualizacion.isoformat() if row.fecha_actualizacion else None,
    }


@app.put("/contenido-informativo/{tipo}/{nivel}/{seccion}")
def guardar_contenido_informativo(tipo: str, nivel: int, seccion: str, datos: SolicitudGuardarContenido, usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    if usuario_actual.rol not in ("docente", "admin"):
        raise HTTPException(status_code=403, detail="Sin permiso")
    _validar_ref_contenido(tipo, nivel, seccion)
    row = bd.query(ContenidoInformativo).filter(
        ContenidoInformativo.tipo == tipo, ContenidoInformativo.nivel == nivel,
        ContenidoInformativo.seccion == seccion,
    ).first()
    if row:
        row.contenido = datos.contenido
        row.actualizado_por_id = usuario_actual.id
    else:
        bd.add(ContenidoInformativo(
            tipo=tipo, nivel=nivel, seccion=seccion,
            contenido=datos.contenido, actualizado_por_id=usuario_actual.id,
        ))
    bd.commit()
    return {"mensaje": "Contenido guardado"}


@app.delete("/contenido-informativo/{tipo}/{nivel}/{seccion}")
def revertir_contenido_informativo(tipo: str, nivel: int, seccion: str, usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    """Elimina el override y vuelve al contenido original (.md estático)."""
    if usuario_actual.rol not in ("docente", "admin"):
        raise HTTPException(status_code=403, detail="Sin permiso")
    row = bd.query(ContenidoInformativo).filter(
        ContenidoInformativo.tipo == tipo, ContenidoInformativo.nivel == nivel,
        ContenidoInformativo.seccion == seccion,
    ).first()
    if row:
        bd.delete(row)
        bd.commit()
    return {"mensaje": "Contenido restaurado al original"}


# ── Recuperación de contraseña ────────────────────────────────────

@app.post("/auth/recuperar-contrasena")
@limiter.limit("5/minute")
def recuperar_contrasena(request: Request, datos: SolicitudRecuperarContrasena, bd: Session = Depends(obtener_bd)):
    import secrets
    from datetime import datetime, timezone, timedelta
    # Siempre responder igual para no revelar si el correo existe
    usuario = bd.query(Usuario).filter(Usuario.correo == datos.correo.strip().lower()).first()
    if usuario:
        token = secrets.token_urlsafe(32)
        usuario.token_reset = token
        usuario.token_reset_expira = datetime.now(timezone.utc) + timedelta(hours=1)
        bd.commit()
        correo_recuperar_contrasena(
            destinatario=usuario.correo,
            nombre=usuario.nombre or usuario.nombre_usuario,
            token=token,
        )
    return {"mensaje": "Si ese correo está registrado, recibirás un enlace para restablecer tu contraseña."}


@app.post("/auth/reset-contrasena")
@limiter.limit("10/minute")
def reset_contrasena(request: Request, datos: SolicitudResetContrasena, bd: Session = Depends(obtener_bd)):
    from datetime import datetime, timezone
    if not datos.nueva_contrasena or len(datos.nueva_contrasena) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")
    usuario = bd.query(Usuario).filter(Usuario.token_reset == datos.token).first()
    if not usuario:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    if usuario.token_reset_expira and usuario.token_reset_expira.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="El enlace expiró. Solicita uno nuevo.")
    usuario.contrasena = hashear_contrasena(datos.nueva_contrasena)
    usuario.token_reset = None
    usuario.token_reset_expira = None
    bd.commit()
    return {"mensaje": "Contraseña actualizada correctamente. Ya puedes iniciar sesión."}


# ── Feedback IA ───────────────────────────────────────────────────

@app.post("/ia/feedback")
@limiter.limit("10/minute")
def ia_feedback(request: Request, body: SolicitudFeedbackIA, usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    prompt = (
        f"Eres un docente universitario de ciberseguridad. Explica el comando del estudiante de forma didáctica y breve.\n"
        f"Nivel: {body.nivel}\nComando: {body.comando}\nResultado: {body.resultado}\nEvidencia: {body.evidencia}"
    )
    try:
        r = cliente_openai.chat.completions.create(model="gpt-4o-mini", messages=[{"role": "user", "content": prompt}], max_tokens=400)
        return {"feedback": r.choices[0].message.content.strip()}
    except Exception:
        raise HTTPException(status_code=503, detail="El servicio de IA no está disponible en este momento")


# ── Ejercicios creados por docente ────────────────────────────────

@app.post("/ejercicios-docente/crear")
def crear_ejercicio_docente(
    datos: SolicitudCrearEjercicioDocente,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    if usuario_actual.rol not in ("docente", "admin"):
        raise HTTPException(status_code=403, detail="Solo docentes y admin pueden crear ejercicios")

    # Validar que cada punto sea verificable con los comandos del laboratorio:
    # un punto sin familia de comandos asociada jamás podría completarse y
    # dejaría el ejercicio imposible para el estudiante.
    no_verificables = [it.descripcion for it in datos.items if not item_verificable(it.descripcion)]
    if no_verificables:
        listado = "; ".join(f"“{d}”" for d in no_verificables)
        raise HTTPException(
            status_code=400,
            detail=(
                f"Estos puntos no son verificables con los comandos del laboratorio: {listado}. "
                f"Reformúlalos usando acciones como: {', '.join(CATEGORIAS_VERIFICABLES)}."
            ),
        )

    # Título opcional: si no se entrega, se genera según tipo y nivel
    NOMBRES_NIVEL_ATAQUE = {1: "Fundamentos", 2: "Reconocimiento", 3: "Enumeración", 4: "Explotación", 5: "Post-explotación", 6: "Avanzado", 7: "Operación completa"}
    NOMBRES_NIVEL_DEFENSA = {1: "Monitoreo básico", 2: "Detección de fuerza bruta", 3: "Reconocimiento entrante", 4: "Investigación de incidentes", 5: "Respuesta activa", 6: "Multi-vector", 7: "SOC integral"}
    titulo = (datos.titulo or "").strip()
    if not titulo:
        nombres = NOMBRES_NIVEL_ATAQUE if datos.tipo == "ataque" else NOMBRES_NIVEL_DEFENSA
        titulo = f"{'Ataque' if datos.tipo == 'ataque' else 'Defensa'} — Nivel {datos.nivel}: {nombres.get(datos.nivel, '')}"

    # Anti-duplicado: si el mismo docente creó un ejercicio idéntico hace
    # menos de 2 minutos (típico reintento del navegador tras un timeout
    # mientras la IA generaba el escenario), se devuelve el existente
    reciente = bd.query(EjercicioDocente).filter(
        EjercicioDocente.creado_por_id == usuario_actual.id,
        EjercicioDocente.descripcion == datos.descripcion,
        EjercicioDocente.tipo == datos.tipo,
        EjercicioDocente.nivel == datos.nivel,
    ).order_by(EjercicioDocente.id.desc()).first()
    if reciente and reciente.fecha_creacion and (datetime.now(timezone.utc) - aware_utc(reciente.fecha_creacion)).total_seconds() < 120:
        return {"mensaje": "Ejercicio creado", "id": reciente.id}

    # Generar escenario/contexto con IA
    contexto_ia = None
    try:
        items_texto = "\n".join(f"- {it.descripcion}" for it in datos.items) if datos.items else "(sin puntos definidos)"
        temas_ataque_ctx = {
            1: "Introducción y fundamentos: conceptos básicos de redes, reconocimiento del entorno, primeros pasos sin experiencia previa.",
            2: "Fuerza bruta y control de acceso: servicios con autenticación débil, acceso no autorizado mediante credenciales.",
            3: "Reconocimiento y escaneo de puertos: descubrimiento de hosts, servicios expuestos, arquitectura de red del objetivo.",
            4: "Inyección SQL: aplicaciones web con parámetros vulnerables, extracción de información de bases de datos.",
            5: "XSS y explotación web: formularios vulnerables, robo de sesiones, análisis de aplicaciones web.",
            6: "Contención y hardening: aplicar mitigaciones tras identificar vulnerabilidades, asegurar servicios.",
            7: "Monitoreo y detección: análisis de logs, correlación de eventos, identificación de patrones de ataque.",
        }
        temas_defensa_ctx = {
            1: "Monitoreo básico SOC: revisión de alertas del IDS, flujo de trabajo del analista, primeras acciones ante incidente.",
            2: "Detección de fuerza bruta: patrones de autenticación fallida, bloqueo de atacantes, análisis de logs de acceso.",
            3: "Reconocimiento entrante: detectar escaneos de red, identificar servicios expuestos, correlacionar eventos de reconocimiento.",
            4: "Investigación de incidentes: recopilar evidencia, trazar línea de tiempo, identificar vector de entrada y alcance.",
            5: "Respuesta activa: contención, aislamiento, aplicación de parches y reglas de firewall en caliente.",
            6: "Multi-vector: ataques combinados (fuerza bruta + escaneo + explotación), priorización defensiva.",
            7: "SOC integral autónomo: gestión completa del incidente, informes técnicos y ejecutivos, sin asistencia.",
        }
        temas_ctx = temas_ataque_ctx if datos.tipo == "ataque" else temas_defensa_ctx
        tema_nivel_ctx = temas_ctx.get(datos.nivel, temas_ctx[1])
        complejidad_ctx = (
            "básica y guiada, pensada para estudiantes que están empezando" if datos.nivel <= 2 else
            "media, el estudiante debe decidir qué hacer sin que se le indique explícitamente" if datos.nivel <= 4 else
            "alta, múltiples vectores, ambigüedad deliberada, requiere criterio técnico propio" if datos.nivel <= 6 else
            "máxima, operación completamente autónoma, sin pistas ni andamiaje"
        )
        prompt_esc = (
            f"Eres un docente universitario de ciberseguridad. Crea el escenario narrativo para un ejercicio práctico del sistema CyberLab.\n\n"
            f"INSTRUCCIÓN CLAVE: Los estudiantes ya conocen los comandos y herramientas del nivel porque los estudiaron en la sección 'Información'. "
            f"Tu tarea es crear un CASO DE ESTUDIO REALISTA que plantee una situación a resolver, NO un tutorial. "
            f"NO incluyas nombres de comandos específicos, flags ni pasos de cómo hacerlo. Sólo el contexto del problema.\n\n"
            f"Tipo: {'Ataque (pentesting)' if datos.tipo == 'ataque' else 'Defensa (SOC/Blue Team)'}\n"
            f"Nivel {datos.nivel} — Tema: {tema_nivel_ctx}\n"
            f"Complejidad del escenario: {complejidad_ctx}\n"
            f"Título: {titulo}\n"
            f"Objetivos del ejercicio:\n{items_texto}\n\n"
            f"Genera un escenario de 3-4 párrafos con: nombre de empresa ficticia, descripción del incidente o situación, "
            f"qué rol juega el estudiante y síntomas observados. "
            f"REGLA CRÍTICA: NO inventes direcciones IP, puertos ni nombres de usuario concretos. "
            f"El laboratorio genera la IP real y el estudiante debe DESCUBRIRLA investigando los logs; "
            f"si mencionas una IP inventada en el texto, contradirá los datos reales y confundirá al estudiante. "
            f"Refiérete al origen como 'una dirección IP sospechosa' o 'el atacante', sin números. "
            f"El escenario debe ser más complejo y ambiguo a mayor nivel. Redacta en español, estilo caso de estudio profesional."
        )
        resp = cliente_openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt_esc}],
            max_tokens=600,
            temperature=0.7,
        )
        contexto_ia = resp.choices[0].message.content.strip()
    except Exception:
        contexto_ia = f"Escenario: {titulo}\n\n{datos.descripcion}"

    ejercicio = EjercicioDocente(
        titulo=titulo,
        descripcion=datos.descripcion,
        instrucciones=datos.instrucciones,
        tipo=datos.tipo,
        nivel=datos.nivel,
        tiempo_minutos=datos.tiempo_minutos,
        contexto_generado=contexto_ia,
        fecha_limite=datos.fecha_limite,
        activo=datos.visible,
        creado_por_id=usuario_actual.id,
    )
    bd.add(ejercicio)
    bd.flush()
    for item in datos.items:
        bd.add(ItemEjercicioDocente(
            ejercicio_id=ejercicio.id,
            descripcion=item.descripcion,
            orden=item.orden,
        ))
    bd.commit()
    bd.refresh(ejercicio)

    return {"mensaje": "Ejercicio creado", "id": ejercicio.id}


@app.get("/ejercicios-docente")
def listar_ejercicios_docente(
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    # Docente y admin ven todos (visibles + ocultos). Estudiante solo los visibles.
    es_panel = usuario_actual.rol in ("docente", "admin")
    query = bd.query(EjercicioDocente)
    if not es_panel:
        query = query.filter(EjercicioDocente.activo == True)
    ejercicios = query.order_by(EjercicioDocente.fecha_creacion.asc()).all()
    resultado = []
    for idx, ej in enumerate(ejercicios, start=1):
        creador = bd.query(Usuario).filter(Usuario.id == ej.creado_por_id).first()
        resultado.append({
            "id": ej.id,
            "numero": idx,
            "titulo": ej.titulo,
            "descripcion": ej.descripcion,
            "instrucciones": ej.instrucciones,
            "tipo": ej.tipo,
            "nivel": ej.nivel,
            "tiempo_minutos": ej.tiempo_minutos,
            "contexto_generado": ej.contexto_generado,
            "activo": ej.activo,
            "fecha_limite": ej.fecha_limite.isoformat() if ej.fecha_limite else None,
            "creado_por": creador.nombre_usuario if creador else "desconocido",
            "fecha_creacion": ej.fecha_creacion.isoformat() if ej.fecha_creacion else None,
            "items": [{"id": it.id, "descripcion": it.descripcion, "orden": it.orden} for it in ej.items],
        })
    return resultado


@app.get("/ejercicios-docente/tipo/{tipo}")
def ejercicios_por_tipo(
    tipo: str,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    ejercicios = bd.query(EjercicioDocente).filter(
        EjercicioDocente.activo == True,
        EjercicioDocente.tipo == tipo,
    ).order_by(EjercicioDocente.fecha_creacion.asc()).all()
    resultado = []
    ahora = datetime.now(timezone.utc)
    for ej in ejercicios:
        creador = bd.query(Usuario).filter(Usuario.id == ej.creado_por_id).first()
        plazo_vencido = bool(ej.fecha_limite and ahora > aware_utc(ej.fecha_limite))
        resultado.append({
            "id": ej.id,
            "titulo": ej.titulo,
            "descripcion": ej.descripcion,
            "instrucciones": ej.instrucciones,
            "tipo": ej.tipo,
            "nivel": ej.nivel,
            "tiempo_minutos": ej.tiempo_minutos,
            "fecha_limite": ej.fecha_limite.isoformat() if ej.fecha_limite else None,
            "plazo_vencido": plazo_vencido,
            "contexto_generado": ej.contexto_generado,
            "activo": ej.activo,
            "creado_por": creador.nombre_usuario if creador else "desconocido",
            "fecha_creacion": ej.fecha_creacion.isoformat() if ej.fecha_creacion else None,
            "items": [{"id": it.id, "descripcion": it.descripcion, "orden": it.orden} for it in ej.items],
        })
    return resultado


@app.post("/ejercicios-docente/validar-items")
def validar_items_ejercicio(
    body: dict,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    """Chequeo en vivo para el formulario del docente: indica qué puntos
    son verificables con los comandos del laboratorio."""
    if usuario_actual.rol not in ("docente", "admin"):
        raise HTTPException(status_code=403, detail="Sin permiso")
    items = body.get("items") or []
    return {
        "items": [{"descripcion": d, "verificable": item_verificable(d)} for d in items],
        "categorias": CATEGORIAS_VERIFICABLES,
    }


@app.post("/ejercicios-docente/ia-asistir")
def ia_asistir_ejercicio(
    datos: SolicitudIaAsistir,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    if usuario_actual.rol not in ("docente", "admin"):
        raise HTTPException(status_code=403, detail="Sin permiso")
    tipo_label = "Ataque (pentesting ofensivo)" if datos.tipo == "ataque" else "Defensa (SOC / Blue Team)"

    # Temas reales de cada nivel según la página de Información del sistema
    temas_ataque = {
        1: "Introducción y fundamentos de ciberseguridad: conceptos básicos de redes, terminología, primeros pasos en un entorno de laboratorio.",
        2: "Fuerza bruta y control de acceso: ataques de diccionario, autenticación débil, identificación de servicios vulnerables a credenciales por defecto.",
        3: "Reconocimiento y escaneo de puertos: descubrimiento de hosts, identificación de puertos abiertos y servicios expuestos en una red.",
        4: "Inyección SQL: detección de parámetros vulnerables, extracción de datos, evasión básica de filtros.",
        5: "XSS (Cross-Site Scripting): inyección de scripts en aplicaciones web, robo de sesiones, análisis de formularios vulnerables.",
        6: "Contención y hardening básico: aplicar medidas de mitigación tras un ataque, configuración de controles de seguridad.",
        7: "Monitoreo, eventos y alertas: análisis de logs, correlación de eventos, detección de actividad maliciosa a través de alertas del sistema.",
    }
    temas_defensa = {
        1: "Monitoreo básico y orientación SOC: revisar alertas del IDS, comprender el flujo de trabajo de un analista, primeras acciones ante un incidente.",
        2: "Detección de fuerza bruta: identificar patrones de intentos fallidos de autenticación, bloqueo de IPs atacantes, análisis de logs de acceso.",
        3: "Reconocimiento y escaneo — defensa: detectar escaneos de red entrantes, identificar qué servicios están expuestos, correlacionar eventos de escaneo.",
        4: "Investigación de incidentes: recopilar evidencia, trazar línea de tiempo del ataque, identificar el vector de entrada y el alcance del compromiso.",
        5: "Respuesta defensiva activa: contener el incidente, aislar sistemas afectados, aplicar parches y reglas de firewall en caliente.",
        6: "Escenarios complejos multi-vector: responder a ataques combinados (fuerza bruta + escaneo + explotación), priorizar acciones defensivas.",
        7: "Defensa integral autónoma: operar un SOC completo sin asistencia, redactar informes técnicos y ejecutivos, gestión completa del incidente.",
    }
    temas = temas_ataque if datos.tipo == "ataque" else temas_defensa
    tema_nivel = temas.get(datos.nivel, temas[1])

    complejidad = (
        "muy guiado, conceptos simples, sin ambigüedad" if datos.nivel <= 2 else
        "dificultad media, el estudiante debe aplicar lo aprendido sin que se le indique exactamente qué hacer" if datos.nivel <= 4 else
        "alta dificultad, múltiples decisiones, escenario realista y ambiguo" if datos.nivel <= 6 else
        "máxima complejidad, end-to-end sin guía, el estudiante opera de forma completamente autónoma"
    )

    prompt = (
        f"Eres un docente universitario experto en ciberseguridad. Crea el contenido para un ejercicio práctico de laboratorio del sistema CyberLab.\n\n"
        f"CONTEXTO IMPORTANTE: Los estudiantes ya han leído toda la teoría del nivel en la sección 'Información', que incluye comandos, herramientas y procedimientos. "
        f"Tu tarea es crear un ESCENARIO REALISTA que los obligue a aplicar ese conocimiento. "
        f"NO debes incluir comandos específicos, instrucciones paso a paso ni nombres de herramientas en el contenido generado. "
        f"El ejercicio debe plantear una SITUACIÓN que el estudiante debe resolver usando lo que aprendió.\n\n"
        f"Título del ejercicio: {datos.titulo or '(sin título — usa el tema del nivel)'}\n"
        f"Tipo: {tipo_label}\n"
        f"Nivel {datos.nivel} — Tema: {tema_nivel}\n"
        f"Complejidad esperada: {complejidad}\n"
        f"Número de puntos/objetivos a evaluar: {datos.num_puntos}\n\n"
        f"Responde EXACTAMENTE en este formato JSON (sin markdown, sin texto extra fuera del JSON):\n"
        f'{{"descripcion":"...","instrucciones":"...","items":["objetivo 1","objetivo 2",...]}}\n\n'
        f"REGLAS ESTRICTAS:\n"
        f"- descripcion: 1-2 oraciones describiendo el ESCENARIO o PROBLEMA a resolver, sin mencionar herramientas ni comandos.\n"
        f"- instrucciones: 2-4 oraciones de CONTEXTO adicional del escenario (qué ocurrió, qué se espera del estudiante), sin revelar cómo hacerlo.\n"
        f"- NO inventes direcciones IP, puertos ni usuarios concretos: el laboratorio genera la IP real y el estudiante debe descubrirla en los logs. Refiérete al origen como 'una IP sospechosa' o 'el atacante'.\n"
        f"- items: exactamente {datos.num_puntos} OBJETIVOS observables que el estudiante debe lograr, redactados como resultados esperados, NO como pasos ni comandos.\n"
        f"- IMPORTANTE: cada item DEBE corresponder a una de estas categorías de acción verificables por el laboratorio "
        f"(usa sus palabras clave en la redacción): {', '.join(CATEGORIAS_VERIFICABLES)}.\n"
        f"Todo en español. El nivel de complejidad del escenario debe reflejar el nivel {datos.nivel} indicado."
    )
    try:
        resp = cliente_openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            temperature=0.7,
        )
        import json as _json
        contenido = resp.choices[0].message.content.strip()
        data = _json.loads(contenido)

        # Red de seguridad: si la IA generó algún item no verificable,
        # se reemplaza por un objetivo válido del tipo correspondiente
        FALLBACK_ITEMS = {
            "ataque": [
                "Escanear los puertos del objetivo con nmap",
                "Enumerar los servicios expuestos del objetivo",
                "Analizar la IP sospechosa identificada",
                "Revisar los intentos fallidos de autenticación",
                "Bloquear la IP atacante con el firewall",
                "Documentar los hallazgos en el reporte técnico",
            ],
            "defensa": [
                "Revisar las alertas del IDS",
                "Consultar los eventos del sistema",
                "Analizar el tráfico de la IP sospechosa",
                "Correlacionar los eventos del incidente",
                "Bloquear la IP atacante con el firewall",
                "Generar el reporte del incidente",
            ],
        }
        items_ia = [str(x) for x in (data.get("items") or [])]
        fallbacks = [f for f in FALLBACK_ITEMS.get(datos.tipo, FALLBACK_ITEMS["defensa"]) if f not in items_ia]
        items_final = []
        for it in items_ia:
            if item_verificable(it):
                items_final.append(it)
            elif fallbacks:
                items_final.append(fallbacks.pop(0))
        return {
            "descripcion": data.get("descripcion", ""),
            "instrucciones": data.get("instrucciones", ""),
            "items": items_final,
        }
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Error al generar con IA: {str(ex)}")


@app.get("/ejercicios-docente/{ejercicio_id}")
def detalle_ejercicio_docente(
    ejercicio_id: int,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    ej = bd.query(EjercicioDocente).filter(EjercicioDocente.id == ejercicio_id).first()
    if not ej:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")
    creador = bd.query(Usuario).filter(Usuario.id == ej.creado_por_id).first()
    return {
        "id": ej.id,
        "titulo": ej.titulo,
        "descripcion": ej.descripcion,
        "instrucciones": ej.instrucciones,
        "activo": ej.activo,
        "creado_por": creador.nombre_usuario if creador else "desconocido",
        "fecha_creacion": ej.fecha_creacion.isoformat() if ej.fecha_creacion else None,
        "items": [{"id": it.id, "descripcion": it.descripcion, "orden": it.orden} for it in ej.items],
    }


@app.patch("/ejercicios-docente/{ejercicio_id}/visibilidad")
def toggle_visibilidad_ejercicio(
    ejercicio_id: int,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    if usuario_actual.rol not in ("docente", "admin"):
        raise HTTPException(status_code=403, detail="Sin permiso")
    ej = bd.query(EjercicioDocente).filter(EjercicioDocente.id == ejercicio_id).first()
    if not ej:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")
    ej.activo = not ej.activo
    bd.commit()
    return {"activo": ej.activo, "mensaje": "Visible" if ej.activo else "Oculto"}


@app.delete("/ejercicios-docente/{ejercicio_id}")
def eliminar_ejercicio_docente(
    ejercicio_id: int,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    if usuario_actual.rol not in ("docente", "admin"):
        raise HTTPException(status_code=403, detail="Sin permiso")
    ej = bd.query(EjercicioDocente).filter(EjercicioDocente.id == ejercicio_id).first()
    if not ej:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")
    bd.delete(ej)
    bd.commit()
    return {"mensaje": "Ejercicio eliminado"}


# ── Sesiones de ejercicio (fuente de verdad en el servidor) ───────

@app.post("/ejercicios-docente/{ejercicio_id}/iniciar")
@limiter.limit("20/minute")
def iniciar_sesion_ejercicio(
    request: Request,
    ejercicio_id: int,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    ej = bd.query(EjercicioDocente).filter(EjercicioDocente.id == ejercicio_id, EjercicioDocente.activo == True).first()
    if not ej:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado o no visible")
    if ej.fecha_limite and datetime.now(timezone.utc) > aware_utc(ej.fecha_limite):
        raise HTTPException(status_code=400, detail="El plazo de este ejercicio ha vencido")
    if not ej.items:
        raise HTTPException(status_code=400, detail="El ejercicio no tiene objetivos definidos")
    entrega = bd.query(EntregaEjercicioDocente).filter(
        EntregaEjercicioDocente.ejercicio_id == ejercicio_id,
        EntregaEjercicioDocente.usuario_id == usuario_actual.id,
    ).first()
    if entrega and not entrega.reintento_habilitado:
        raise HTTPException(status_code=409, detail="Ya entregaste este ejercicio")
    sesion = crear_sesion(bd, usuario_actual.id, ej)
    registrar_accion(bd, f"iniciar-ejercicio {ejercicio_id}", "OK", usuario_id=usuario_actual.id)
    return {"mensaje": "Sesión iniciada", "sesion": sesion_a_dict(bd, sesion)}


@app.get("/ejercicios-docente/sesion/activa")
def consultar_sesion_activa(
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    sesion = obtener_sesion_activa(bd, usuario_actual.id)
    if not sesion:
        return {"sesion": None}
    if not verificar_expiracion(bd, sesion):
        materializar_fases(bd, sesion)
    data = sesion_a_dict(bd, sesion)
    ej = bd.query(EjercicioDocente).filter(EjercicioDocente.id == sesion.ejercicio_id).first()
    if ej:
        data["ejercicio"] = {
            "id": ej.id, "titulo": ej.titulo, "descripcion": ej.descripcion,
            "instrucciones": ej.instrucciones, "tipo": ej.tipo, "nivel": ej.nivel,
            "tiempo_minutos": ej.tiempo_minutos, "contexto_generado": ej.contexto_generado,
            "items": [{"id": it.id, "descripcion": it.descripcion, "orden": it.orden} for it in ej.items],
        }
    return {"sesion": data}


@app.post("/ejercicios-docente/sesion/pista")
@limiter.limit("10/minute")
def pedir_pista_sesion(
    request: Request,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    sesion = obtener_sesion_activa(bd, usuario_actual.id)
    if not sesion:
        raise HTTPException(status_code=404, detail="No hay sesión de ejercicio activa")
    if verificar_expiracion(bd, sesion):
        raise HTTPException(status_code=400, detail="La sesión ya expiró")

    data = sesion_a_dict(bd, sesion)
    pendiente = next((it for it in data["items"] if not it["completado"]), None)
    if not pendiente:
        return {"pista": "Ya completaste todos los pasos del ejercicio.", "ayudas": sesion.ayudas}

    sesion.ayudas += 1
    bd.commit()
    herramientas = comandos_sugeridos_para_item(pendiente["descripcion"])
    contexto_herr = (
        f"El laboratorio valida este paso con herramientas de este tipo: {herramientas}. "
        "Orienta SOLO hacia esas herramientas (sin entregar el comando completo con sus argumentos exactos). "
        if herramientas else ""
    )
    try:
        resp = cliente_openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": (
                "Eres un instructor de ciberseguridad. El estudiante está en un ejercicio práctico "
                f"y debe completar este paso: \"{pendiente['descripcion']}\". "
                + contexto_herr +
                "Dale una pista corta (máximo 2 líneas), sin revelar la solución exacta. "
                "Responde solo la pista, en español."
            )}],
            max_tokens=120, temperature=0.5,
        )
        pista = resp.choices[0].message.content.strip()
    except Exception:
        pista = (
            f"Este paso se resuelve con herramientas como: {herramientas}."
            if herramientas else
            "Analiza el contexto del ejercicio y piensa qué herramienta corresponde a este paso."
        )
    # El texto y el momento quedan registrados para el detalle del docente
    registrar_pista(bd, sesion, pista)
    return {"pista": pista, "ayudas": sesion.ayudas}


@app.post("/ejercicios-docente/{ejercicio_id}/entregar")
def entregar_ejercicio_docente(
    ejercicio_id: int,
    datos: SolicitudEntregarEjercicio,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    """La entrega se deriva SIEMPRE de la sesión registrada en el servidor.
    El cliente no puede declarar progreso, tiempo ni ayudas."""
    ej = bd.query(EjercicioDocente).filter(EjercicioDocente.id == ejercicio_id, EjercicioDocente.activo == True).first()
    if not ej:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado o no visible")
    sesion = bd.query(SesionEjercicio).filter(
        SesionEjercicio.usuario_id == usuario_actual.id,
        SesionEjercicio.ejercicio_id == ejercicio_id,
    ).order_by(SesionEjercicio.id.desc()).first()
    if not sesion:
        raise HTTPException(status_code=409, detail="Debes iniciar el ejercicio antes de entregar")
    if sesion.estado == "activa":
        finalizar_sesion(bd, sesion, "completada" if sesion_a_dict(bd, sesion)["porcentaje"] == 100 else "expirada")
    entrega = bd.query(EntregaEjercicioDocente).filter(
        EntregaEjercicioDocente.ejercicio_id == ejercicio_id,
        EntregaEjercicioDocente.usuario_id == usuario_actual.id,
    ).first()
    if not entrega:
        raise HTTPException(status_code=500, detail="No se pudo registrar la entrega")
    return {"mensaje": "Ejercicio entregado", "id": entrega.id}


@app.get("/ejercicios-docente/{ejercicio_id}/entregas")
def listar_entregas_ejercicio(
    ejercicio_id: int,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    if usuario_actual.rol not in ("docente", "admin"):
        raise HTTPException(status_code=403, detail="Sin permiso")
    finalizar_sesiones_vencidas(bd)
    ej = bd.query(EjercicioDocente).filter(EjercicioDocente.id == ejercicio_id).first()
    entregas = bd.query(EntregaEjercicioDocente).filter(EntregaEjercicioDocente.ejercicio_id == ejercicio_id).all()
    resultado = []
    for en in entregas:
        u = bd.query(Usuario).filter(Usuario.id == en.usuario_id).first()
        resultado.append({
            "id": en.id,
            "ejercicio_id": en.ejercicio_id,
            "usuario": u.nombre_usuario if u else "desconocido",
            "respuesta": en.respuesta,
            "estado": en.estado,
            "nota": en.nota,
            "comentarios_docente": en.comentarios_docente,
            "ayudas_pedidas": en.ayudas_pedidas or 0,
            "reintento_habilitado": bool(en.reintento_habilitado),
            "fecha_entrega": en.fecha_entrega.isoformat() if en.fecha_entrega else None,
            # Resumen estructurado: cierre, porcentajes, tiempo, fases e items,
            # para la vista de entregas del docente (sin re-parsear texto)
            "resumen": _resumen_entrega(en),
            "tiene_detalle": bool(en.detalle),
        })
    # Una vez vencido el plazo, los estudiantes que nunca rindieron aparecen
    # como "No entregado" (filas calculadas al vuelo, no se guardan en la BD).
    if ej and ej.fecha_limite and datetime.now(timezone.utc) > aware_utc(ej.fecha_limite):
        entregaron = {en.usuario_id for en in entregas}
        q_faltantes = bd.query(Usuario).filter(Usuario.rol == "estudiante")
        if entregaron:
            q_faltantes = q_faltantes.filter(Usuario.id.notin_(entregaron))
        faltantes = q_faltantes.all()
        for u in faltantes:
            resultado.append({
                "id": None,
                "ejercicio_id": ejercicio_id,
                "usuario": u.nombre_usuario,
                "respuesta": None,
                "estado": "no_entregado",
                "nota": None,
                "comentarios_docente": None,
                "ayudas_pedidas": 0,
                "reintento_habilitado": False,
                "fecha_entrega": None,
                "resumen": None,
                "tiene_detalle": False,
            })
    return resultado


@app.get("/ejercicios-docente/entregas/{entrega_id}/detalle")
def detalle_entrega_ejercicio(
    entrega_id: int,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    """Detalle completo de una entrega para el modal de evaluación del
    docente: checklist con comando/minuto, línea de tiempo de comandos,
    pistas recibidas, fases del ataque e informe del estudiante."""
    if usuario_actual.rol not in ("docente", "admin"):
        raise HTTPException(status_code=403, detail="Sin permiso")
    en = bd.query(EntregaEjercicioDocente).filter(EntregaEjercicioDocente.id == entrega_id).first()
    if not en:
        raise HTTPException(status_code=404, detail="Entrega no encontrada")
    u = bd.query(Usuario).filter(Usuario.id == en.usuario_id).first()
    ej = bd.query(EjercicioDocente).filter(EjercicioDocente.id == en.ejercicio_id).first()
    return {
        "id": en.id,
        "usuario": u.nombre_usuario if u else "desconocido",
        "estado": en.estado,
        "nota": en.nota,
        "comentarios_docente": en.comentarios_docente,
        "ayudas_pedidas": en.ayudas_pedidas or 0,
        "respuesta": en.respuesta,
        "reintento_habilitado": bool(en.reintento_habilitado),
        "fecha_entrega": en.fecha_entrega.isoformat() if en.fecha_entrega else None,
        "fecha_evaluacion": en.fecha_evaluacion.isoformat() if en.fecha_evaluacion else None,
        "ejercicio": {
            "id": ej.id, "titulo": ej.titulo, "tipo": ej.tipo,
            "nivel": ej.nivel, "tiempo_minutos": ej.tiempo_minutos,
        } if ej else None,
        "resumen": _resumen_entrega(en),
        "detalle": _detalle_entrega(en),
    }


def _feedback_por_reglas(tipo: str, logrados: list, faltan: list, n_pistas: int, pct, cierre: str) -> str:
    """Orientación de respaldo cuando la IA no está disponible: se arma solo
    con el checklist registrado, sin inventar nada."""
    total = len(logrados) + len(faltan)
    partes = [f"Completaste {len(logrados)} de {total} objetivos del ejercicio."]
    if faltan:
        partes.append("Te faltó: " + "; ".join(faltan[:4]) + ".")
    if n_pistas:
        partes.append(f"Pediste {n_pistas} pista(s) (−{min(n_pistas*5,30)}%); intenta apoyarte primero en la teoría del nivel.")
    partes.append("Repasa los pasos pendientes en la sección Información.")
    return " ".join(partes)


def _generar_feedback(ejercicio: EjercicioDocente, det: dict) -> dict:
    """Orientación de cierre para el ESTUDIANTE (no es la nota). Intenta IA y
    cae a un resumen por reglas si no hay servicio."""
    items = det.get("items", []) or []
    logrados = [i.get("descripcion") for i in items if i.get("completado")]
    faltan = [i.get("descripcion") for i in items if not i.get("completado")]
    n_pistas = len(det.get("pistas", []) or [])
    pct = det.get("porcentaje_final")
    cierre = det.get("cierre")
    tipo = ejercicio.tipo if ejercicio else "defensa"
    rol = "pentester (rol ofensivo)" if tipo == "ataque" else "analista de defensa (SOC)"
    try:
        prompt = (
            f"Eres un instructor de ciberseguridad. Un estudiante en rol de {rol} terminó un ejercicio práctico.\n"
            f"Objetivos LOGRADOS: {logrados or 'ninguno'}.\n"
            f"Objetivos NO logrados: {faltan or 'ninguno'}.\n"
            f"Pistas pedidas: {n_pistas}. Resultado: {pct}%.\n"
            "Dale retroalimentación breve (máximo 4 líneas), en segunda persona, motivadora pero honesta: "
            "destaca qué hizo bien y señala concretamente qué mejorar (menciona herramientas o comandos si aplica). "
            "No inventes datos que no estén arriba. NO le asignes una nota. Responde solo el texto, en español."
        )
        r = cliente_openai.chat.completions.create(
            model="gpt-4o-mini", messages=[{"role": "user", "content": prompt}],
            max_tokens=220, temperature=0.5,
        )
        return {"texto": r.choices[0].message.content.strip(), "fuente": "ia"}
    except Exception:
        return {"texto": _feedback_por_reglas(tipo, logrados, faltan, n_pistas, pct, cierre), "fuente": "reglas"}


@app.get("/ejercicios-docente/{ejercicio_id}/mi-feedback")
def mi_feedback_entrega(
    ejercicio_id: int,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    """Orientación automática de cierre para el propio estudiante. Se genera
    una vez (IA o reglas) y se cachea en la entrega; no es la calificación."""
    en = bd.query(EntregaEjercicioDocente).filter(
        EntregaEjercicioDocente.ejercicio_id == ejercicio_id,
        EntregaEjercicioDocente.usuario_id == usuario_actual.id,
    ).first()
    if not en:
        raise HTTPException(status_code=404, detail="Aún no tienes una entrega de este ejercicio")
    det = _detalle_entrega(en) or {}
    if isinstance(det.get("feedback"), dict) and det["feedback"].get("texto"):
        return det["feedback"]  # cacheado
    ej = bd.query(EjercicioDocente).filter(EjercicioDocente.id == ejercicio_id).first()
    fb = _generar_feedback(ej, det)
    det["feedback"] = fb
    en.detalle = json.dumps(det, ensure_ascii=False)
    bd.commit()
    return fb


@app.get("/docente/estudiante/{nombre_usuario}/entregas")
def listar_entregas_estudiante(
    nombre_usuario: str,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    if usuario_actual.rol not in ("docente", "admin"):
        raise HTTPException(status_code=403, detail="Sin permiso")
    u = bd.query(Usuario).filter(Usuario.nombre_usuario == nombre_usuario).first()
    if not u:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    # Mapa de id → número correlativo (ordenado por fecha de creación)
    todos_ejs = bd.query(EjercicioDocente).filter(EjercicioDocente.activo == True).order_by(EjercicioDocente.fecha_creacion.asc()).all()
    numero_por_id = {ej.id: idx for idx, ej in enumerate(todos_ejs, start=1)}

    entregas = bd.query(EntregaEjercicioDocente).filter(EntregaEjercicioDocente.usuario_id == u.id).all()
    resultado = []
    for en in entregas:
        ej = bd.query(EjercicioDocente).filter(EjercicioDocente.id == en.ejercicio_id).first()
        resultado.append({
            "id": en.id,
            "ejercicio_id": en.ejercicio_id,
            "numero_ejercicio": numero_por_id.get(en.ejercicio_id),
            "titulo_ejercicio": ej.titulo if ej else None,
            "descripcion_ejercicio": ej.descripcion if ej else None,
            "nivel": ej.nivel if ej else 1,
            "tipo": ej.tipo if ej else None,
            "respuesta": en.respuesta,
            "estado": en.estado,
            "nota": en.nota,
            "comentarios_docente": en.comentarios_docente,
            "ayudas_pedidas": en.ayudas_pedidas or 0,
            "reintento_habilitado": bool(en.reintento_habilitado),
            "fecha_entrega": en.fecha_entrega.isoformat() if en.fecha_entrega else None,
            # Resumen estructurado para la vista de perfil del docente
            "resumen": _resumen_entrega(en),
            "tiene_detalle": bool(en.detalle),
        })
    return resultado


@app.get("/ejercicios-docente/mis-entregas/todas")
def mis_entregas(
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    entregas = bd.query(EntregaEjercicioDocente).filter(
        EntregaEjercicioDocente.usuario_id == usuario_actual.id
    ).order_by(EntregaEjercicioDocente.fecha_entrega.desc()).all()
    resultado = []
    for en in entregas:
        ej = bd.query(EjercicioDocente).filter(EjercicioDocente.id == en.ejercicio_id).first()
        det = _detalle_entrega(en) or {}
        fb = det.get("feedback") if isinstance(det.get("feedback"), dict) else None
        resultado.append({
            "id": en.id,
            "ejercicio_id": en.ejercicio_id,
            "titulo": ej.titulo if ej else f"Ejercicio #{en.ejercicio_id}",
            "tipo": ej.tipo if ej else "ataque",
            "nivel": ej.nivel if ej else 1,
            "estado": en.estado,
            "nota": en.nota,
            "comentarios_docente": en.comentarios_docente,
            "respuesta": en.respuesta,
            "ayudas_pedidas": en.ayudas_pedidas or 0,
            # Orientación automática de cierre (si ya se generó); para releerla
            "feedback": fb.get("texto") if fb else None,
            "fecha_entrega": en.fecha_entrega.isoformat() if en.fecha_entrega else None,
            "fecha_evaluacion": en.fecha_evaluacion.isoformat() if en.fecha_evaluacion else None,
        })
    return resultado


@app.post("/ejercicios-docente/entregas/{entrega_id}/evaluar")
def evaluar_entrega_ejercicio(
    entrega_id: int,
    datos: SolicitudEvaluarEntrega,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    if usuario_actual.rol not in ("docente", "admin"):
        raise HTTPException(status_code=403, detail="Sin permiso")
    if datos.nota < 1.0 or datos.nota > 7.0:
        raise HTTPException(status_code=400, detail="Nota debe estar entre 1.0 y 7.0")
    entrega = bd.query(EntregaEjercicioDocente).filter(EntregaEjercicioDocente.id == entrega_id).first()
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega no encontrada")
    from datetime import datetime, timezone
    entrega.nota = datos.nota
    entrega.comentarios_docente = datos.comentarios
    entrega.estado = "evaluado"
    entrega.reintento_habilitado = False  # evaluar cancela un reintento pendiente
    entrega.fecha_evaluacion = datetime.now(timezone.utc)
    bd.commit()

    return {"mensaje": "Entrega evaluada"}


@app.post("/ejercicios-docente/entregas/{entrega_id}/reabrir")
def reabrir_entrega_ejercicio(
    entrega_id: int,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    """El docente habilita un nuevo intento: el estudiante puede volver a
    rendir el ejercicio y su nueva entrega reemplazará a esta (la nota actual
    se conserva hasta que vuelva a rendir)."""
    if usuario_actual.rol not in ("docente", "admin"):
        raise HTTPException(status_code=403, detail="Sin permiso")
    entrega = bd.query(EntregaEjercicioDocente).filter(EntregaEjercicioDocente.id == entrega_id).first()
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega no encontrada")
    entrega.reintento_habilitado = True
    bd.commit()
    return {"mensaje": "Nuevo intento habilitado para el estudiante"}