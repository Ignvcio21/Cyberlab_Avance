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
    EscenarioActivoUsuario, BloqueoEscenario
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
    bd = SesionLocal()
    # Admin por defecto
    admin = bd.query(Usuario).filter(Usuario.nombre_usuario == "admin").first()
    if not admin:
        bd.add(Usuario(
            nombre_usuario="admin",
            contrasena=hashear_contrasena("admin123"),
            rol="admin"
        ))
        bd.commit()
    elif admin.rol != "admin":
        admin.rol = "admin"; bd.commit()
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
    u = bd.query(Usuario).filter(Usuario.nombre_usuario == datos.nombre_usuario).first()
    if not u or not verificar_contrasena(datos.contrasena, u.contrasena):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    token = crear_token({"sub": u.nombre_usuario, "rol": u.rol})
    return {"mensaje": "Inicio de sesión correcto", "nombre_usuario": u.nombre_usuario, "rol": u.rol, "token": token}


@app.post("/registrar")
@limiter.limit("5/minute")
def registrar_estudiante(request: Request, datos: SolicitudRegistroEstudiante, bd: Session = Depends(obtener_bd)):
    if bd.query(Usuario).filter(Usuario.nombre_usuario == datos.nombre_usuario).first():
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    bd.add(Usuario(
        nombre_usuario=datos.nombre_usuario,
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
    if obtener_usuario_por_nombre(bd, datos.nombre_usuario):
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    bd.add(Usuario(nombre_usuario=datos.nombre_usuario, contrasena=hashear_contrasena(datos.contrasena), rol=rol))
    bd.commit()
    return {"mensaje": f"Usuario creado ({rol})"}


@app.get("/admin/usuarios", response_model=list[RespuestaUsuario])
def admin_listar_usuarios(usuario_actual: Usuario = Depends(solo_admin), bd: Session = Depends(obtener_bd)):
    return bd.query(Usuario).order_by(Usuario.id.asc()).all()


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
def obtener_niveles_desbloqueados(nombre_usuario: str, usuario_actual: Usuario = Depends(obtener_usuario_actual), bd: Session = Depends(obtener_bd)):
    if usuario_actual.nombre_usuario != nombre_usuario and usuario_actual.rol not in ["admin", "docente"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    u = bd.query(Usuario).filter(Usuario.nombre_usuario == nombre_usuario).first()
    if not u: raise HTTPException(status_code=404, detail="Usuario no encontrado")

    TOTAL_EJ = 5
    intentos_aprobados = bd.query(IntentoEjercicio).filter(IntentoEjercicio.usuario_id == u.id, IntentoEjercicio.estado == "aprobado").all()
    cursos = bd.query(Curso).all()
    mapa_ej_nivel = {}
    for curso in cursos:
        caps = bd.query(Capitulo).filter(Capitulo.curso_id == curso.id).all()
        for cap in caps:
            lecs = bd.query(Leccion).filter(Leccion.capitulo_id == cap.id).all()
            for lec in lecs:
                for ej in bd.query(Ejercicio).filter(Ejercicio.leccion_id == lec.id).all():
                    mapa_ej_nivel[ej.id] = cap.orden

    conteo = {n: 0 for n in range(1, 8)}
    for it in intentos_aprobados:
        niv = mapa_ej_nivel.get(it.ejercicio_id)
        if niv and 1 <= niv <= 7: conteo[niv] += 1

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
            "descripcion_ejercicio": ej.descripcion if ej else None,
            "fecha_inicio": it.fecha_inicio.isoformat() if it.fecha_inicio else None,
            "fecha_fin": it.fecha_fin.isoformat() if it.fecha_fin else None,
        })
    return {"intentos": salida}


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
            "CyberLab Terminal (kali-like)\n"
            "Comandos: help, whoami, pwd, ls, ip a, status, history,\n"
            "show alerts, show events, show blocked, show services,\n"
            "show traffic, show banners, show vulnerabilities,\n"
            "show users, show sessions, show failed logins,\n"
            "show processes, show hosts, scan ports, resolve host,\n"
            "trace ip, enumerate users, enumerate services,\n"
            "export report, block ip <ip>, unblock ip <ip>, clear\n"
        )}

    if cmd_l == "whoami":
        guardar("OK"); return {"salida": usuario_actual.nombre_usuario}
    if cmd_l == "pwd":
        guardar("OK"); return {"salida": "/home/cyberlab"}
    if cmd_l in ["ls", "ls -la", "ls -l"]:
        guardar("OK"); return {"salida": "drwxr-xr-x evidence/\ndrwxr-xr-x logs/\ndrwxr-xr-x reports/\n-rw-r--r-- README.txt\n-rw-r--r-- incident.log"}

    if cmd_l in ["ip a", "ip addr", "ifconfig"]:
        _, inst_activa = obtener_instancia_activa_usuario(bd, usuario_actual.id)
        ip_atacante = None
        if inst_activa:
            var_ip = bd.query(VariableInstancia).filter(VariableInstancia.instancia_id == inst_activa.id, VariableInstancia.clave == "ip_atacante").first()
            if var_ip: ip_atacante = var_ip.valor
        salida = "1: lo: inet 127.0.0.1/8\n2: eth0: inet 192.168.1.10/24\n"
        if ip_atacante:
            salida += f"\n[IDS] Source IP flagged: {ip_atacante}\n"
        guardar("OK"); return {"salida": salida}

    if cmd_l == "history":
        acciones = bd.query(AccionUsuario).filter(AccionUsuario.usuario_id == usuario_actual.id).order_by(AccionUsuario.fecha_creacion.desc()).limit(20).all()
        if not acciones: return {"salida": "No hay historial."}
        lineas = [f"  {i+1}  {a.comando}" for i, a in enumerate(reversed(acciones))]
        guardar("OK"); return {"salida": "\n".join(lineas)}

    if cmd_l == "status":
        total_e = bd.query(Evento).count(); total_a = bd.query(Alerta).count()
        _, inst = obtener_instancia_activa_usuario(bd, usuario_actual.id)
        bloq = bd.query(BloqueoEscenario).filter(BloqueoEscenario.escenario_id == inst.id).count() if inst else 0
        guardar("OK"); return {"salida": f"System status: OK\nevents: {total_e}\nalerts: {total_a}\nblocked_ips: {bloq}\nlab: operational"}

    if cmd_l == "show alerts":
        alertas = bd.query(Alerta).order_by(Alerta.fecha_creacion.desc()).limit(10).all()
        if not alertas: return {"salida": "No alerts registered."}
        guardar("OK"); return {"salida": "\n".join([f"{a.fecha_creacion.isoformat() if a.fecha_creacion else 'N/A'} | {a.severidad} | {a.titulo} | {a.descripcion}" for a in alertas])}

    if cmd_l == "show events":
        eventos = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(10).all()
        if not eventos: return {"salida": "No events registered."}
        guardar("OK"); return {"salida": "\n".join([f"{e.fecha_creacion.isoformat() if e.fecha_creacion else 'N/A'} | {e.tipo_evento} | src={e.ip_origen} | {e.descripcion}" for e in eventos])}

    if cmd_l == "show blocked":
        _, inst = obtener_instancia_activa_usuario(bd, usuario_actual.id)
        if not inst: return {"salida": "No active scenario."}
        ips = bd.query(BloqueoEscenario).filter(BloqueoEscenario.escenario_id == inst.id).all()
        if not ips: return {"salida": "No blocked IPs in current scenario."}
        guardar("OK"); return {"salida": "\n".join([f"{ip.fecha_creacion.isoformat() if ip.fecha_creacion else 'N/A'} | {ip.direccion_ip} | reason={ip.motivo}" for ip in ips])}

    if cmd_l == "show services":
        guardar("OK"); return {"salida": "SSH (22/tcp) OPEN\nHTTP (80/tcp) OPEN\nHTTPS (443/tcp) OPEN\nFTP (21/tcp) OPEN"}
    if cmd_l == "scan ports":
        guardar("OK"); return {"salida": "22/tcp open ssh\n80/tcp open http\n443/tcp open https\n8080/tcp open http-alt"}
    if cmd_l == "show traffic":
        eventos = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(5).all()
        guardar("OK"); return {"salida": f"Traffic analysis:\n" + "\n".join([f"src={e.ip_origen} type={e.tipo_evento}" for e in eventos])}
    if cmd_l == "show banners":
        guardar("OK"); return {"salida": "SSH: OpenSSH_7.4 (outdated)\nHTTP: Apache/2.2.34 (outdated)\nFTP: vsftpd 2.3.4 (VULNERABLE)"}
    if cmd_l == "resolve host":
        ev = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).first()
        ip_o = ev.ip_origen if ev else "192.168.1.100"
        guardar("OK"); return {"salida": f"PTR: attacker-{ip_o.replace('.', '-')}.malicious.net\nReputation: MALICIOUS"}
    if cmd_l == "show vulnerabilities":
        guardar("OK"); return {"salida": "CRITICAL: vsftpd 2.3.4 backdoor (CVE-2011-2523)\nHIGH: OpenSSH 7.4 user enum (CVE-2018-15473)\nHIGH: Apache 2.2.34 (CVE-2017-7679)"}
    if cmd_l == "trace ip":
        ev = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).first()
        ip_o = ev.ip_origen if ev else "?"
        guardar("OK"); return {"salida": f"1 192.168.1.1\n2 10.0.0.1\n3 {ip_o} TARGET"}
    if cmd_l == "show users":
        guardar("OK"); return {"salida": "root uid=0\nadmin uid=1000\noperador uid=1001\nsysadmin uid=1003"}
    if cmd_l == "show sessions":
        evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(3).all()
        guardar("OK"); return {"salida": "\n".join([f"SESSION-{i+1:03d} src={e.ip_origen} ACTIVE" for i, e in enumerate(evs)])}
    if cmd_l == "show failed logins":
        evs = bd.query(Evento).filter(Evento.tipo_evento == "Fuerza Bruta").order_by(Evento.fecha_creacion.desc()).limit(10).all()
        if not evs: return {"salida": "No failed login attempts."}
        guardar("OK"); return {"salida": "\n".join([f"FAILED LOGIN src={e.ip_origen} {e.descripcion}" for e in evs])}
    if cmd_l == "show processes":
        guardar("OK"); return {"salida": "PID 215 sshd\nPID 318 apache2\nPID 891 /bin/bash (ANOMALOUS)\nPID 934 nc -lvp 4444 (SUSPICIOUS)"}
    if cmd_l == "show hosts":
        ips = list(set(e.ip_origen for e in bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(20).all()))[:6]
        guardar("OK"); return {"salida": "\n".join([f"{ip} ACTIVE — malicious" for ip in ips])}
    if cmd_l == "enumerate users":
        guardar("OK"); return {"salida": "[+] admin VALID\n[+] root VALID\n[-] guest INVALID"}
    if cmd_l == "enumerate services":
        guardar("OK"); return {"salida": "SSH 22/tcp OpenSSH 7.4\nHTTP 80/tcp Apache 2.2.34\nFTP 21/tcp vsftpd 2.3.4 BACKDOOR"}
    if cmd_l == "export report":
        guardar("OK"); return {"salida": f"Report exported: /home/cyberlab/reports/incident_{usuario_actual.nombre_usuario}.txt"}

    if base == "block" and len(partes) >= 3 and partes[1] == "ip":
        ip_txt = partes[2]
        _, inst = obtener_instancia_activa_usuario(bd, usuario_actual.id)
        if inst:
            if not bd.query(BloqueoEscenario).filter(BloqueoEscenario.escenario_id == inst.id, BloqueoEscenario.direccion_ip == ip_txt).first():
                bd.add(BloqueoEscenario(escenario_id=inst.id, direccion_ip=ip_txt, motivo="Manual block")); bd.commit()
        if not bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip_txt).first():
            bd.add(IpBloqueada(direccion_ip=ip_txt, motivo="Manual block")); bd.commit()
        guardar("OK"); return {"salida": f"iptables: blocked {ip_txt}"}

    if base == "unblock" and len(partes) >= 3 and partes[1] == "ip":
        ip_txt = partes[2]
        _, inst = obtener_instancia_activa_usuario(bd, usuario_actual.id)
        if inst:
            bloq = bd.query(BloqueoEscenario).filter(BloqueoEscenario.escenario_id == inst.id, BloqueoEscenario.direccion_ip == ip_txt).first()
            if bloq: bd.delete(bloq); bd.commit()
        existe = bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip_txt).first()
        if existe: bd.delete(existe); bd.commit(); guardar("OK"); return {"salida": f"iptables: unblocked {ip_txt}"}
        guardar("OK"); return {"salida": f"iptables: {ip_txt} was not blocked"}

    guardar("ERROR"); return {"salida": f"bash: {raw}: command not found"}


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
            "CyberLab SOC Terminal — Modo Defensa\n"
            "eventos | eventos recientes | eventos fuerza-bruta | eventos escaneo\n"
            "alertas | alertas criticas | alertas activas\n"
            "analizar-ip <IP> | historial-ip <IP> | trafico-ip <IP>\n"
            "bloquear-ip <IP> | desbloquear-ip <IP> | ips-bloqueadas\n"
            "logs | logs auth | logs firewall | logs ssh | logs web\n"
            "estado-sistema | estado-firewall | estado-servidor | estado-red\n"
            "correlacionar | generar-reporte | whoami | clear\n"
        )}

    if cmd_l == "whoami":
        guardar("OK"); return {"salida": f"{usuario_actual.nombre_usuario} [rol: analista-soc]"}

    if cmd_l == "eventos":
        evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(12).all()
        if not evs: return {"salida": "No hay eventos registrados."}
        lineas = [f"EVENTOS — Total: {bd.query(Evento).count()}"]
        for e in evs:
            ts = e.fecha_creacion.strftime("%H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"[{ts}] {e.tipo_evento:<20} src={e.ip_origen:<18} {e.descripcion[:55]}")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    if cmd_l == "eventos recientes":
        evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(5).all()
        lineas = ["EVENTOS RECIENTES:"]
        for e in evs:
            ts = e.fecha_creacion.strftime("%H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"[{ts}] {e.tipo_evento} | src={e.ip_origen} | {e.descripcion[:60]}")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    if cmd_l == "eventos fuerza-bruta":
        evs = bd.query(Evento).filter(Evento.tipo_evento.ilike("%fuerza%")).order_by(Evento.fecha_creacion.desc()).limit(10).all()
        total = bd.query(Evento).filter(Evento.tipo_evento.ilike("%fuerza%")).count()
        lineas = [f"EVENTOS FUERZA BRUTA — {total} registros:"]
        for e in evs:
            ts = e.fecha_creacion.strftime("%H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"[{ts}] BRUTE-FORCE src={e.ip_origen} | {e.descripcion[:65]}")
        if total >= 5: lineas.append(f"⚠ {total} intentos — bloqueo recomendado.")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    if cmd_l == "eventos escaneo":
        evs = bd.query(Evento).filter(Evento.tipo_evento.ilike("%escaneo%")).order_by(Evento.fecha_creacion.desc()).limit(10).all()
        total = bd.query(Evento).filter(Evento.tipo_evento.ilike("%escaneo%")).count()
        lineas = [f"EVENTOS ESCANEO — {total} registros:"]
        for e in evs:
            ts = e.fecha_creacion.strftime("%H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"[{ts}] PORT-SCAN src={e.ip_origen} | {e.descripcion[:65]}")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    if cmd_l == "eventos red":
        evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(8).all()
        ips = list(set(e.ip_origen for e in evs))
        lineas = ["EVENTOS RED:"] + [f"→ {ip:<18} {bd.query(Evento).filter(Evento.ip_origen == ip).count()} eventos" for ip in ips[:6]]
        guardar("OK"); return {"salida": "\n".join(lineas)}

    if cmd_l in ["alertas", "alertas activas"]:
        als = bd.query(Alerta).order_by(Alerta.fecha_creacion.desc()).limit(10).all()
        if not als: return {"salida": "Sin alertas activas."}
        lineas = [f"ALERTAS — Total: {bd.query(Alerta).count()}"]
        for a in als:
            ts  = a.fecha_creacion.strftime("%H:%M:%S") if a.fecha_creacion else "N/A"
            sev = "🔴" if a.severidad == "Alta" else "🟡"
            lineas.append(f"[{ts}] {sev} [{a.severidad}] {a.titulo}\n  └─ {a.descripcion[:70]}")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    if cmd_l == "alertas criticas":
        als = bd.query(Alerta).filter(Alerta.severidad.in_(["Alta","Crítica","Critica"])).order_by(Alerta.fecha_creacion.desc()).limit(8).all()
        if not als: return {"salida": "No hay alertas críticas."}
        lineas = [f"🔴 ALERTAS CRÍTICAS — {len(als)}:"]
        for a in als:
            lineas.append(f"🔴 {a.titulo}\n  └─ {a.descripcion[:75]}")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    if cmd_l.startswith("analizar-ip"):
        ip_obj = partes[1] if len(partes) > 1 else ip_escenario or "?"
        evs    = bd.query(Evento).filter(Evento.ip_origen == ip_obj).all()
        total  = len(evs)
        tipos  = list(set(e.tipo_evento for e in evs))
        bloq   = bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip_obj).first()
        riesgo = "CRÍTICO" if total >= 8 else "ALTO" if total >= 4 else "MEDIO" if total >= 2 else "BAJO"
        guardar("OK")
        return {"salida": f"ANÁLISIS IP: {ip_obj}\nEstado: {'BLOQUEADA' if bloq else 'ACTIVA'}\nRiesgo: {riesgo}\nEventos: {total}\nTipos: {', '.join(tipos) if tipos else 'ninguno'}"}

    if cmd_l.startswith("historial-ip"):
        ip_obj = partes[1] if len(partes) > 1 else ip_escenario or "?"
        evs = bd.query(Evento).filter(Evento.ip_origen == ip_obj).order_by(Evento.fecha_creacion.asc()).all()
        if not evs: return {"salida": f"Sin historial para {ip_obj}."}
        lineas = [f"HISTORIAL {ip_obj} ({len(evs)} eventos):"]
        for e in evs:
            ts = e.fecha_creacion.strftime("%H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"[{ts}] {e.tipo_evento} {e.descripcion[:55]}")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    if cmd_l.startswith("trafico-ip"):
        ip_obj = partes[1] if len(partes) > 1 else ip_escenario or "?"
        total  = bd.query(Evento).filter(Evento.ip_origen == ip_obj).count()
        guardar("OK")
        return {"salida": f"TRÁFICO {ip_obj}\nConexiones: {total}\nProtocolo: TCP\nPuertos: 22,80,443\nVelocidad: {total*3} req/min (ANÓMALO)"}

    if cmd_l.startswith("bloquear-ip"):
        ip_obj = partes[1] if len(partes) > 1 else ip_escenario or "?"
        _, inst = obtener_instancia_activa_usuario(bd, usuario_actual.id)
        if inst:
            if not bd.query(BloqueoEscenario).filter(BloqueoEscenario.escenario_id == inst.id, BloqueoEscenario.direccion_ip == ip_obj).first():
                bd.add(BloqueoEscenario(escenario_id=inst.id, direccion_ip=ip_obj, motivo="Bloqueo defensivo SOC")); bd.commit()
        if not bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip_obj).first():
            bd.add(IpBloqueada(direccion_ip=ip_obj, motivo="Bloqueo defensivo SOC")); bd.commit()
        guardar("OK")
        return {"salida": f"🛡 BLOQUEADA: {ip_obj}\nRegla firewall aplicada.\nUsa 'ips-bloqueadas' para confirmar."}

    if cmd_l.startswith("desbloquear-ip"):
        ip_obj = partes[1] if len(partes) > 1 else "?"
        existe = bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip_obj).first()
        if existe: bd.delete(existe); bd.commit(); guardar("OK"); return {"salida": f"✓ {ip_obj} desbloqueada."}
        guardar("OK"); return {"salida": f"{ip_obj} no estaba bloqueada."}

    if cmd_l == "ips-bloqueadas":
        ips = bd.query(IpBloqueada).order_by(IpBloqueada.id.desc()).all()
        if not ips: return {"salida": "No hay IPs bloqueadas."}
        lineas = [f"IPs BLOQUEADAS — {len(ips)} reglas:"]
        for ip in ips: lineas.append(f"🔴 {ip.direccion_ip:<18} {ip.motivo or ''}")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    if cmd_l == "logs":
        guardar("OK"); return {"salida": f"LOGS: eventos={bd.query(Evento).count()} alertas={bd.query(Alerta).count()}"}
    if cmd_l == "logs auth":
        evs = bd.query(Evento).filter(Evento.tipo_evento.ilike("%fuerza%")).order_by(Evento.fecha_creacion.desc()).limit(10).all()
        lineas = [f"AUTH LOG — {len(evs)} entradas:"]
        for e in evs:
            ts = e.fecha_creacion.strftime("%H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"[{ts}] AUTH_FAIL src={e.ip_origen}")
        guardar("OK"); return {"salida": "\n".join(lineas)}
    if cmd_l == "logs firewall":
        ips = bd.query(IpBloqueada).all()
        lineas = ["FIREWALL LOG:"] + [f"DROP src={ip.direccion_ip}" for ip in ips]
        guardar("OK"); return {"salida": "\n".join(lineas)}
    if cmd_l == "logs ssh":
        evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(8).all()
        lineas = ["SSH LOG:"] + [f"Failed password from {e.ip_origen} port 22" for e in evs]
        guardar("OK"); return {"salida": "\n".join(lineas)}
    if cmd_l == "logs web":
        evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(5).all()
        lineas = ["WEB LOG:"] + [f"{e.ip_origen} GET /admin 401" for e in evs]
        guardar("OK"); return {"salida": "\n".join(lineas)}

    if cmd_l == "estado-sistema":
        total_e = bd.query(Evento).count(); total_a = bd.query(Alerta).count(); total_b = bd.query(IpBloqueada).count()
        riesgo  = "ALTO" if total_a >= 3 else "MEDIO" if total_a >= 1 else "BAJO"
        guardar("OK")
        return {"salida": f"SISTEMA: {'BAJO ATAQUE' if total_a >= 2 else 'OPERATIVO'}\nRiesgo: {riesgo}\nEventos: {total_e} Alertas: {total_a} Bloqueadas: {total_b}"}
    if cmd_l == "estado-firewall":
        total_b = bd.query(IpBloqueada).count()
        guardar("OK"); return {"salida": f"FIREWALL: ACTIVO\nReglas DROP: {total_b}"}
    if cmd_l == "estado-servidor":
        total_e = bd.query(Evento).count()
        guardar("OK"); return {"salida": f"SERVIDOR: {'DEGRADADO' if total_e >= 8 else 'OPERATIVO'}\nCPU: {min(30+total_e*2,95)}% RAM: {min(40+total_e,90)}%"}
    if cmd_l == "estado-red":
        evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(5).all()
        ips = list(set(e.ip_origen for e in evs))
        guardar("OK"); return {"salida": f"RED: {'ANÓMALA' if len(ips) >= 2 else 'NORMAL'}\nIPs activas: {len(ips)}"}

    if cmd_l == "correlacionar":
        total_e = bd.query(Evento).count(); total_a = bd.query(Alerta).count()
        evs_fb  = bd.query(Evento).filter(Evento.tipo_evento.ilike("%fuerza%")).count()
        evs_sc  = bd.query(Evento).filter(Evento.tipo_evento.ilike("%escaneo%")).count()
        ips     = list(set(e.ip_origen for e in bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(20).all()))
        lineas  = [f"CORRELACIÓN: eventos={total_e} alertas={total_a} ips={len(ips)}",
                   f"Fuerza bruta: {evs_fb} | Escaneo: {evs_sc}"]
        if evs_fb >= 3 and evs_sc >= 2: lineas.append("[ALTA] Reconocimiento + fuerza bruta — ataque en 2 fases")
        if total_a >= 2: lineas.append("[ALTA] Múltiples alertas — incidente confirmado")
        guardar("OK"); return {"salida": "\n".join(lineas)}

    if cmd_l == "generar-reporte":
        total_e = bd.query(Evento).count(); total_a = bd.query(Alerta).count(); total_b = bd.query(IpBloqueada).count()
        guardar("OK")
        return {"salida": f"REPORTE DEFENSIVO\nAnalista: {usuario_actual.nombre_usuario}\nEventos: {total_e} Alertas: {total_a} Bloqueadas: {total_b}\nEstado: ✅ GENERADO"}

    guardar("ERROR"); return {"salida": f"bash: {raw}: command not found\nEscribe 'ayuda' para ver comandos."}


# ── Feedback IA ───────────────────────────────────────────────────

@app.post("/ia/feedback")
def ia_feedback(body: SolicitudFeedbackIA, usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    prompt = (
        f"Eres un docente universitario de ciberseguridad. Explica el comando del estudiante de forma didáctica y breve.\n"
        f"Nivel: {body.nivel}\nComando: {body.comando}\nResultado: {body.resultado}\nEvidencia: {body.evidencia}"
    )
    r = cliente_openai.chat.completions.create(model="gpt-3.5-turbo", messages=[{"role": "user", "content": prompt}], max_tokens=400)
    return {"feedback": r.choices[0].message.content.strip()}