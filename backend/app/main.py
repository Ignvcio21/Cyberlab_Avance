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
import os
import random

from dotenv import load_dotenv
from openai import OpenAI

from .database import SesionLocal, engine, Base
from .models import (
    Usuario, Evento, Alerta, IpBloqueada, AccionUsuario,
    Curso, Capitulo, Leccion, Ejercicio, ProgresoUsuario,
    IntentoEjercicio, EvaluacionDocente,
    PlantillaEscenario, VariablePlantilla, EscenarioInstancia, VariableInstancia,
    EscenarioActivoUsuario, BloqueoEscenario,
    EjercicioDocente, ItemEjercicioDocente, EntregaEjercicioDocente,
)
from .schemas import (
    SolicitudInicioSesion, SolicitudRegistroEstudiante, SolicitudFeedbackIA,
    SolicitudCrearUsuario,
    SolicitudCrearCurso, SolicitudCrearCapitulo, SolicitudCrearLeccion, SolicitudCrearEjercicio,
    SolicitudActualizarProgreso,
    SolicitudCrearIntento, SolicitudEvaluarIntento,
    SolicitudCrearEscenario, EscenarioInstanciaSalida, VariableInstanciaSalida,
    SolicitudSimular,
    EstructuraSalida, RespuestaUsuario,
    SolicitudTerminal, RespuestaTerminal,
    SolicitudTerminalDefensa,
    SolicitudCambiarRol, SolicitudEliminarUsuario,
    SolicitudCrearEjercicioDocente, EjercicioDocenteSalida,
    SolicitudEntregarEjercicio, SolicitudEvaluarEntrega, EntregaSalida,
    SolicitudIaAsistir,
    SolicitudRecuperarContrasena, SolicitudResetContrasena,
)
from .email_utils import (
    correo_nuevo_ejercicio, correo_nota_asignada, correo_recuperar_contrasena,
)
from .auth import (
    hashear_contrasena, verificar_contrasena,
    crear_token, obtener_usuario_actual,
    solo_admin, solo_docente, cualquier_rol,
    obtener_bd,
)

load_dotenv()
cliente_openai = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
Base.metadata.create_all(bind=engine)

# ── Rate limiter ──────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

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
    allow_methods=["GET", "POST", "PUT", "DELETE"],
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


def obtener_instancia_activa_usuario(bd: Session, usuario_id: int):
    rel = bd.query(EscenarioActivoUsuario).filter(
        EscenarioActivoUsuario.usuario_id == usuario_id
    ).first()
    if not rel:
        return None, None
    inst = bd.query(EscenarioInstancia).filter(EscenarioInstancia.id == rel.instancia_id).first()
    return rel, inst


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
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300, temperature=0.7
        )
        texto = resp.choices[0].message.content.strip()
        return texto if texto else narrativa_base
    except Exception as e:
        print(f"[IA] Narrativa no enriquecida: {e}")
        return narrativa_base


def crear_nuevo_escenario(bd: Session, usuario: Usuario, ejercicio_id: int, plantillas_data: list):
    rel, inst_anterior = obtener_instancia_activa_usuario(bd, usuario.id)
    if inst_anterior and inst_anterior.estado == "activo":
        inst_anterior.estado = "cerrado"
        bd.commit()

    pd = random.choice(plantillas_data)
    plantilla = bd.query(PlantillaEscenario).filter(PlantillaEscenario.nombre == pd["nombre"]).first()
    if not plantilla:
        raise HTTPException(status_code=500, detail=f"Plantilla no encontrada: {pd['nombre']}")

    defs = bd.query(VariablePlantilla).filter(VariablePlantilla.plantilla_id == plantilla.id).all()
    vars_val = {}
    regla_fn = {
        "ip_privada": _ip, "usuario_comun": _usuario,
        "servicio_comun": _servicio, "puertos_comunes": _puertos, "empresa": _empresa,
    }
    for v in defs:
        fn = regla_fn.get(v.regla)
        vars_val[v.clave] = fn() if fn else "N/D"

    narrativa_base  = _render(pd["narrativa"], vars_val)
    narrativa_final = _enriquecer_ia(narrativa_base, vars_val, plantilla.tipo)

    inst = EscenarioInstancia(
        plantilla_id=plantilla.id, ejercicio_id=ejercicio_id,
        usuario_id=usuario.id,
        titulo_caso=f"Caso activo: {pd['nombre']}",
        texto_caso=narrativa_final, estado="activo"
    )
    bd.add(inst); bd.commit(); bd.refresh(inst)
    bd.add_all([VariableInstancia(instancia_id=inst.id, clave=k, valor=str(v)) for k, v in vars_val.items()])
    bd.commit()

    if rel:
        rel.instancia_id = inst.id; bd.commit()
    else:
        bd.add(EscenarioActivoUsuario(usuario_id=usuario.id, instancia_id=inst.id)); bd.commit()

    return inst, vars_val


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

    # ── Ejercicios ataque ──
    cap1 = bd.query(Capitulo).filter(Capitulo.curso_id == curso_ataque.id, Capitulo.orden == 1).first()
    lec1 = bd.query(Leccion).filter(Leccion.capitulo_id == cap1.id).order_by(Leccion.orden.desc()).first()
    for i in range(1, 6):
        bd.add(Ejercicio(leccion_id=lec1.id, descripcion=f"Práctica Fuerza Bruta #{i}: análisis y contención (variante {i})", tipo="ataque", comandos_objetivo=10, tiempo_limite_seg=300))
    bd.commit()

    cap2 = bd.query(Capitulo).filter(Capitulo.curso_id == curso_ataque.id, Capitulo.orden == 2).first()
    lec2 = bd.query(Leccion).filter(Leccion.capitulo_id == cap2.id).order_by(Leccion.orden.desc()).first()
    for i in range(1, 6):
        bd.add(Ejercicio(leccion_id=lec2.id, descripcion=f"Práctica Escaneo de Puertos #{i}: detección y respuesta (variante {i})", tipo="defensa", comandos_objetivo=10, tiempo_limite_seg=300))
    bd.commit()

    # ── Ejercicios defensa ──
    for orden_cap in range(1, 8):
        cap_def = bd.query(Capitulo).filter(Capitulo.curso_id == curso_defensa.id, Capitulo.orden == orden_cap).first()
        lec_def = bd.query(Leccion).filter(Leccion.capitulo_id == cap_def.id).order_by(Leccion.orden.desc()).first()
        for i in range(1, 6):
            bd.add(Ejercicio(
                leccion_id=lec_def.id,
                descripcion=f"Defensa Nivel {orden_cap} — Ejercicio {i}: análisis SOC y respuesta",
                tipo="defensa_soc",
                comandos_objetivo=8,
                tiempo_limite_seg=360
            ))
        bd.commit()


def seed_plantillas(bd: Session):
    if bd.query(PlantillaEscenario).count() > 0:
        return

    ejs_fb = bd.query(Ejercicio).filter(Ejercicio.tipo == "ataque").limit(1).first()
    ejs_ep = bd.query(Ejercicio).filter(Ejercicio.tipo == "defensa").limit(1).first()
    id_fb = ejs_fb.id if ejs_fb else 1
    id_ep = ejs_ep.id if ejs_ep else 2

    for pd in PLANTILLAS_FB:
        plant = PlantillaEscenario(ejercicio_id=id_fb, nombre=pd["nombre"], tipo="fuerza_bruta", narrativa_base=pd["narrativa"], activo=True)
        bd.add(plant); bd.commit(); bd.refresh(plant)
        bd.add_all([
            VariablePlantilla(plantilla_id=plant.id, clave="ip_atacante",      descripcion="IP origen",       regla="ip_privada"),
            VariablePlantilla(plantilla_id=plant.id, clave="usuario_objetivo", descripcion="Cuenta objetivo", regla="usuario_comun"),
            VariablePlantilla(plantilla_id=plant.id, clave="servicio",         descripcion="Servicio atacado",regla="servicio_comun"),
            VariablePlantilla(plantilla_id=plant.id, clave="empresa",          descripcion="Empresa ficticia",regla="empresa"),
        ]); bd.commit()

    for pd in PLANTILLAS_EP:
        plant = PlantillaEscenario(ejercicio_id=id_ep, nombre=pd["nombre"], tipo="escaneo_puertos", narrativa_base=pd["narrativa"], activo=True)
        bd.add(plant); bd.commit(); bd.refresh(plant)
        bd.add_all([
            VariablePlantilla(plantilla_id=plant.id, clave="ip_atacante", descripcion="IP origen",         regla="ip_privada"),
            VariablePlantilla(plantilla_id=plant.id, clave="puertos",     descripcion="Puertos escaneados", regla="puertos_comunes"),
            VariablePlantilla(plantilla_id=plant.id, clave="empresa",     descripcion="Empresa ficticia",   regla="empresa"),
        ]); bd.commit()


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

    bd = SesionLocal()
    admin = bd.query(Usuario).filter(Usuario.nombre_usuario == "admin").first()
    if not admin:
        bd.add(Usuario(
            nombre_usuario="admin",
            nombre="Administrador",
            correo="admin@gmail.com",
            contrasena=hashear_contrasena("admin123"),
            rol="admin"
        ))
        bd.commit()
    else:
        if admin.rol != "admin":
            admin.rol = "admin"
        if not admin.correo:
            admin.correo = "admin@gmail.com"
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
    seed_plantillas(bd)
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
    return {"status": "ok"}


# ── Auth ──────────────────────────────────────────────────────────

@app.post("/iniciar-sesion")
@limiter.limit("10/minute")
def iniciar_sesion(request: Request, datos: SolicitudInicioSesion, bd: Session = Depends(obtener_bd)):
    u = bd.query(Usuario).filter(Usuario.correo == datos.correo).first()
    if not u or not verificar_contrasena(datos.contrasena, u.contrasena):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
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
def admin_listar_usuarios(usuario_actual: Usuario = Depends(solo_admin), bd: Session = Depends(obtener_bd)):
    return bd.query(Usuario).order_by(Usuario.id.asc()).all()


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
    if datos.nombre_usuario == "admin":
        raise HTTPException(status_code=400, detail="No se puede eliminar al administrador principal")
    if datos.nombre_usuario == usuario_actual.nombre_usuario:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")

    u = obtener_usuario_por_nombre(bd, datos.nombre_usuario)
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    uid = u.id

    # 1. Nullificar FKs opcionales que apuntan al usuario
    bd.query(AccionUsuario).filter(AccionUsuario.usuario_id == uid).update({"usuario_id": None})
    bd.query(Curso).filter(Curso.creado_por_usuario_id == uid).update({"creado_por_usuario_id": None})

    # 2. Eliminar evaluaciones donde este usuario es docente
    bd.query(EvaluacionDocente).filter(EvaluacionDocente.docente_id == uid).delete()

    # 3. Eliminar evaluaciones ligadas a sus intentos
    for it in bd.query(IntentoEjercicio).filter(IntentoEjercicio.usuario_id == uid).all():
        bd.query(EvaluacionDocente).filter(EvaluacionDocente.intento_id == it.id).delete()

    # 4. Eliminar intentos
    bd.query(IntentoEjercicio).filter(IntentoEjercicio.usuario_id == uid).delete()

    # 5. Eliminar progreso de lecciones
    bd.query(ProgresoUsuario).filter(ProgresoUsuario.usuario_id == uid).delete()

    # 6. Eliminar escenario activo
    bd.query(EscenarioActivoUsuario).filter(EscenarioActivoUsuario.usuario_id == uid).delete()

    # 7. Eliminar variables de instancias y luego instancias
    for inst in bd.query(EscenarioInstancia).filter(EscenarioInstancia.usuario_id == uid).all():
        bd.query(VariableInstancia).filter(VariableInstancia.instancia_id == inst.id).delete()
    bd.query(EscenarioInstancia).filter(EscenarioInstancia.usuario_id == uid).delete()

    # 8. Eliminar entregas de ejercicios docente
    bd.query(EntregaEjercicioDocente).filter(EntregaEjercicioDocente.usuario_id == uid).delete()

    # 9. Eliminar el usuario
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


@app.post("/admin/ejercicio")
def admin_crear_ejercicio(datos: SolicitudCrearEjercicio, usuario_actual: Usuario = Depends(solo_docente), bd: Session = Depends(obtener_bd)):
    if not bd.query(Leccion).filter(Leccion.id == datos.leccion_id).first():
        raise HTTPException(status_code=404, detail="Lección no encontrada")
    ej = Ejercicio(leccion_id=datos.leccion_id, descripcion=datos.descripcion, tipo=datos.tipo, comandos_objetivo=datos.comandos_objetivo, tiempo_limite_seg=datos.tiempo_limite_seg)
    bd.add(ej); bd.commit(); bd.refresh(ej)
    return {"mensaje": "Ejercicio creado", "ejercicio_id": ej.id}


# ── Estructura y progreso ─────────────────────────────────────────

@app.get("/contenido/estructura", response_model=EstructuraSalida)
def obtener_estructura(bd: Session = Depends(obtener_bd)):
    cursos = bd.query(Curso).order_by(Curso.id.asc()).all()
    salida = []
    for c in cursos:
        caps = []
        for cap in bd.query(Capitulo).filter(Capitulo.curso_id == c.id).order_by(Capitulo.orden.asc()).all():
            lecs = []
            for lec in bd.query(Leccion).filter(Leccion.capitulo_id == cap.id).order_by(Leccion.orden.asc()).all():
                ejs = bd.query(Ejercicio).filter(Ejercicio.leccion_id == lec.id).order_by(Ejercicio.id.asc()).all()
                lecs.append({"id": lec.id, "titulo": lec.titulo, "tipo": lec.tipo, "orden": lec.orden, "ruta_contenido": lec.ruta_contenido,
                             "ejercicios": [{"id": e.id, "descripcion": e.descripcion, "tipo": e.tipo, "comandos_objetivo": e.comandos_objetivo, "tiempo_limite_seg": e.tiempo_limite_seg} for e in ejs]})
            caps.append({"id": cap.id, "titulo": cap.titulo, "orden": cap.orden, "lecciones": lecs})
        salida.append({"id": c.id, "titulo": c.titulo, "descripcion": c.descripcion, "nivel": c.nivel, "activo": c.activo, "capitulos": caps})
    return {"cursos": salida}


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

    TOTAL_EJ = 5
    conteo = {n: 0 for n in range(1, 8)}

    # Contar entregas de ejercicios docente por nivel, filtrado por tipo si se indica
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

    niveles_completados = [n for n, c in conteo.items() if c >= TOTAL_EJ]
    return {
        "nombre_usuario": u.nombre_usuario,
        "niveles_completados": niveles_completados,
        "detalle": {str(n): {"completados": min(conteo[n], TOTAL_EJ), "total": TOTAL_EJ, "completo": conteo[n] >= TOTAL_EJ} for n in range(1, 8)}
    }


# ── Intentos ──────────────────────────────────────────────────────

@app.post("/intentos/crear")
def crear_intento(datos: SolicitudCrearIntento, usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    ej = bd.query(Ejercicio).filter(Ejercicio.id == datos.ejercicio_id).first()
    if not ej: raise HTTPException(status_code=404, detail="Ejercicio no encontrado")
    ayudas = bd.query(AccionUsuario).filter(AccionUsuario.usuario_id == usuario_actual.id, AccionUsuario.comando == "pedir-ayuda").count()
    intento = IntentoEjercicio(usuario_id=usuario_actual.id, ejercicio_id=datos.ejercicio_id, tiempo_seg=int(datos.tiempo_seg), errores=int(datos.errores) + ayudas, porcentaje=int(datos.porcentaje), estado=datos.estado)
    bd.add(intento); bd.commit(); bd.refresh(intento)
    return {"mensaje": "Intento registrado", "intento_id": intento.id, "ayudas_pedidas": ayudas}


@app.get("/docente/intentos")
def docente_listar_intentos(usuario_actual: Usuario = Depends(solo_docente), bd: Session = Depends(obtener_bd)):
    intentos = bd.query(IntentoEjercicio).order_by(IntentoEjercicio.id.desc()).limit(200).all()
    salida = []
    for it in intentos:
        u  = bd.query(Usuario).filter(Usuario.id == it.usuario_id).first()
        ej = bd.query(Ejercicio).filter(Ejercicio.id == it.ejercicio_id).first()
        from datetime import datetime, timezone
        fecha_fin_ref = it.fecha_fin or datetime.now(timezone.utc)
        ayudas = bd.query(AccionUsuario).filter(AccionUsuario.usuario_id == it.usuario_id, AccionUsuario.comando == "pedir-ayuda", AccionUsuario.fecha_creacion >= it.fecha_inicio, AccionUsuario.fecha_creacion <= fecha_fin_ref).count()
        salida.append({
            "intento_id": it.id, "usuario": u.nombre_usuario if u else None,
            "ejercicio_id": it.ejercicio_id, "estado": it.estado,
            "porcentaje": it.porcentaje, "tiempo_seg": it.tiempo_seg,
            "errores": it.errores, "ayudas_pedidas": ayudas,
            "tiene_evaluacion": it.evaluacion is not None,
            "nota": it.evaluacion.nota if it.evaluacion else None,
            "comentarios": it.evaluacion.comentarios if it.evaluacion else None,
            "descripcion_ejercicio": ej.descripcion if ej else None,
            "fecha_inicio": it.fecha_inicio.isoformat() if it.fecha_inicio else None,
            "fecha_fin": it.fecha_fin.isoformat() if it.fecha_fin else None,
        })
    return {"intentos": salida}


@app.get("/mis-entregas-docente")
def mis_entregas_docente(usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    entregas = bd.query(EntregaEjercicioDocente).filter(EntregaEjercicioDocente.usuario_id == usuario_actual.id).all()
    return {"ejercicio_ids": [e.ejercicio_id for e in entregas]}


@app.get("/mis-evaluaciones")
def mis_evaluaciones(usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    intentos = bd.query(IntentoEjercicio).filter(IntentoEjercicio.usuario_id == usuario_actual.id).order_by(IntentoEjercicio.id.desc()).all()
    salida = []
    for it in intentos:
        ej = bd.query(Ejercicio).filter(Ejercicio.id == it.ejercicio_id).first()
        from datetime import datetime, timezone
        fecha_fin_ref = it.fecha_fin or datetime.now(timezone.utc)
        ayudas = bd.query(AccionUsuario).filter(AccionUsuario.usuario_id == it.usuario_id, AccionUsuario.comando == "pedir-ayuda", AccionUsuario.fecha_creacion >= it.fecha_inicio, AccionUsuario.fecha_creacion <= fecha_fin_ref).count()
        eval_data = None
        if it.evaluacion:
            eval_data = {"nota": it.evaluacion.nota, "comentarios": it.evaluacion.comentarios, "fecha": it.evaluacion.fecha.isoformat() if it.evaluacion.fecha else None}
        salida.append({"intento_id": it.id, "ejercicio_id": it.ejercicio_id, "descripcion_ejercicio": ej.descripcion if ej else None, "estado": it.estado, "porcentaje": it.porcentaje, "tiempo_seg": it.tiempo_seg, "errores": it.errores, "ayudas_pedidas": ayudas, "fecha_inicio": it.fecha_inicio.isoformat() if it.fecha_inicio else None, "evaluacion": eval_data})
    return {"intentos": salida}


@app.post("/docente/evaluar")
def docente_evaluar_intento(datos: SolicitudEvaluarIntento, usuario_actual: Usuario = Depends(solo_docente), bd: Session = Depends(obtener_bd)):
    intento = bd.query(IntentoEjercicio).filter(IntentoEjercicio.id == datos.intento_id).first()
    if not intento: raise HTTPException(status_code=404, detail="Intento no encontrado")
    existente = bd.query(EvaluacionDocente).filter(EvaluacionDocente.intento_id == intento.id).first()
    if existente:
        existente.nota = float(datos.nota); existente.comentarios = datos.comentarios; bd.commit()
        return {"mensaje": "Evaluación actualizada"}
    bd.add(EvaluacionDocente(intento_id=intento.id, docente_id=usuario_actual.id, nota=float(datos.nota), comentarios=datos.comentarios))
    bd.commit()
    return {"mensaje": "Evaluación creada"}


# ── Simulaciones ──────────────────────────────────────────────────

@app.post("/simular/fuerza-bruta")
@limiter.limit("30/minute")
def simular_fuerza_bruta(request: Request, body: SolicitudSimular, usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    ejercicios = bd.query(Ejercicio).filter(Ejercicio.tipo == "ataque").all()
    if not ejercicios: raise HTTPException(status_code=500, detail="Sin ejercicios de tipo ataque")
    ejercicio = random.choice(ejercicios)
    inst, vars_val = crear_nuevo_escenario(bd, usuario_actual, ejercicio.id, PLANTILLAS_FB)
    ip = vars_val.get("ip_atacante", "192.168.1.100")
    servicio = vars_val.get("servicio", "ssh")
    usuario_objetivo = vars_val.get("usuario_objetivo", "admin")
    for i in range(1, 11):
        bd.add(Evento(tipo_evento="Fuerza Bruta", ip_origen=ip, descripcion=f"Intento fallido #{i} en {servicio} contra cuenta '{usuario_objetivo}'"))
    bd.commit()
    total = bd.query(Evento).filter(Evento.ip_origen == ip, Evento.tipo_evento == "Fuerza Bruta").count()
    if total >= 5:
        bd.add(Alerta(titulo="Ataque de fuerza bruta detectado", severidad="Alta", descripcion=f"{total} intentos fallidos desde {ip} en {servicio} (cuenta: {usuario_objetivo})"))
        bd.commit()
    registrar_accion(bd, "simular fuerza-bruta", "OK", usuario_id=usuario_actual.id)
    return {"mensaje": f"Simulación ejecutada — {total} intentos detectados desde {ip}", "tipo_ataque": "Fuerza Bruta", "ip": ip, "ejercicio_id": ejercicio.id, "id": inst.id, "plantilla_id": inst.plantilla_id, "titulo_caso": inst.titulo_caso, "texto_caso": inst.texto_caso, "variables": [{"clave": k, "valor": v} for k, v in vars_val.items()], "siguiente_paso": "Usa 'show alerts' para comenzar el análisis."}


@app.post("/simular/escaneo-puertos")
@limiter.limit("30/minute")
def simular_escaneo_puertos(request: Request, body: SolicitudSimular, usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    ejercicios = bd.query(Ejercicio).filter(Ejercicio.tipo == "defensa").all()
    if not ejercicios: raise HTTPException(status_code=500, detail="Sin ejercicios de tipo defensa")
    ejercicio = random.choice(ejercicios)
    inst, vars_val = crear_nuevo_escenario(bd, usuario_actual, ejercicio.id, PLANTILLAS_EP)
    ip = vars_val.get("ip_atacante", "192.168.1.100")
    puertos = vars_val.get("puertos", "22, 80, 443")
    for puerto in puertos.replace(" ", "").split(","):
        bd.add(Evento(tipo_evento="Escaneo de Puertos", ip_origen=ip, descripcion=f"Sonda detectada en puerto {puerto.strip()} desde {ip}"))
    bd.commit()
    total = bd.query(Evento).filter(Evento.ip_origen == ip, Evento.tipo_evento == "Escaneo de Puertos").count()
    if total >= 3:
        bd.add(Alerta(titulo="Reconocimiento de red detectado", severidad="Media", descripcion=f"Escaneo de puertos ({puertos}) detectado desde {ip}"))
        bd.commit()
    registrar_accion(bd, "simular escaneo-puertos", "OK", usuario_id=usuario_actual.id)
    return {"mensaje": f"Simulación ejecutada — escaneo en puertos {puertos} desde {ip}", "tipo_ataque": "Escaneo de Puertos", "ip": ip, "ejercicio_id": ejercicio.id, "id": inst.id, "plantilla_id": inst.plantilla_id, "titulo_caso": inst.titulo_caso, "texto_caso": inst.texto_caso, "variables": [{"clave": k, "valor": v} for k, v in vars_val.items()], "siguiente_paso": "Usa 'show alerts' para comenzar el análisis."}


# ── Ayuda ─────────────────────────────────────────────────────────

@app.post("/escenario/pedir-ayuda")
@limiter.limit("20/minute")
def pedir_ayuda(request: Request, body: dict, usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    _, inst = obtener_instancia_activa_usuario(bd, usuario_actual.id)
    if not inst: raise HTTPException(status_code=404, detail="No hay escenario activo")
    registrar_accion(bd, "pedir-ayuda", f"escenario_id={inst.id}", usuario_id=usuario_actual.id)
    total_ayudas = bd.query(AccionUsuario).filter(AccionUsuario.usuario_id == usuario_actual.id, AccionUsuario.comando == "pedir-ayuda").count()
    vars_inst = {v.clave: v.valor for v in bd.query(VariableInstancia).filter(VariableInstancia.instancia_id == inst.id).all()}
    ip = vars_inst.get("ip_atacante", "?")
    hints = [
        "Pista 1: Comienza revisando las alertas del sistema con → show alerts",
        "Pista 2: Luego revisa el detalle de los eventos con → show events",
        f"Pista 3: Identifica la IP atacante en los eventos y bloquéala con → block ip {ip}",
        "Pista 4: Verifica el bloqueo activo con → show blocked",
        f"Pista 5: La IP atacante en este escenario es {ip}. Usa → block ip {ip}",
    ]
    hint = hints[min(total_ayudas - 1, len(hints) - 1)]
    penalizacion = min(total_ayudas * 5, 30)
    return {"hint": hint, "veces_pedida": total_ayudas, "penalizacion_porcentaje": penalizacion, "mensaje": f"Ayuda #{total_ayudas} solicitada. Penalización acumulada: -{penalizacion}%"}


# ── Estadísticas ──────────────────────────────────────────────────

@app.get("/estadisticas")
def obtener_estadisticas(usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    return {
        "total_eventos": bd.query(Evento).count(),
        "total_alertas": bd.query(Alerta).count(),
        "eventos_recientes": [{"id": e.id, "tipo_evento": e.tipo_evento, "ip_origen": e.ip_origen, "descripcion": e.descripcion, "fecha_creacion": e.fecha_creacion.isoformat() if e.fecha_creacion else None} for e in bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(10).all()],
        "alertas_recientes": [{"id": a.id, "titulo": a.titulo, "severidad": a.severidad, "descripcion": a.descripcion, "evento_id": a.evento_id, "fecha_creacion": a.fecha_creacion.isoformat() if a.fecha_creacion else None} for a in bd.query(Alerta).order_by(Alerta.fecha_creacion.desc()).limit(10).all()],
    }


@app.get("/reporte")
def obtener_reporte(usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    ips = bd.query(IpBloqueada).all()
    acciones = bd.query(AccionUsuario).filter(AccionUsuario.usuario_id == usuario_actual.id).order_by(AccionUsuario.fecha_creacion.desc()).limit(50).all()
    return {
        "total_eventos": bd.query(Evento).count(),
        "total_alertas": bd.query(Alerta).count(),
        "ips_bloqueadas": [{"direccion_ip": ip.direccion_ip, "motivo": ip.motivo} for ip in ips],
        "acciones": [{"comando": a.comando, "resultado": a.resultado} for a in acciones]
    }


# ── Terminal ataque ───────────────────────────────────────────────

def _construir_contexto_real(bd: Session, usuario_id: int) -> str:
    """Construye contexto con datos reales de la BD para enriquecer el prompt de IA."""
    eventos = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(8).all()
    alertas = bd.query(Alerta).order_by(Alerta.fecha_creacion.desc()).limit(5).all()
    bloqueadas = bd.query(IpBloqueada).limit(5).all()
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
    raw   = (datos.comando or "").strip()
    cmd_l = raw.lower().strip()

    def guardar(res: str):
        bd.add(AccionUsuario(comando=raw, resultado=res, usuario_id=usuario_actual.id))
        bd.commit()

    if not raw:
        guardar("ERROR"); return {"salida": "bash: command not found"}

    alias = {"ayuda": "help", "estado": "status", "ver alertas": "show alerts", "ver eventos": "show events", "ver bloqueadas": "show blocked", "limpiar": "clear"}
    if cmd_l in alias: cmd_l = alias[cmd_l]

    partes = cmd_l.strip().split()
    base   = partes[0] if partes else ""

    if base in ["clear", "cls"]:
        guardar("OK"); return {"salida": "__LIMPIAR__"}

    if base in ["help", "?", "man"]:
        guardar("OK")
        return {"salida": (
            "CyberLab Terminal — Kali Linux (IA activa)\n"
            "Puedes usar cualquier comando de Kali Linux.\n"
            "Comandos con datos reales del laboratorio:\n"
            "  show alerts, show events, show blocked, show traffic,\n"
            "  show failed logins, show sessions, show hosts,\n"
            "  resolve host, trace ip, status, history,\n"
            "  block ip <ip>, unblock ip <ip>, export report\n"
            "Cualquier otro comando Linux/Kali es procesado por IA.\n"
        )}

    # ── Comandos con datos reales de BD ──────────────────────────

    if cmd_l == "whoami":
        guardar("OK"); return {"salida": usuario_actual.nombre_usuario}
    if cmd_l == "pwd":
        guardar("OK"); return {"salida": "/home/kali"}
    if cmd_l in ["ls", "ls -la", "ls -l", "ls -a"]:
        guardar("OK"); return {"salida": "drwxr-xr-x  evidence/\ndrwxr-xr-x  logs/\ndrwxr-xr-x  reports/\n-rw-r--r--  README.txt\n-rw-r--r--  incident.log"}

    if cmd_l in ["ip a", "ip addr", "ifconfig"]:
        _, inst_activa = obtener_instancia_activa_usuario(bd, usuario_actual.id)
        ip_atacante = None
        if inst_activa:
            var_ip = bd.query(VariableInstancia).filter(VariableInstancia.instancia_id == inst_activa.id, VariableInstancia.clave == "ip_atacante").first()
            if var_ip: ip_atacante = var_ip.valor
        salida = "1: lo: <LOOPBACK,UP> mtu 65536\n   inet 127.0.0.1/8\n2: eth0: <BROADCAST,MULTICAST,UP> mtu 1500\n   inet 192.168.1.10/24 brd 192.168.1.255"
        if ip_atacante:
            salida += f"\n\n[IDS] Fuente marcada como sospechosa: {ip_atacante}"
        guardar("OK"); return {"salida": salida}

    if cmd_l == "history":
        acciones = bd.query(AccionUsuario).filter(AccionUsuario.usuario_id == usuario_actual.id).order_by(AccionUsuario.fecha_creacion.asc()).limit(20).all()
        if not acciones: return {"salida": "No hay historial registrado."}
        lineas = [f"  {i+1}  {a.comando}" for i, a in enumerate(acciones)]
        guardar("OK"); return {"salida": "\n".join(lineas)}

    if cmd_l == "status":
        total_e = bd.query(Evento).count(); total_a = bd.query(Alerta).count()
        _, inst = obtener_instancia_activa_usuario(bd, usuario_actual.id)
        bloq = bd.query(BloqueoEscenario).filter(BloqueoEscenario.escenario_id == inst.id).count() if inst else 0
        estado = "BAJO ATAQUE" if total_a >= 2 else "OPERATIVO"
        guardar("OK"); return {"salida": f"● Sistema: {estado}\n  Eventos registrados : {total_e}\n  Alertas activas     : {total_a}\n  IPs bloqueadas      : {bloq}"}

    if cmd_l == "show alerts":
        alertas = bd.query(Alerta).order_by(Alerta.fecha_creacion.desc()).limit(10).all()
        if not alertas: return {"salida": "No hay alertas registradas."}
        guardar("OK")
        return {"salida": f"ALERTAS ({len(alertas)}):\n" + "\n".join(
            f"[{a.fecha_creacion.strftime('%H:%M:%S') if a.fecha_creacion else 'N/A'}] [{a.severidad}] {a.titulo} — {a.descripcion[:60]}"
            for a in alertas
        )}

    if cmd_l == "show events":
        eventos = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(12).all()
        if not eventos: return {"salida": "No hay eventos registrados."}
        guardar("OK")
        return {"salida": f"EVENTOS ({bd.query(Evento).count()} total):\n" + "\n".join(
            f"[{e.fecha_creacion.strftime('%H:%M:%S') if e.fecha_creacion else 'N/A'}] {e.tipo_evento:<22} src={e.ip_origen:<18} {e.descripcion[:50]}"
            for e in eventos
        )}

    if cmd_l == "show blocked":
        _, inst = obtener_instancia_activa_usuario(bd, usuario_actual.id)
        if not inst: return {"salida": "Sin escenario activo."}
        ips = bd.query(BloqueoEscenario).filter(BloqueoEscenario.escenario_id == inst.id).all()
        if not ips: return {"salida": "No hay IPs bloqueadas en este escenario."}
        guardar("OK")
        return {"salida": "IPs BLOQUEADAS:\n" + "\n".join(f"  DROP  {ip.direccion_ip}  # {ip.motivo}" for ip in ips)}

    if cmd_l == "show traffic":
        eventos = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(8).all()
        if not eventos: return {"salida": "Sin tráfico registrado."}
        guardar("OK")
        return {"salida": "TRÁFICO DE RED:\n" + "\n".join(
            f"  {e.ip_origen:<18} → {e.tipo_evento:<20} {e.descripcion[:45]}"
            for e in eventos
        )}

    if cmd_l == "show failed logins":
        evs = bd.query(Evento).filter(Evento.tipo_evento.ilike("%fuerza%")).order_by(Evento.fecha_creacion.desc()).limit(10).all()
        if not evs: return {"salida": "No hay intentos de login fallidos registrados."}
        guardar("OK")
        return {"salida": f"FAILED LOGINS ({len(evs)}):\n" + "\n".join(
            f"  [{e.fecha_creacion.strftime('%H:%M:%S') if e.fecha_creacion else 'N/A'}] FAILED src={e.ip_origen} {e.descripcion[:50]}"
            for e in evs
        )}

    if cmd_l == "show sessions":
        evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(5).all()
        if not evs: return {"salida": "Sin sesiones activas registradas."}
        guardar("OK")
        return {"salida": "SESIONES ACTIVAS:\n" + "\n".join(
            f"  SESSION-{i+1:03d}  src={e.ip_origen:<18} estado=ACTIVA  {e.tipo_evento}"
            for i, e in enumerate(evs)
        )}

    if cmd_l == "show hosts":
        ips = list(set(e.ip_origen for e in bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(20).all()))
        if not ips: return {"salida": "No se detectaron hosts activos."}
        bloqueadas = {ip.direccion_ip for ip in bd.query(IpBloqueada).all()}
        guardar("OK")
        return {"salida": "HOSTS DETECTADOS:\n" + "\n".join(
            f"  {ip:<18} {'[BLOQUEADA]' if ip in bloqueadas else '[ACTIVA]'}"
            for ip in ips[:8]
        )}

    if cmd_l == "resolve host":
        ev = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).first()
        ip_o = ev.ip_origen if ev else "192.168.1.100"
        guardar("OK")
        return {"salida": f"PTR {ip_o}: attacker-{ip_o.replace('.', '-')}.malicious.net\nASN: AS666 (malicious-hosting)\nReputación: MALICIOSA — listada en 3 blocklists"}

    if cmd_l == "trace ip":
        ev = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).first()
        ip_o = ev.ip_origen if ev else "?"
        guardar("OK")
        return {"salida": f"traceroute to {ip_o}:\n  1  192.168.1.1   1.2 ms\n  2  10.0.0.1      8.4 ms\n  3  {ip_o}   42.1 ms  TARGET"}

    if cmd_l == "export report":
        total_e = bd.query(Evento).count(); total_a = bd.query(Alerta).count()
        bloq = bd.query(IpBloqueada).count()
        acciones = bd.query(AccionUsuario).filter(AccionUsuario.usuario_id == usuario_actual.id).count()
        ruta = f"/home/kali/reports/incident_{usuario_actual.nombre_usuario}.txt"
        guardar("OK")
        return {"salida": (
            f"[+] Generando reporte de incidente...\n"
            f"    Analista  : {usuario_actual.nombre_usuario}\n"
            f"    Eventos   : {total_e}\n"
            f"    Alertas   : {total_a}\n"
            f"    Bloqueadas: {bloq} IPs\n"
            f"    Comandos  : {acciones} registrados\n"
            f"[+] Reporte exportado → {ruta}"
        )}

    if base == "block" and len(partes) >= 3 and partes[1] == "ip":
        ip_txt = partes[2]
        _, inst = obtener_instancia_activa_usuario(bd, usuario_actual.id)
        if inst:
            if not bd.query(BloqueoEscenario).filter(BloqueoEscenario.escenario_id == inst.id, BloqueoEscenario.direccion_ip == ip_txt).first():
                bd.add(BloqueoEscenario(escenario_id=inst.id, direccion_ip=ip_txt, motivo="Manual block")); bd.commit()
        if not bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip_txt).first():
            bd.add(IpBloqueada(direccion_ip=ip_txt, motivo="Manual block")); bd.commit()
        guardar("OK"); return {"salida": f"iptables -A INPUT -s {ip_txt} -j DROP\n→ {ip_txt} bloqueada correctamente."}

    if base == "unblock" and len(partes) >= 3 and partes[1] == "ip":
        ip_txt = partes[2]
        _, inst = obtener_instancia_activa_usuario(bd, usuario_actual.id)
        if inst:
            bloq = bd.query(BloqueoEscenario).filter(BloqueoEscenario.escenario_id == inst.id, BloqueoEscenario.direccion_ip == ip_txt).first()
            if bloq: bd.delete(bloq); bd.commit()
        existe = bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip_txt).first()
        if existe: bd.delete(existe); bd.commit(); guardar("OK"); return {"salida": f"iptables -D INPUT -s {ip_txt} -j DROP\n→ {ip_txt} desbloqueada."}
        guardar("OK"); return {"salida": f"{ip_txt} no estaba bloqueada."}

    # ── Todo lo demás → OpenAI con contexto real ─────────────────
    try:
        _, inst_activa = obtener_instancia_activa_usuario(bd, usuario_actual.id)
        contexto_escenario = ""
        if inst_activa:
            contexto_escenario = f"Escenario activo: {inst_activa.titulo_caso}\n"
        contexto_real = _construir_contexto_real(bd, usuario_actual.id)

        ai_resp = cliente_openai.chat.completions.create(
            model="gpt-3.5-turbo",
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
                        + contexto_escenario
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
    raw          = (datos.comando or "").strip()
    cmd_l        = raw.lower().strip()
    ip_escenario = datos.ip_escenario

    def guardar(res: str):
        bd.add(AccionUsuario(comando=raw, resultado=res, usuario_id=usuario_actual.id))
        bd.commit()

    if not raw:
        guardar("ERROR"); return {"salida": "bash: command not found"}

    partes = cmd_l.split()
    base   = partes[0] if partes else ""

    if base in ["clear", "cls", "limpiar"]:
        guardar("OK"); return {"salida": "__LIMPIAR__"}

    if base in ["ayuda", "help", "?"]:
        guardar("OK")
        return {"salida": (
            "CyberLab SOC Terminal — comandos reales Linux/Kali\n"
            "─────────────────────────────────────────────────────\n"
            "EVENTOS:   journalctl -n 50 | journalctl -n 10\n"
            "           grep Failed /var/log/auth.log\n"
            "           grep scan /var/log/syslog | netstat -an\n"
            "ALERTAS:   tail -50 /var/log/syslog | tail -f /var/log/syslog\n"
            "           grep -i crit /var/log/syslog\n"
            "ANÁLISIS:  nmap -sV <IP> | tcpdump host <IP> -c 20\n"
            "           grep <IP> /var/log/auth.log\n"
            "BLOQUEO:   iptables -A INPUT -s <IP> -j DROP\n"
            "           iptables -D INPUT -s <IP> -j DROP\n"
            "           iptables -L INPUT -n\n"
            "LOGS:      cat /var/log/syslog | cat /var/log/auth.log\n"
            "           iptables -L -v | grep sshd /var/log/auth.log\n"
            "           tail -50 /var/log/nginx/access.log\n"
            "ESTADO:    systemctl status | top -bn1\n"
            "           iptables -L -n -v | netstat -tulpn\n"
            "MISC:      lastb -n 20 | export-report | whoami | clear\n"
        )}

    if cmd_l == "whoami":
        guardar("OK"); return {"salida": f"{usuario_actual.nombre_usuario} [uid=1000(soc-analyst) gid=1000 groups=1000,sudo]"}

    # ── journalctl → eventos ───────────────────────────────────────
    if cmd_l == "journalctl -n 50":
        evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(50).all()
        if not evs: return {"salida": "-- No entries --"}
        lineas = [f"-- Journal begins. --"]
        for e in evs:
            ts = e.fecha_creacion.strftime("%b %d %H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"{ts} soc-lab kernel: [{e.tipo_evento}] src={e.ip_origen} {e.descripcion[:55]}")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    if cmd_l == "journalctl -n 10":
        evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(10).all()
        lineas = ["-- Journal begins (last 10). --"]
        for e in evs:
            ts = e.fecha_creacion.strftime("%b %d %H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"{ts} soc-lab kernel: [{e.tipo_evento}] src={e.ip_origen} {e.descripcion[:55]}")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    # ── grep Failed /var/log/auth.log → fuerza bruta ───────────────
    if cmd_l == "grep failed /var/log/auth.log":
        evs = bd.query(Evento).filter(Evento.tipo_evento.ilike("%fuerza%")).order_by(Evento.fecha_creacion.desc()).limit(15).all()
        total = bd.query(Evento).filter(Evento.tipo_evento.ilike("%fuerza%")).count()
        if not evs: return {"salida": "(no output)"}
        lineas = []
        for e in evs:
            ts = e.fecha_creacion.strftime("%b %d %H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"{ts} soc-lab sshd[1234]: Failed password for root from {e.ip_origen} port 54321 ssh2")
        if total >= 5: lineas.append(f"# {total} failed attempts — immediate action recommended")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    # ── grep scan /var/log/syslog → escaneo ───────────────────────
    if cmd_l == "grep scan /var/log/syslog":
        evs = bd.query(Evento).filter(Evento.tipo_evento.ilike("%escaneo%")).order_by(Evento.fecha_creacion.desc()).limit(10).all()
        total = bd.query(Evento).filter(Evento.tipo_evento.ilike("%escaneo%")).count()
        if not evs: return {"salida": "(no output)"}
        lineas = []
        for e in evs:
            ts = e.fecha_creacion.strftime("%b %d %H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"{ts} soc-lab kernel: [portscan] NMAP SYN scan detected from {e.ip_origen}")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    # ── netstat -an → conexiones de red ───────────────────────────
    if cmd_l == "netstat -an":
        evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(8).all()
        ips = list(set(e.ip_origen for e in evs))
        lineas = ["Active Internet connections (servers and established)",
                  "Proto Recv-Q Send-Q Local Address           Foreign Address         State"]
        for ip in ips[:6]:
            cnt = bd.query(Evento).filter(Evento.ip_origen == ip).count()
            lineas.append(f"tcp        0      0 0.0.0.0:22              {ip}:54{cnt:03d}    ESTABLISHED")
        lineas.append("tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    # ── tail -50 /var/log/syslog → alertas ────────────────────────
    if cmd_l == "tail -50 /var/log/syslog":
        als = bd.query(Alerta).order_by(Alerta.fecha_creacion.desc()).limit(10).all()
        evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(15).all()
        if not als and not evs: return {"salida": "(empty log)"}
        lineas = []
        for a in als:
            ts = a.fecha_creacion.strftime("%b %d %H:%M:%S") if a.fecha_creacion else "N/A"
            sev = "CRIT" if a.severidad in ("Alta","Crítica","Critica") else "WARN"
            lineas.append(f"{ts} soc-lab ids[999]: [{sev}] {a.titulo}: {a.descripcion[:70]}")
        for e in evs:
            ts = e.fecha_creacion.strftime("%b %d %H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"{ts} soc-lab kernel: {e.tipo_evento} from {e.ip_origen}")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    # ── grep -i crit /var/log/syslog → alertas críticas ──────────
    if cmd_l == "grep -i crit /var/log/syslog":
        als = bd.query(Alerta).filter(Alerta.severidad.in_(["Alta","Crítica","Critica"])).order_by(Alerta.fecha_creacion.desc()).limit(8).all()
        if not als: return {"salida": "(no output)"}
        lineas = []
        for a in als:
            ts = a.fecha_creacion.strftime("%b %d %H:%M:%S") if a.fecha_creacion else "N/A"
            lineas.append(f"{ts} soc-lab ids[999]: [CRIT] {a.titulo}: {a.descripcion[:75]}")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    # ── tail -f /var/log/syslog → alertas activas (streaming) ─────
    if cmd_l == "tail -f /var/log/syslog":
        als = bd.query(Alerta).order_by(Alerta.fecha_creacion.desc()).limit(5).all()
        lineas = ["==> /var/log/syslog <=="]
        for a in als:
            ts = a.fecha_creacion.strftime("%b %d %H:%M:%S") if a.fecha_creacion else "N/A"
            lineas.append(f"{ts} soc-lab ids[999]: {a.titulo}")
        lineas.append("^C")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    # ── nmap -sV <IP> → análisis de IP ────────────────────────────
    if base == "nmap":
        ip_obj = partes[-1] if len(partes) > 1 else ip_escenario or "?"
        evs    = bd.query(Evento).filter(Evento.ip_origen == ip_obj).all()
        total  = len(evs)
        tipos  = list(set(e.tipo_evento for e in evs))
        bloq   = bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip_obj).first()
        riesgo = "CRÍTICO" if total >= 8 else "ALTO" if total >= 4 else "MEDIO" if total >= 2 else "BAJO"
        guardar("OK")
        return {"salida": (
            f"Starting Nmap 7.94 ( https://nmap.org )\n"
            f"Nmap scan report for {ip_obj}\n"
            f"Host is {'up' if not bloq else 'filtered (blocked)'}.\n"
            f"PORT     STATE  SERVICE   VERSION\n"
            f"22/tcp   open   ssh       OpenSSH 8.9\n"
            f"80/tcp   open   http      nginx 1.22\n"
            f"443/tcp  open   https     nginx 1.22\n"
            f"Riesgo: {riesgo} | Eventos: {total} | Tipos: {', '.join(tipos) if tipos else 'ninguno'}\n"
            f"Nmap done: 1 IP address scanned"
        )}

    # ── grep <IP> /var/log/auth.log → historial de IP ─────────────
    if base == "grep" and len(partes) >= 3 and "/var/log/auth.log" in cmd_l:
        # detectar si es búsqueda de IP (historial) vs otros greps de auth.log
        termino = partes[1]
        es_ip_busqueda = all(c.isdigit() or c == "." for c in termino)
        if es_ip_busqueda:
            ip_obj = termino
            evs = bd.query(Evento).filter(Evento.ip_origen == ip_obj).order_by(Evento.fecha_creacion.asc()).all()
            if not evs: return {"salida": f"(no output — {ip_obj} not found in auth.log)"}
            lineas = []
            for e in evs:
                ts = e.fecha_creacion.strftime("%b %d %H:%M:%S") if e.fecha_creacion else "N/A"
                lineas.append(f"{ts} soc-lab sshd[1234]: Failed password from {ip_obj} port 22 ssh2")
            guardar("OK"); return {"salida": "\n".join(lineas)}

        # grep sshd /var/log/auth.log
        if termino == "sshd":
            evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(10).all()
            lineas = []
            for e in evs:
                ts = e.fecha_creacion.strftime("%b %d %H:%M:%S") if e.fecha_creacion else "N/A"
                lineas.append(f"{ts} soc-lab sshd[1234]: Failed password from {e.ip_origen} port 22 ssh2")
            guardar("OK"); return {"salida": "\n".join(lineas)}

    # ── tcpdump host <IP> -c 20 → tráfico de IP ───────────────────
    if base == "tcpdump":
        # extraer IP: buscar "host" en partes
        ip_obj = ip_escenario or "?"
        try:
            idx = partes.index("host")
            ip_obj = partes[idx + 1]
        except (ValueError, IndexError):
            pass
        total = bd.query(Evento).filter(Evento.ip_origen == ip_obj).count()
        guardar("OK")
        return {"salida": (
            f"tcpdump: verbose output suppressed, use -v/-vv for full protocol decode\n"
            f"listening on eth0, link-type EN10MB (Ethernet)\n"
            f"IP {ip_obj}.54321 > soc-lab.22: Flags [S], seq 0, win 64240\n"
            f"IP {ip_obj}.54322 > soc-lab.80: Flags [S], seq 1, win 64240\n"
            f"IP {ip_obj}.54323 > soc-lab.443: Flags [S], seq 2, win 64240\n"
            f"20 packets captured | Total eventos: {total} | Velocidad: {total*3} pkt/s (ANÓMALO)\n"
            f"20 packets received by filter"
        )}

    # ── iptables -A INPUT -s <IP> -j DROP → bloquear ──────────────
    if base == "iptables" and "-a" in partes and "drop" in partes:
        try:
            idx = partes.index("-s")
            ip_obj = partes[idx + 1]
        except (ValueError, IndexError):
            ip_obj = ip_escenario or "?"
        _, inst = obtener_instancia_activa_usuario(bd, usuario_actual.id)
        if inst:
            if not bd.query(BloqueoEscenario).filter(BloqueoEscenario.escenario_id == inst.id, BloqueoEscenario.direccion_ip == ip_obj).first():
                bd.add(BloqueoEscenario(escenario_id=inst.id, direccion_ip=ip_obj, motivo="iptables DROP rule")); bd.commit()
        if not bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip_obj).first():
            bd.add(IpBloqueada(direccion_ip=ip_obj, motivo=f"iptables -A INPUT -s {ip_obj} -j DROP")); bd.commit()
        guardar("OK")
        return {"salida": f"# regla DROP aplicada para {ip_obj}\n# iptables -L INPUT -n para verificar"}

    # ── iptables -D INPUT -s <IP> -j DROP → desbloquear ──────────
    if base == "iptables" and "-d" in partes and "drop" in partes:
        try:
            idx = partes.index("-s")
            ip_obj = partes[idx + 1]
        except (ValueError, IndexError):
            ip_obj = "?"
        existe = bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip_obj).first()
        if existe: bd.delete(existe); bd.commit(); guardar("OK"); return {"salida": f"# regla DROP eliminada para {ip_obj}"}
        guardar("OK"); return {"salida": f"iptables: Bad rule (does not exist): No such file or directory — {ip_obj} not in chain"}

    # ── iptables -L INPUT -n → IPs bloqueadas ─────────────────────
    if base == "iptables" and "-l" in partes and "input" in partes:
        ips = bd.query(IpBloqueada).order_by(IpBloqueada.id.desc()).all()
        lineas = ["Chain INPUT (policy ACCEPT)", "target     prot opt source               destination"]
        for ip in ips: lineas.append(f"DROP       all  --  {ip.direccion_ip:<20} 0.0.0.0/0")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    # ── iptables -L -v / -L -n -v → estado firewall ───────────────
    if base == "iptables" and "-l" in partes:
        total_b = bd.query(IpBloqueada).count()
        ips = bd.query(IpBloqueada).order_by(IpBloqueada.id.desc()).limit(5).all()
        lineas = [f"Chain INPUT (policy ACCEPT {total_b} rules)",
                  "pkts bytes target  prot opt in  out  source      destination"]
        for ip in ips:
            lineas.append(f"  42  2.1K DROP    all  --  any any  {ip.direccion_ip}  anywhere")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    # ── cat /var/log/syslog → logs ────────────────────────────────
    if cmd_l == "cat /var/log/syslog":
        total_e = bd.query(Evento).count(); total_a = bd.query(Alerta).count()
        guardar("OK"); return {"salida": f"/var/log/syslog: {total_e} eventos registrados, {total_a} alertas\nUsa tail -50 /var/log/syslog para ver las últimas entradas."}

    # ── cat /var/log/auth.log → logs auth ─────────────────────────
    if cmd_l == "cat /var/log/auth.log":
        evs = bd.query(Evento).filter(Evento.tipo_evento.ilike("%fuerza%")).order_by(Evento.fecha_creacion.desc()).limit(12).all()
        if not evs: return {"salida": "(empty)"}
        lineas = []
        for e in evs:
            ts = e.fecha_creacion.strftime("%b %d %H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"{ts} soc-lab sshd[1234]: Failed password for root from {e.ip_origen} port 22 ssh2")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    # ── tail -50 /var/log/nginx/access.log → logs web ─────────────
    if cmd_l == "tail -50 /var/log/nginx/access.log":
        evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(8).all()
        lineas = []
        for e in evs:
            ts = e.fecha_creacion.strftime("%d/%b/%Y:%H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f'{e.ip_origen} - - [{ts} +0000] "GET /admin HTTP/1.1" 401 512')
        guardar("OK"); return {"salida": "\n".join(lineas) if lineas else "(empty log)"}

    # ── systemctl status → estado del sistema ─────────────────────
    if cmd_l == "systemctl status":
        total_e = bd.query(Evento).count(); total_a = bd.query(Alerta).count(); total_b = bd.query(IpBloqueada).count()
        riesgo  = "degraded" if total_a >= 2 else "running"
        guardar("OK")
        return {"salida": (
            f"● soc-lab\n"
            f"    State: {riesgo}\n"
            f"     Jobs: 0 queued\n"
            f"   Failed: {total_a} units\n"
            f"    Since: Mon 2025-01-01 00:00:00 UTC\n"
            f"   CGroup: /\n"
            f"           Eventos: {total_e} | Alertas: {total_a} | Bloqueadas: {total_b}\n"
            f"           Riesgo: {'ALTO' if total_a >= 3 else 'MEDIO' if total_a >= 1 else 'BAJO'}"
        )}

    # ── top -bn1 → estado del servidor ────────────────────────────
    if cmd_l == "top -bn1":
        total_e = bd.query(Evento).count()
        cpu = min(30 + total_e * 2, 95); ram = min(40 + total_e, 90)
        guardar("OK")
        return {"salida": (
            f"top - 12:00:00 up 5 days,  3:22,  1 user,  load average: {cpu/10:.2f}, {cpu/12:.2f}, {cpu/15:.2f}\n"
            f"Tasks: 142 total,   1 running, 141 sleeping\n"
            f"%Cpu(s): {cpu}.0 us,  2.0 sy,  0.0 ni, {100-cpu-2}.0 id\n"
            f"MiB Mem :   3942.0 total,    {3942-int(3942*ram/100)}.0 free,   {int(3942*ram/100)}.0 used\n"
            f"Estado: {'⚠ DEGRADADO — alta carga de CPU' if cpu >= 70 else '✓ OPERATIVO'}"
        )}

    # ── netstat -tulpn → estado de red ────────────────────────────
    if cmd_l == "netstat -tulpn":
        evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(5).all()
        ips = list(set(e.ip_origen for e in evs))
        lineas = ["Active Internet connections (only servers)",
                  "Proto Recv-Q Send-Q Local Address    Foreign Address  State   PID/Program",
                  "tcp        0      0 0.0.0.0:22       0.0.0.0:*        LISTEN  1001/sshd",
                  "tcp        0      0 0.0.0.0:80       0.0.0.0:*        LISTEN  1002/nginx",
                  "tcp        0      0 0.0.0.0:443      0.0.0.0:*        LISTEN  1002/nginx"]
        for ip in ips[:3]:
            lineas.append(f"tcp        0      0 0.0.0.0:22       {ip}:*     ESTABLISHED  1001/sshd")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    # ── lastb -n 20 → intentos fallidos / correlación ─────────────
    if cmd_l == "lastb -n 20":
        total_e = bd.query(Evento).count(); total_a = bd.query(Alerta).count()
        evs_fb  = bd.query(Evento).filter(Evento.tipo_evento.ilike("%fuerza%")).count()
        evs_sc  = bd.query(Evento).filter(Evento.tipo_evento.ilike("%escaneo%")).count()
        evs     = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(10).all()
        ips     = list(set(e.ip_origen for e in bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(20).all()))
        lineas  = ["btmp begins Mon Jan  1 00:00:00 2025"]
        for e in evs:
            ts = e.fecha_creacion.strftime("%a %b %d %H:%M") if e.fecha_creacion else "N/A"
            lineas.append(f"root     ssh:{e.ip_origen}    {e.ip_origen}    {ts}   still logged in")
        lineas.append(f"\n# Correlación: eventos={total_e} alertas={total_a} ips_únicas={len(ips)}")
        lineas.append(f"# Fuerza bruta: {evs_fb} | Escaneo: {evs_sc}")
        if evs_fb >= 3 and evs_sc >= 2: lineas.append("# [ALTA] Reconocimiento + fuerza bruta — ataque en 2 fases")
        if total_a >= 2: lineas.append("# [ALTA] Múltiples alertas — incidente confirmado")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    # ── export-report → reporte ────────────────────────────────────
    if cmd_l == "export-report":
        total_e = bd.query(Evento).count(); total_a = bd.query(Alerta).count(); total_b = bd.query(IpBloqueada).count()
        guardar("OK")
        return {"salida": (
            f"=== INCIDENT REPORT — CyberLab SOC ===\n"
            f"Analista: {usuario_actual.nombre_usuario}\n"
            f"Eventos:  {total_e} | Alertas: {total_a} | IPs bloqueadas: {total_b}\n"
            f"Estado:   ✅ REPORTE GENERADO\n"
            f"Archivo guardado: /var/log/soc/report_{usuario_actual.nombre_usuario}.txt"
        )}

    # ── Fallback → OpenAI con contexto real ──────────────────────
    try:
        contexto_real = _construir_contexto_real(bd, usuario_actual.id)
        ai_resp = cliente_openai.chat.completions.create(
            model="gpt-3.5-turbo",
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
    if not datos.nueva_contrasena or len(datos.nueva_contrasena) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
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
def ia_feedback(body: SolicitudFeedbackIA, usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    prompt = (
        f"Eres un docente universitario de ciberseguridad. Explica el comando del estudiante de forma didáctica y breve.\n"
        f"Nivel: {body.nivel}\nComando: {body.comando}\nResultado: {body.resultado}\nEvidencia: {body.evidencia}"
    )
    r = cliente_openai.chat.completions.create(model="gpt-3.5-turbo", messages=[{"role": "user", "content": prompt}], max_tokens=400)
    return {"feedback": r.choices[0].message.content.strip()}


# ── Ejercicios creados por docente ────────────────────────────────

@app.post("/ejercicios-docente/crear")
def crear_ejercicio_docente(
    datos: SolicitudCrearEjercicioDocente,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    if usuario_actual.rol not in ("docente", "admin"):
        raise HTTPException(status_code=403, detail="Solo docentes y admin pueden crear ejercicios")
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
            f"Título: {datos.titulo}\n"
            f"Objetivos del ejercicio:\n{items_texto}\n\n"
            f"Genera un escenario de 3-4 párrafos con: nombre de empresa ficticia, descripción del incidente o situación, "
            f"qué rol juega el estudiante, y datos técnicos de contexto (IPs ficticias, servicios, fechas, síntomas observados). "
            f"El escenario debe ser más complejo y ambiguo a mayor nivel. Redacta en español, estilo caso de estudio profesional."
        )
        resp = cliente_openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt_esc}],
            max_tokens=600,
            temperature=0.7,
        )
        contexto_ia = resp.choices[0].message.content.strip()
    except Exception:
        contexto_ia = f"Escenario: {datos.titulo}\n\n{datos.descripcion}"

    ejercicio = EjercicioDocente(
        titulo=datos.titulo,
        descripcion=datos.descripcion,
        instrucciones=datos.instrucciones,
        tipo=datos.tipo,
        nivel=datos.nivel,
        tiempo_minutos=datos.tiempo_minutos,
        contexto_generado=contexto_ia,
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

    # Notificar a todos los estudiantes con correo registrado
    estudiantes = bd.query(Usuario).filter(
        Usuario.rol == "estudiante",
        Usuario.correo.isnot(None),
    ).all()
    for est in estudiantes:
        correo_nuevo_ejercicio(
            destinatario=est.correo,
            nombre_estudiante=est.nombre or est.nombre_usuario,
            titulo_ejercicio=ejercicio.titulo,
            tipo=ejercicio.tipo,
            nivel=ejercicio.nivel,
            tiempo_minutos=ejercicio.tiempo_minutos,
        )

    return {"mensaje": "Ejercicio creado", "id": ejercicio.id}


@app.get("/ejercicios-docente")
def listar_ejercicios_docente(
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    ejercicios = bd.query(EjercicioDocente).filter(EjercicioDocente.activo == True).order_by(EjercicioDocente.fecha_creacion.asc()).all()
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
    for ej in ejercicios:
        creador = bd.query(Usuario).filter(Usuario.id == ej.creado_por_id).first()
        resultado.append({
            "id": ej.id,
            "titulo": ej.titulo,
            "descripcion": ej.descripcion,
            "instrucciones": ej.instrucciones,
            "tipo": ej.tipo,
            "nivel": ej.nivel,
            "tiempo_minutos": ej.tiempo_minutos,
            "contexto_generado": ej.contexto_generado,
            "activo": ej.activo,
            "creado_por": creador.nombre_usuario if creador else "desconocido",
            "fecha_creacion": ej.fecha_creacion.isoformat() if ej.fecha_creacion else None,
            "items": [{"id": it.id, "descripcion": it.descripcion, "orden": it.orden} for it in ej.items],
        })
    return resultado


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
        f"Título del ejercicio: {datos.titulo}\n"
        f"Tipo: {tipo_label}\n"
        f"Nivel {datos.nivel} — Tema: {tema_nivel}\n"
        f"Complejidad esperada: {complejidad}\n"
        f"Número de puntos/objetivos a evaluar: {datos.num_puntos}\n\n"
        f"Responde EXACTAMENTE en este formato JSON (sin markdown, sin texto extra fuera del JSON):\n"
        f'{{"descripcion":"...","instrucciones":"...","items":["objetivo 1","objetivo 2",...]}}\n\n'
        f"REGLAS ESTRICTAS:\n"
        f"- descripcion: 1-2 oraciones describiendo el ESCENARIO o PROBLEMA a resolver, sin mencionar herramientas ni comandos.\n"
        f"- instrucciones: 2-4 oraciones de CONTEXTO adicional del escenario (qué ocurrió, qué se espera del estudiante), sin revelar cómo hacerlo.\n"
        f"- items: exactamente {datos.num_puntos} OBJETIVOS observables que el estudiante debe lograr (qué debe identificar, detectar, bloquear, analizar o documentar), redactados como resultados esperados, NO como pasos ni comandos.\n"
        f"Todo en español. El nivel de complejidad del escenario debe reflejar el nivel {datos.nivel} indicado."
    )
    try:
        resp = cliente_openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            temperature=0.7,
        )
        import json as _json
        contenido = resp.choices[0].message.content.strip()
        data = _json.loads(contenido)
        return {
            "descripcion": data.get("descripcion", ""),
            "instrucciones": data.get("instrucciones", ""),
            "items": data.get("items", []),
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
    ej.activo = False
    bd.commit()
    return {"mensaje": "Ejercicio eliminado"}


@app.post("/ejercicios-docente/{ejercicio_id}/entregar")
def entregar_ejercicio_docente(
    ejercicio_id: int,
    datos: SolicitudEntregarEjercicio,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    ej = bd.query(EjercicioDocente).filter(EjercicioDocente.id == ejercicio_id, EjercicioDocente.activo == True).first()
    if not ej:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")
    entrega_existente = bd.query(EntregaEjercicioDocente).filter(
        EntregaEjercicioDocente.ejercicio_id == ejercicio_id,
        EntregaEjercicioDocente.usuario_id == usuario_actual.id,
    ).first()
    if entrega_existente:
        entrega_existente.respuesta = datos.respuesta
        entrega_existente.estado = "entregado"
        entrega_existente.ayudas_pedidas = datos.ayudas_pedidas
        bd.commit()
        return {"mensaje": "Entrega actualizada", "id": entrega_existente.id}
    entrega = EntregaEjercicioDocente(
        ejercicio_id=ejercicio_id,
        usuario_id=usuario_actual.id,
        respuesta=datos.respuesta,
        ayudas_pedidas=datos.ayudas_pedidas,
    )
    bd.add(entrega)
    bd.commit()
    bd.refresh(entrega)
    return {"mensaje": "Ejercicio entregado", "id": entrega.id}


@app.get("/ejercicios-docente/{ejercicio_id}/entregas")
def listar_entregas_ejercicio(
    ejercicio_id: int,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    if usuario_actual.rol not in ("docente", "admin"):
        raise HTTPException(status_code=403, detail="Sin permiso")
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
            "fecha_entrega": en.fecha_entrega.isoformat() if en.fecha_entrega else None,
        })
    return resultado


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
            "fecha_entrega": en.fecha_entrega.isoformat() if en.fecha_entrega else None,
        })
    return resultado


@app.get("/ejercicios-docente/mis-entregas/todas")
def mis_entregas(
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    bd: Session = Depends(obtener_bd),
):
    entregas = bd.query(EntregaEjercicioDocente).filter(EntregaEjercicioDocente.usuario_id == usuario_actual.id).all()
    resultado = []
    for en in entregas:
        resultado.append({
            "id": en.id,
            "ejercicio_id": en.ejercicio_id,
            "estado": en.estado,
            "nota": en.nota,
            "comentarios_docente": en.comentarios_docente,
            "fecha_entrega": en.fecha_entrega.isoformat() if en.fecha_entrega else None,
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
    entrega.fecha_evaluacion = datetime.now(timezone.utc)
    bd.commit()

    # Notificar al estudiante que su entrega fue evaluada
    estudiante = bd.query(Usuario).filter(Usuario.id == entrega.usuario_id).first()
    ejercicio_doc = bd.query(EjercicioDocente).filter(EjercicioDocente.id == entrega.ejercicio_id).first()
    if estudiante and estudiante.correo and ejercicio_doc:
        correo_nota_asignada(
            destinatario=estudiante.correo,
            nombre_estudiante=estudiante.nombre or estudiante.nombre_usuario,
            titulo_ejercicio=ejercicio_doc.titulo,
            nota=datos.nota,
            comentarios=datos.comentarios,
        )

    return {"mensaje": "Entrega evaluada"}