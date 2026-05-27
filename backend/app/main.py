from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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
    SolicitudTerminal, RespuestaTerminal
)
 
load_dotenv()
cliente_openai = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
Base.metadata.create_all(bind=engine)
 
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
 
def obtener_bd():
    bd = SesionLocal()
    try:
        yield bd
    finally:
        bd.close()
 
 
def registrar_accion(bd: Session, comando: str, resultado: str, usuario_id: int | None = None):
    bd.add(AccionUsuario(comando=comando, resultado=resultado, usuario_id=usuario_id))
    bd.commit()
 
 
def obtener_usuario_por_nombre(bd: Session, nombre: str) -> Usuario | None:
    return bd.query(Usuario).filter(Usuario.nombre_usuario == nombre).first()
 
 
def exigir_rol(usuario: Usuario | None, roles: list[str]):
    if not usuario or usuario.rol not in roles:
        raise HTTPException(status_code=403, detail="No autorizado")
 
 
def asegurar_columna_rol():
    with engine.connect() as conn:
        cols = conn.execute(text("PRAGMA table_info(usuarios)")).fetchall()
        if "rol" not in [c[1] for c in cols]:
            conn.execute(text("ALTER TABLE usuarios ADD COLUMN rol TEXT NOT NULL DEFAULT 'estudiante'"))
            conn.commit()
 
 
# ── Variables aleatorias ─────────────────────────────────────────────────────
 
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
 
 
# ── Narrativas: 5 para fuerza bruta, 5 para escaneo ─────────────────────────
 
PLANTILLAS_FB = [
    {
        "nombre": "Fuerza bruta: ataque SSH corporativo",
        "narrativa": (
            "El sistema de monitoreo de {{empresa}} ha detectado múltiples intentos de autenticación "
            "fallidos contra el servicio {{servicio}} desde la dirección {{ip_atacante}}. "
            "El objetivo parece ser la cuenta privilegiada '{{usuario_objetivo}}'. "
            "Se han registrado más de 10 intentos en menos de 30 segundos, lo que indica automatización. "
            "Analiza las alertas y eventos, luego contén el ataque bloqueando la IP origen."
        )
    },
    {
        "nombre": "Fuerza bruta: acceso a panel de administración",
        "narrativa": (
            "Se detectó actividad inusual en el panel de administración de {{empresa}}. "
            "Un agente externo desde {{ip_atacante}} intenta obtener acceso al servicio {{servicio}} "
            "mediante un ataque automatizado contra el usuario '{{usuario_objetivo}}'. "
            "Los registros muestran intentos con diccionario de contraseñas comunes. "
            "Tu misión: revisar evidencia, identificar el origen y bloquearlo."
        )
    },
    {
        "nombre": "Fuerza bruta: credenciales de servicio crítico",
        "narrativa": (
            "Alerta de seguridad en {{empresa}}: el servicio {{servicio}} reporta actividad sospechosa. "
            "La IP {{ip_atacante}} ha generado múltiples errores de autenticación contra '{{usuario_objetivo}}'. "
            "El patrón sugiere uso de herramientas automatizadas tipo Hydra o Medusa. "
            "Revisa los eventos del sistema, valida las alertas generadas y aplica la medida de contención."
        )
    },
    {
        "nombre": "Fuerza bruta: enumeración de cuentas válidas",
        "narrativa": (
            "El equipo de seguridad de {{empresa}} notificó comportamiento anómalo en {{servicio}}. "
            "Desde {{ip_atacante}} se realizan intentos de autenticación con múltiples variantes "
            "del usuario '{{usuario_objetivo}}'. Este patrón es típico de ataques de enumeración. "
            "Analiza las alertas activas, examina el log de eventos y bloquea la IP atacante."
        )
    },
    {
        "nombre": "Fuerza bruta: ataque de baja velocidad (slow brute)",
        "narrativa": (
            "Se detectó un ataque de fuerza bruta de baja velocidad en {{empresa}}. "
            "La IP {{ip_atacante}} envía intentos contra {{servicio}} con intervalos calculados "
            "para evadir umbrales básicos, apuntando a la cuenta '{{usuario_objetivo}}'. "
            "El sistema lo identificó por acumulación progresiva de fallos. "
            "Revisa la evidencia, confirma el patrón y bloquea el origen."
        )
    },
]
 
PLANTILLAS_EP = [
    {
        "nombre": "Escaneo de puertos: reconocimiento inicial",
        "narrativa": (
            "Se detectó actividad de reconocimiento de red en {{empresa}}. "
            "La IP {{ip_atacante}} está realizando un escaneo sobre los puertos {{puertos}} del host interno. "
            "Este tipo de actividad suele preceder a un ataque más específico. "
            "Revisa los eventos, confirma el patrón de reconocimiento y contén la amenaza."
        )
    },
    {
        "nombre": "Escaneo de puertos: barrido SYN sigiloso",
        "narrativa": (
            "El IDS de {{empresa}} registró múltiples paquetes SYN sin completar el handshake TCP. "
            "La fuente es {{ip_atacante}} y los puertos objetivo son {{puertos}}. "
            "Este patrón corresponde a un escaneo SYN (half-open) típico de herramientas como Nmap. "
            "Analiza los eventos, revisa las alertas generadas e impide que el atacante continúe."
        )
    },
    {
        "nombre": "Escaneo de puertos: detección de servicios expuestos",
        "narrativa": (
            "Un agente desde {{ip_atacante}} sondea la red de {{empresa}} "
            "intentando identificar servicios activos en los puertos {{puertos}}. "
            "Los registros muestran solicitudes de banner grabbing para determinar versiones de software. "
            "Esta fase de reconocimiento activo debe contenerse de inmediato: alertas, eventos, bloqueo."
        )
    },
    {
        "nombre": "Escaneo de puertos: barrido UDP",
        "narrativa": (
            "Se detectó un barrido de puertos UDP desde {{ip_atacante}} hacia activos de {{empresa}}. "
            "Los puertos afectados incluyen {{puertos}}. "
            "Los escaneos UDP apuntan a servicios como DNS, SNMP o NTP y son difíciles de detectar. "
            "El patrón fue capturado por correlación de logs. Analiza alertas, revisa eventos y bloquea."
        )
    },
    {
        "nombre": "Escaneo de puertos: fingerprinting de sistema operativo",
        "narrativa": (
            "El sistema de monitoreo de {{empresa}} detectó intentos de fingerprinting desde {{ip_atacante}}. "
            "El atacante sondea los puertos {{puertos}} con paquetes especialmente crafteados "
            "para identificar el sistema operativo del host objetivo. "
            "Revisa alertas y eventos para confirmar la amenaza y bloquea la IP."
        )
    },
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
            max_tokens=300,
            temperature=0.7
        )
        texto = resp.choices[0].message.content.strip()
        return texto if texto else narrativa_base
    except Exception as e:
        print(f"[IA] Narrativa no enriquecida: {e}")
        return narrativa_base
 
 
# ── Helpers de escenario ─────────────────────────────────────────────────────
 
def obtener_instancia_activa_usuario(bd: Session, usuario_id: int):
    rel = bd.query(EscenarioActivoUsuario).filter(
        EscenarioActivoUsuario.usuario_id == usuario_id
    ).first()
    if not rel:
        return None, None
    inst = bd.query(EscenarioInstancia).filter(EscenarioInstancia.id == rel.instancia_id).first()
    return rel, inst
 
 
def crear_nuevo_escenario(bd: Session, usuario: Usuario, ejercicio_id: int, plantillas_data: list):
    rel, inst_anterior = obtener_instancia_activa_usuario(bd, usuario.id)
    if inst_anterior and inst_anterior.estado == "activo":
        inst_anterior.estado = "cerrado"
        bd.commit()
 
    pd = random.choice(plantillas_data)
 
    plantilla = bd.query(PlantillaEscenario).filter(
        PlantillaEscenario.nombre == pd["nombre"]
    ).first()
    if not plantilla:
        raise HTTPException(status_code=500, detail=f"Plantilla no encontrada: {pd['nombre']}")
 
    defs = bd.query(VariablePlantilla).filter(VariablePlantilla.plantilla_id == plantilla.id).all()
    vars_val = {}
    regla_fn = {
        "ip_privada": _ip,
        "usuario_comun": _usuario,
        "servicio_comun": _servicio,
        "puertos_comunes": _puertos,
        "empresa": _empresa,
    }
    for v in defs:
        fn = regla_fn.get(v.regla)
        vars_val[v.clave] = fn() if fn else "N/D"
 
    narrativa_base = _render(pd["narrativa"], vars_val)
    narrativa_final = _enriquecer_ia(narrativa_base, vars_val, plantilla.tipo)
 
    inst = EscenarioInstancia(
        plantilla_id=plantilla.id,
        ejercicio_id=ejercicio_id,
        usuario_id=usuario.id,
        titulo_caso=f"Caso activo: {pd['nombre']}",
        texto_caso=narrativa_final,
        estado="activo"
    )
    bd.add(inst)
    bd.commit()
    bd.refresh(inst)
 
    bd.add_all([VariableInstancia(instancia_id=inst.id, clave=k, valor=str(v)) for k, v in vars_val.items()])
    bd.commit()
 
    if rel:
        rel.instancia_id = inst.id
        bd.commit()
    else:
        bd.add(EscenarioActivoUsuario(usuario_id=usuario.id, instancia_id=inst.id))
        bd.commit()
 
    return inst, vars_val
 
 
# ── Siembra de contenido ─────────────────────────────────────────────────────
 
def sembrar_contenido_si_falta(bd: Session):
    if bd.query(Curso).first():
        return
 
    curso = Curso(
        titulo="CyberLab: Fundamentos y práctica progresiva",
        descripcion="Curso base con niveles secuenciales (teoría + práctica).",
        nivel="Base", activo=True
    )
    bd.add(curso)
    bd.commit()
    bd.refresh(curso)
 
    secciones = [
        ("introduccion","Introducción"),("objetivos","Objetivos del nivel"),
        ("fundamentos","Fundamentos teóricos"),("metodologia","Metodología de trabajo"),
        ("comandos","Comandos y explicación"),("evidencia","Evidencia y análisis"),
        ("procedimiento","Procedimiento guiado"),("errores","Errores comunes"),
        ("buenas_practicas","Buenas prácticas"),("criterio","Criterio de aprobación"),
    ]
    niveles = [
        (1,"Introducción y fundamentos"),(2,"Fuerza bruta y control de acceso"),
        (3,"Reconocimiento y escaneo de puertos"),(4,"Inyección SQL: detección y mitigación"),
        (5,"XSS: análisis y prevención"),(6,"Defensa: contención y hardening básico"),
        (7,"Defensa: monitoreo, eventos y alertas"),
    ]
 
    for orden_cap, titulo_cap in niveles:
        cap = Capitulo(curso_id=curso.id, titulo=f"Nivel {orden_cap}: {titulo_cap}", orden=orden_cap)
        bd.add(cap)
        bd.commit()
        bd.refresh(cap)
        for i, (id_md, titulo_lec) in enumerate(secciones, 1):
            bd.add(Leccion(
                capitulo_id=cap.id, titulo=titulo_lec, tipo="teoria", orden=i,
                ruta_contenido=f"/contenidos/informacion/nivel{orden_cap}/{id_md}.md"
            ))
        bd.commit()
 
    # 5 ejercicios por tipo
    cap1 = bd.query(Capitulo).filter(Capitulo.curso_id == curso.id, Capitulo.orden == 1).first()
    lec1 = bd.query(Leccion).filter(Leccion.capitulo_id == cap1.id).order_by(Leccion.orden.desc()).first()
    for i in range(1, 6):
        bd.add(Ejercicio(
            leccion_id=lec1.id,
            descripcion=f"Práctica Fuerza Bruta #{i}: análisis y contención (variante {i})",
            tipo="ataque", comandos_objetivo=10, tiempo_limite_seg=300
        ))
    bd.commit()
 
    cap2 = bd.query(Capitulo).filter(Capitulo.curso_id == curso.id, Capitulo.orden == 2).first()
    lec2 = bd.query(Leccion).filter(Leccion.capitulo_id == cap2.id).order_by(Leccion.orden.desc()).first()
    for i in range(1, 6):
        bd.add(Ejercicio(
            leccion_id=lec2.id,
            descripcion=f"Práctica Escaneo de Puertos #{i}: detección y respuesta (variante {i})",
            tipo="defensa", comandos_objetivo=10, tiempo_limite_seg=300
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
        plant = PlantillaEscenario(
            ejercicio_id=id_fb, nombre=pd["nombre"],
            tipo="fuerza_bruta", narrativa_base=pd["narrativa"], activo=True
        )
        bd.add(plant); bd.commit(); bd.refresh(plant)
        bd.add_all([
            VariablePlantilla(plantilla_id=plant.id, clave="ip_atacante", descripcion="IP origen", regla="ip_privada"),
            VariablePlantilla(plantilla_id=plant.id, clave="usuario_objetivo", descripcion="Cuenta objetivo", regla="usuario_comun"),
            VariablePlantilla(plantilla_id=plant.id, clave="servicio", descripcion="Servicio atacado", regla="servicio_comun"),
            VariablePlantilla(plantilla_id=plant.id, clave="empresa", descripcion="Empresa ficticia", regla="empresa"),
        ])
        bd.commit()
 
    for pd in PLANTILLAS_EP:
        plant = PlantillaEscenario(
            ejercicio_id=id_ep, nombre=pd["nombre"],
            tipo="escaneo_puertos", narrativa_base=pd["narrativa"], activo=True
        )
        bd.add(plant); bd.commit(); bd.refresh(plant)
        bd.add_all([
            VariablePlantilla(plantilla_id=plant.id, clave="ip_atacante", descripcion="IP origen", regla="ip_privada"),
            VariablePlantilla(plantilla_id=plant.id, clave="puertos", descripcion="Puertos escaneados", regla="puertos_comunes"),
            VariablePlantilla(plantilla_id=plant.id, clave="empresa", descripcion="Empresa ficticia", regla="empresa"),
        ])
        bd.commit()
 
 
# ── Startup ──────────────────────────────────────────────────────────────────
 
@app.on_event("startup")
def iniciar_sistema():
    asegurar_columna_rol()
    bd = SesionLocal()
    admin = bd.query(Usuario).filter(Usuario.nombre_usuario == "admin").first()
    if not admin:
        bd.add(Usuario(nombre_usuario="admin", contrasena="admin123", rol="admin"))
        bd.commit()
    elif admin.rol != "admin":
        admin.rol = "admin"; bd.commit()
    sembrar_contenido_si_falta(bd)
    seed_plantillas(bd)
    bd.close()
 
 
# ── Auth ─────────────────────────────────────────────────────────────────────
 
@app.get("/")
def raiz():
    return {"mensaje": "Backend funcionando"}
 
@app.post("/iniciar-sesion")
def iniciar_sesion(datos: SolicitudInicioSesion, bd: Session = Depends(obtener_bd)):
    u = bd.query(Usuario).filter(
        Usuario.nombre_usuario == datos.nombre_usuario,
        Usuario.contrasena == datos.contrasena
    ).first()
    if not u:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    return {"mensaje": "Inicio de sesión correcto", "nombre_usuario": u.nombre_usuario, "rol": u.rol}
 
@app.post("/registrar")
def registrar_estudiante(datos: SolicitudRegistroEstudiante, bd: Session = Depends(obtener_bd)):
    if bd.query(Usuario).filter(Usuario.nombre_usuario == datos.nombre_usuario).first():
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    bd.add(Usuario(nombre_usuario=datos.nombre_usuario, contrasena=datos.contrasena, rol="estudiante"))
    bd.commit()
    return {"mensaje": "Registro completado (estudiante)"}
 
 
# ── Admin ─────────────────────────────────────────────────────────────────────
 
@app.post("/admin/crear-usuario")
def admin_crear_usuario(datos: SolicitudCrearUsuario, bd: Session = Depends(obtener_bd)):
    admin = obtener_usuario_por_nombre(bd, datos.nombre_usuario_admin)
    exigir_rol(admin, ["admin"])
    rol = (datos.rol or "").strip().lower()
    if rol not in ["estudiante", "docente"]:
        raise HTTPException(status_code=400, detail="Rol inválido")
    if obtener_usuario_por_nombre(bd, datos.nombre_usuario):
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    bd.add(Usuario(nombre_usuario=datos.nombre_usuario, contrasena=datos.contrasena, rol=rol))
    bd.commit()
    return {"mensaje": f"Usuario creado ({rol})"}
 
@app.get("/admin/usuarios", response_model=list[RespuestaUsuario])
def admin_listar_usuarios(nombre_usuario: str, bd: Session = Depends(obtener_bd)):
    u = obtener_usuario_por_nombre(bd, nombre_usuario)
    exigir_rol(u, ["admin"])
    return bd.query(Usuario).order_by(Usuario.id.asc()).all()
 
@app.post("/admin/curso")
def admin_crear_curso(datos: SolicitudCrearCurso, bd: Session = Depends(obtener_bd)):
    u = obtener_usuario_por_nombre(bd, datos.nombre_usuario)
    exigir_rol(u, ["admin", "docente"])
    curso = Curso(titulo=datos.titulo, descripcion=datos.descripcion, nivel=datos.nivel,
                  activo=True, creado_por_usuario_id=u.id)
    bd.add(curso); bd.commit(); bd.refresh(curso)
    return {"mensaje": "Curso creado", "curso_id": curso.id}
 
@app.post("/admin/capitulo")
def admin_crear_capitulo(datos: SolicitudCrearCapitulo, bd: Session = Depends(obtener_bd)):
    u = obtener_usuario_por_nombre(bd, datos.nombre_usuario)
    exigir_rol(u, ["admin", "docente"])
    if not bd.query(Curso).filter(Curso.id == datos.curso_id).first():
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    cap = Capitulo(curso_id=datos.curso_id, titulo=datos.titulo, orden=datos.orden)
    bd.add(cap); bd.commit(); bd.refresh(cap)
    return {"mensaje": "Capítulo creado", "capitulo_id": cap.id}
 
@app.post("/admin/leccion")
def admin_crear_leccion(datos: SolicitudCrearLeccion, bd: Session = Depends(obtener_bd)):
    u = obtener_usuario_por_nombre(bd, datos.nombre_usuario)
    exigir_rol(u, ["admin", "docente"])
    if not bd.query(Capitulo).filter(Capitulo.id == datos.capitulo_id).first():
        raise HTTPException(status_code=404, detail="Capítulo no encontrado")
    lec = Leccion(capitulo_id=datos.capitulo_id, titulo=datos.titulo, tipo=datos.tipo,
                  orden=datos.orden, ruta_contenido=datos.ruta_contenido)
    bd.add(lec); bd.commit(); bd.refresh(lec)
    return {"mensaje": "Lección creada", "leccion_id": lec.id}
 
@app.post("/admin/ejercicio")
def admin_crear_ejercicio(datos: SolicitudCrearEjercicio, bd: Session = Depends(obtener_bd)):
    u = obtener_usuario_por_nombre(bd, datos.nombre_usuario)
    exigir_rol(u, ["admin", "docente"])
    if not bd.query(Leccion).filter(Leccion.id == datos.leccion_id).first():
        raise HTTPException(status_code=404, detail="Lección no encontrada")
    ej = Ejercicio(leccion_id=datos.leccion_id, descripcion=datos.descripcion, tipo=datos.tipo,
                   comandos_objetivo=datos.comandos_objetivo, tiempo_limite_seg=datos.tiempo_limite_seg)
    bd.add(ej); bd.commit(); bd.refresh(ej)
    return {"mensaje": "Ejercicio creado", "ejercicio_id": ej.id}
 
 
# ── Estructura y progreso ─────────────────────────────────────────────────────
 
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
                lecs.append({
                    "id": lec.id, "titulo": lec.titulo, "tipo": lec.tipo,
                    "orden": lec.orden, "ruta_contenido": lec.ruta_contenido,
                    "ejercicios": [{"id": e.id, "descripcion": e.descripcion, "tipo": e.tipo,
                                    "comandos_objetivo": e.comandos_objetivo, "tiempo_limite_seg": e.tiempo_limite_seg}
                                   for e in ejs]
                })
            caps.append({"id": cap.id, "titulo": cap.titulo, "orden": cap.orden, "lecciones": lecs})
        salida.append({"id": c.id, "titulo": c.titulo, "descripcion": c.descripcion,
                        "nivel": c.nivel, "activo": c.activo, "capitulos": caps})
    return {"cursos": salida}
 
@app.post("/progreso/actualizar")
def actualizar_progreso(datos: SolicitudActualizarProgreso, bd: Session = Depends(obtener_bd)):
    u = obtener_usuario_por_nombre(bd, datos.nombre_usuario)
    if not u: raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not bd.query(Leccion).filter(Leccion.id == datos.leccion_id).first():
        raise HTTPException(status_code=404, detail="Lección no encontrada")
    pct = max(0, min(100, int(datos.porcentaje)))
    reg = bd.query(ProgresoUsuario).filter(
        ProgresoUsuario.usuario_id == u.id, ProgresoUsuario.leccion_id == datos.leccion_id
    ).first()
    if reg:
        if pct > reg.porcentaje: reg.porcentaje = pct
        reg.completado = reg.porcentaje >= 100
        bd.commit()
        return {"mensaje": "Progreso actualizado", "porcentaje": reg.porcentaje, "completado": reg.completado}
    reg = ProgresoUsuario(usuario_id=u.id, leccion_id=datos.leccion_id, porcentaje=pct, completado=pct >= 100)
    bd.add(reg); bd.commit()
    return {"mensaje": "Progreso creado", "porcentaje": reg.porcentaje, "completado": reg.completado}
 
@app.get("/progreso/{nombre_usuario}")
def obtener_progreso_usuario(nombre_usuario: str, bd: Session = Depends(obtener_bd)):
    u = bd.query(Usuario).filter(Usuario.nombre_usuario == nombre_usuario).first()
    if not u: raise HTTPException(status_code=404, detail="Usuario no encontrado")
    registros = bd.query(ProgresoUsuario).filter(ProgresoUsuario.usuario_id == u.id).all()
    return {
        "nombre_usuario": u.nombre_usuario, "rol": u.rol,
        "progreso": [{"leccion_id": r.leccion_id, "porcentaje": r.porcentaje,
                      "completado": r.completado,
                      "ultima_actualizacion": r.ultima_actualizacion.isoformat() if r.ultima_actualizacion else None}
                     for r in registros]
    }
 
 # ── Agregar este endpoint en main.py, junto a los otros endpoints de /progreso ──
# Ubicación sugerida: después de GET /progreso/{nombre_usuario}

@app.get("/progreso/laboratorio/{nombre_usuario}")
def obtener_niveles_desbloqueados(nombre_usuario: str, bd: Session = Depends(obtener_bd)):
    """
    Retorna qué niveles del laboratorio (práctica) tiene completados el usuario.
    Un nivel se considera completado cuando tiene >= 5 intentos aprobados en ese nivel.
    Usa la misma lógica que el dashboard para calcular el progreso real.
    """
    u = bd.query(Usuario).filter(Usuario.nombre_usuario == nombre_usuario).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    TOTAL_EJ = 5

    # Obtener todos los intentos aprobados del usuario
    intentos_aprobados = bd.query(IntentoEjercicio).filter(
        IntentoEjercicio.usuario_id == u.id,
        IntentoEjercicio.estado == "aprobado"
    ).all()

    # Obtener la estructura de cursos para mapear ejercicio_id → nivel (capitulo.orden)
    cursos = bd.query(Curso).all()
    mapa_ej_nivel = {}  # ejercicio_id -> nivel (1-7)

    for curso in cursos:
        capitulos = bd.query(Capitulo).filter(
            Capitulo.curso_id == curso.id
        ).order_by(Capitulo.orden.asc()).all()

        for cap in capitulos:
            nivel = cap.orden  # orden del capítulo = número de nivel (1-7)
            lecciones = bd.query(Leccion).filter(
                Leccion.capitulo_id == cap.id
            ).all()
            for lec in lecciones:
                ejercicios = bd.query(Ejercicio).filter(
                    Ejercicio.leccion_id == lec.id
                ).all()
                for ej in ejercicios:
                    mapa_ej_nivel[ej.id] = nivel

    # Contar intentos aprobados por nivel
    conteo_por_nivel = {n: 0 for n in range(1, 8)}
    for intento in intentos_aprobados:
        nivel = mapa_ej_nivel.get(intento.ejercicio_id)
        if nivel and 1 <= nivel <= 7:
            conteo_por_nivel[nivel] += 1

    # Un nivel está completado si tiene >= TOTAL_EJ intentos aprobados
    niveles_completados = [
        n for n, count in conteo_por_nivel.items()
        if count >= TOTAL_EJ
    ]

    return {
        "nombre_usuario": u.nombre_usuario,
        "niveles_completados": niveles_completados,
        "detalle": {
            str(n): {
                "completados": min(conteo_por_nivel[n], TOTAL_EJ),
                "total": TOTAL_EJ,
                "completo": conteo_por_nivel[n] >= TOTAL_EJ
            }
            for n in range(1, 8)
        }
    }
 
# ── Intentos ──────────────────────────────────────────────────────────────────
 
@app.post("/intentos/crear")
def crear_intento(datos: SolicitudCrearIntento, bd: Session = Depends(obtener_bd)):
    u = obtener_usuario_por_nombre(bd, datos.nombre_usuario)
    if not u: raise HTTPException(status_code=404, detail="Usuario no encontrado")
    ej = bd.query(Ejercicio).filter(Ejercicio.id == datos.ejercicio_id).first()
    if not ej: raise HTTPException(status_code=404, detail="Ejercicio no encontrado")
 
    ayudas = bd.query(AccionUsuario).filter(
        AccionUsuario.usuario_id == u.id,
        AccionUsuario.comando == "pedir-ayuda"
    ).count()
 
    intento = IntentoEjercicio(
        usuario_id=u.id, ejercicio_id=datos.ejercicio_id,
        tiempo_seg=int(datos.tiempo_seg), errores=int(datos.errores) + ayudas,
        porcentaje=int(datos.porcentaje), estado=datos.estado
    )
    bd.add(intento); bd.commit(); bd.refresh(intento)
    return {"mensaje": "Intento registrado", "intento_id": intento.id, "ayudas_pedidas": ayudas}
 
@app.get("/docente/intentos")
def docente_listar_intentos(nombre_usuario_docente: str, bd: Session = Depends(obtener_bd)):
    docente = obtener_usuario_por_nombre(bd, nombre_usuario_docente)
    exigir_rol(docente, ["admin", "docente"])
 
    intentos = bd.query(IntentoEjercicio).order_by(IntentoEjercicio.id.desc()).limit(200).all()
    salida = []
    for it in intentos:
        u  = bd.query(Usuario).filter(Usuario.id == it.usuario_id).first()
        ej = bd.query(Ejercicio).filter(Ejercicio.id == it.ejercicio_id).first()
 
        # Contar ayudas reales de ESTE intento específico
        # Las ayudas se registran como AccionUsuario con comando="pedir-ayuda"
        # entre la fecha_inicio del intento y su fecha_fin (o ahora si no tiene)
        from datetime import datetime, timezone
        fecha_fin_ref = it.fecha_fin or datetime.now(timezone.utc)
        ayudas = bd.query(AccionUsuario).filter(
            AccionUsuario.usuario_id == it.usuario_id,
            AccionUsuario.comando == "pedir-ayuda",
            AccionUsuario.fecha_creacion >= it.fecha_inicio,
            AccionUsuario.fecha_creacion <= fecha_fin_ref
        ).count()
 
        # Nota de la evaluación si existe
        nota_eval = None
        if it.evaluacion:
            nota_eval = it.evaluacion.nota
 
        salida.append({
            "intento_id":           it.id,
            "usuario":              u.nombre_usuario if u else None,
            "ejercicio_id":         it.ejercicio_id,
            "estado":               it.estado,
            "porcentaje":           it.porcentaje,
            "tiempo_seg":           it.tiempo_seg,
            "errores":              it.errores,
            "ayudas_pedidas":       ayudas,
            "tiene_evaluacion":     it.evaluacion is not None,
            "nota":                 nota_eval,
            "descripcion_ejercicio":ej.descripcion if ej else None,
            "fecha_inicio":         it.fecha_inicio.isoformat() if it.fecha_inicio else None,
            "fecha_fin":            it.fecha_fin.isoformat() if it.fecha_fin else None,
        })
    return {"intentos": salida}

    # Endpoint nuevo para que el estudiante vea sus propias evaluaciones
@app.get("/mis-evaluaciones")
def mis_evaluaciones(nombre_usuario: str, bd: Session = Depends(obtener_bd)):
    usuario = obtener_usuario_por_nombre(bd, nombre_usuario)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
 
    intentos = bd.query(IntentoEjercicio).filter(
        IntentoEjercicio.usuario_id == usuario.id
    ).order_by(IntentoEjercicio.id.desc()).all()
 
    salida = []
    for it in intentos:
        ej = bd.query(Ejercicio).filter(Ejercicio.id == it.ejercicio_id).first()
 
        from datetime import datetime, timezone
        fecha_fin_ref = it.fecha_fin or datetime.now(timezone.utc)
        ayudas = bd.query(AccionUsuario).filter(
            AccionUsuario.usuario_id == it.usuario_id,
            AccionUsuario.comando == "pedir-ayuda",
            AccionUsuario.fecha_creacion >= it.fecha_inicio,
            AccionUsuario.fecha_creacion <= fecha_fin_ref
        ).count()
 
        eval_data = None
        if it.evaluacion:
            eval_data = {
                "nota":        it.evaluacion.nota,
                "comentarios": it.evaluacion.comentarios,
                "fecha":       it.evaluacion.fecha.isoformat() if it.evaluacion.fecha else None,
            }
 
        salida.append({
            "intento_id":           it.id,
            "ejercicio_id":         it.ejercicio_id,
            "descripcion_ejercicio":ej.descripcion if ej else None,
            "estado":               it.estado,
            "porcentaje":           it.porcentaje,
            "tiempo_seg":           it.tiempo_seg,
            "errores":              it.errores,
            "ayudas_pedidas":       ayudas,
            "fecha_inicio":         it.fecha_inicio.isoformat() if it.fecha_inicio else None,
            "evaluacion":           eval_data,
        })
 
    return {"intentos": salida}
 
 
@app.get("/docente/intentos/{intento_id}")
def docente_detalle_intento(intento_id: int, nombre_usuario_docente: str, bd: Session = Depends(obtener_bd)):
    docente = obtener_usuario_por_nombre(bd, nombre_usuario_docente)
    exigir_rol(docente, ["admin", "docente"])
    it = bd.query(IntentoEjercicio).filter(IntentoEjercicio.id == intento_id).first()
    if not it: raise HTTPException(status_code=404, detail="Intento no encontrado")
    u = bd.query(Usuario).filter(Usuario.id == it.usuario_id).first()
    ej = bd.query(Ejercicio).filter(Ejercicio.id == it.ejercicio_id).first()
    ayudas = bd.query(AccionUsuario).filter(
        AccionUsuario.usuario_id == it.usuario_id, AccionUsuario.comando == "pedir-ayuda"
    ).count()
    evaluacion = None
    if it.evaluacion:
        evaluacion = {"id": it.evaluacion.id, "docente_id": it.evaluacion.docente_id,
                      "nota": it.evaluacion.nota, "comentarios": it.evaluacion.comentarios,
                      "fecha": it.evaluacion.fecha}
    return {"intento": {
        "id": it.id, "usuario": u.nombre_usuario if u else None, "usuario_id": it.usuario_id,
        "ejercicio_id": it.ejercicio_id, "descripcion_ejercicio": ej.descripcion if ej else None,
        "tipo_ejercicio": ej.tipo if ej else None, "estado": it.estado,
        "porcentaje": it.porcentaje, "tiempo_seg": it.tiempo_seg,
        "errores": it.errores, "ayudas_pedidas": ayudas,
        "fecha_inicio": it.fecha_inicio, "fecha_fin": it.fecha_fin, "evaluacion": evaluacion
    }}
 
@app.post("/docente/evaluar")
def docente_evaluar_intento(datos: SolicitudEvaluarIntento, bd: Session = Depends(obtener_bd)):
    docente = obtener_usuario_por_nombre(bd, datos.nombre_usuario_docente)
    exigir_rol(docente, ["admin", "docente"])
    intento = bd.query(IntentoEjercicio).filter(IntentoEjercicio.id == datos.intento_id).first()
    if not intento: raise HTTPException(status_code=404, detail="Intento no encontrado")
    existente = bd.query(EvaluacionDocente).filter(EvaluacionDocente.intento_id == intento.id).first()
    if existente:
        existente.nota = float(datos.nota); existente.comentarios = datos.comentarios; bd.commit()
        return {"mensaje": "Evaluación actualizada"}
    bd.add(EvaluacionDocente(intento_id=intento.id, docente_id=docente.id,
                              nota=float(datos.nota), comentarios=datos.comentarios))
    bd.commit()
    return {"mensaje": "Evaluación creada"}
 
 
# ── Simulaciones (siempre nuevo escenario) ────────────────────────────────────
 
@app.post("/simular/fuerza-bruta")
def simular_fuerza_bruta(body: SolicitudSimular, bd: Session = Depends(obtener_bd)):
    usuario = obtener_usuario_por_nombre(bd, body.nombre_usuario)
    if not usuario: raise HTTPException(status_code=404, detail="Usuario no existe")
 
    ejercicios = bd.query(Ejercicio).filter(Ejercicio.tipo == "ataque").all()
    if not ejercicios: raise HTTPException(status_code=500, detail="Sin ejercicios de tipo ataque")
    ejercicio = random.choice(ejercicios)
 
    inst, vars_val = crear_nuevo_escenario(bd, usuario, ejercicio.id, PLANTILLAS_FB)
    ip = vars_val.get("ip_atacante", "192.168.1.100")
    servicio = vars_val.get("servicio", "ssh")
    usuario_objetivo = vars_val.get("usuario_objetivo", "admin")
 
    for i in range(1, 11):
        bd.add(Evento(
            tipo_evento="Fuerza Bruta", ip_origen=ip,
            descripcion=f"Intento fallido #{i} en {servicio} contra cuenta '{usuario_objetivo}'"
        ))
    bd.commit()
 
    total = bd.query(Evento).filter(Evento.ip_origen == ip, Evento.tipo_evento == "Fuerza Bruta").count()
    if total >= 5:
        bd.add(Alerta(
            titulo="Ataque de fuerza bruta detectado", severidad="Alta",
            descripcion=f"{total} intentos fallidos desde {ip} en {servicio} (cuenta: {usuario_objetivo})"
        ))
        bd.commit()
 
    registrar_accion(bd, "simular fuerza-bruta", "OK", usuario_id=usuario.id)
    return {
        "mensaje": f"Simulación ejecutada — {total} intentos detectados desde {ip}",
        "tipo_ataque": "Fuerza Bruta", "ip": ip,
        "ejercicio_id": ejercicio.id, "id": inst.id, "plantilla_id": inst.plantilla_id,
        "titulo_caso": inst.titulo_caso, "texto_caso": inst.texto_caso,
        "variables": [{"clave": k, "valor": v} for k, v in vars_val.items()],
        "siguiente_paso": "Usa 'show alerts' para comenzar el análisis."
    }
 
@app.post("/simular/escaneo-puertos")
def simular_escaneo_puertos(body: SolicitudSimular, bd: Session = Depends(obtener_bd)):
    usuario = obtener_usuario_por_nombre(bd, body.nombre_usuario)
    if not usuario: raise HTTPException(status_code=404, detail="Usuario no existe")
 
    ejercicios = bd.query(Ejercicio).filter(Ejercicio.tipo == "defensa").all()
    if not ejercicios: raise HTTPException(status_code=500, detail="Sin ejercicios de tipo defensa")
    ejercicio = random.choice(ejercicios)
 
    inst, vars_val = crear_nuevo_escenario(bd, usuario, ejercicio.id, PLANTILLAS_EP)
    ip = vars_val.get("ip_atacante", "192.168.1.100")
    puertos = vars_val.get("puertos", "22, 80, 443")
 
    for puerto in puertos.replace(" ", "").split(","):
        bd.add(Evento(
            tipo_evento="Escaneo de Puertos", ip_origen=ip,
            descripcion=f"Sonda detectada en puerto {puerto.strip()} desde {ip}"
        ))
    bd.commit()
 
    total = bd.query(Evento).filter(Evento.ip_origen == ip, Evento.tipo_evento == "Escaneo de Puertos").count()
    if total >= 3:
        bd.add(Alerta(
            titulo="Reconocimiento de red detectado", severidad="Media",
            descripcion=f"Escaneo de puertos ({puertos}) detectado desde {ip}"
        ))
        bd.commit()
 
    registrar_accion(bd, "simular escaneo-puertos", "OK", usuario_id=usuario.id)
    return {
        "mensaje": f"Simulación ejecutada — escaneo en puertos {puertos} desde {ip}",
        "tipo_ataque": "Escaneo de Puertos", "ip": ip,
        "ejercicio_id": ejercicio.id, "id": inst.id, "plantilla_id": inst.plantilla_id,
        "titulo_caso": inst.titulo_caso, "texto_caso": inst.texto_caso,
        "variables": [{"clave": k, "valor": v} for k, v in vars_val.items()],
        "siguiente_paso": "Usa 'show alerts' para comenzar el análisis."
    }
 
 
# ── Ayuda con penalización ────────────────────────────────────────────────────
 
@app.post("/escenario/pedir-ayuda")
def pedir_ayuda(body: dict, bd: Session = Depends(obtener_bd)):
    nombre_usuario = body.get("nombre_usuario", "")
    usuario = obtener_usuario_por_nombre(bd, nombre_usuario)
    if not usuario: raise HTTPException(status_code=404, detail="Usuario no existe")
 
    _, inst = obtener_instancia_activa_usuario(bd, usuario.id)
    if not inst: raise HTTPException(status_code=404, detail="No hay escenario activo")
 
    registrar_accion(bd, "pedir-ayuda", f"escenario_id={inst.id}", usuario_id=usuario.id)
 
    total_ayudas = bd.query(AccionUsuario).filter(
        AccionUsuario.usuario_id == usuario.id,
        AccionUsuario.comando == "pedir-ayuda"
    ).count()
 
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
 
    return {
        "hint": hint,
        "veces_pedida": total_ayudas,
        "penalizacion_porcentaje": penalizacion,
        "mensaje": f"Ayuda #{total_ayudas} solicitada. Penalización acumulada: -{penalizacion}% sobre la nota final."
    }
 
 
# ── Estadísticas y reporte ────────────────────────────────────────────────────
 
@app.get("/estadisticas")
def obtener_estadisticas(db: Session = Depends(obtener_bd)) -> Dict[str, Any]:
    return {
        "total_eventos": db.query(Evento).count(),
        "total_alertas": db.query(Alerta).count(),
        "eventos_recientes": [
            {"id": e.id, "tipo_evento": e.tipo_evento, "ip_origen": e.ip_origen,
             "descripcion": e.descripcion,
             "fecha_creacion": e.fecha_creacion.isoformat() if e.fecha_creacion else None}
            for e in db.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(10).all()
        ],
        "alertas_recientes": [
            {"id": a.id, "titulo": a.titulo, "severidad": a.severidad,
             "descripcion": a.descripcion, "evento_id": a.evento_id,
             "fecha_creacion": a.fecha_creacion.isoformat() if a.fecha_creacion else None}
            for a in db.query(Alerta).order_by(Alerta.fecha_creacion.desc()).limit(10).all()
        ],
    }
 
@app.get("/reporte")
def obtener_reporte(nombre_usuario: str = None, bd: Session = Depends(obtener_bd)):
    ips = bd.query(IpBloqueada).all()
    acciones = []
    if nombre_usuario:
        u = obtener_usuario_por_nombre(bd, nombre_usuario)
        if u:
            acciones = bd.query(AccionUsuario).filter(
                AccionUsuario.usuario_id == u.id
            ).order_by(AccionUsuario.fecha_creacion.desc()).limit(50).all()
    return {
        "total_eventos": bd.query(Evento).count(),
        "total_alertas": bd.query(Alerta).count(),
        "ips_bloqueadas": [{"direccion_ip": ip.direccion_ip, "motivo": ip.motivo} for ip in ips],
        "acciones": [{"comando": a.comando, "resultado": a.resultado} for a in acciones]
    }
 
 
# ── Feedback IA ───────────────────────────────────────────────────────────────
 
@app.post("/ia/feedback")
def ia_feedback(body: SolicitudFeedbackIA):
    prompt = (
        f"Eres un docente universitario de ciberseguridad en un laboratorio educativo controlado.\n"
        f"Explica el comando del estudiante de forma didáctica y breve.\n\n"
        f"Formato:\n1) Qué hizo el comando\n2) Si está bien o mal según la evidencia\n3) Qué revisar a continuación\n\n"
        f"Nivel: {body.nivel}\nComando: {body.comando}\n"
        f"Resultado: {body.resultado}\nEvidencia:\n{body.evidencia}"
    )
    r = cliente_openai.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=400
    )
    return {"feedback": r.choices[0].message.content.strip()}
 
 
# ── Terminal Kali-like ────────────────────────────────────────────────────────
 
# Este bloque reemplaza SOLO la función ejecutar_terminal en main.py
# Copia desde @app.post("/terminal") hasta el final del archivo

@app.post("/terminal", response_model=RespuestaTerminal)
def ejecutar_terminal(datos: SolicitudTerminal, bd: Session = Depends(obtener_bd)):
    usuario = bd.query(Usuario).filter(Usuario.nombre_usuario == datos.nombre_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no existe")

    raw   = (datos.comando or "").strip()
    cmd_l = raw.lower().strip()

    def guardar(res: str):
        bd.add(AccionUsuario(comando=raw, resultado=res, usuario_id=usuario.id))
        bd.commit()

    if not raw:
        guardar("ERROR")
        return {"salida": "bash: command not found"}

    alias = {
        "ayuda": "help", "estado": "status",
        "ver alertas": "show alerts", "ver eventos": "show events",
        "ver bloqueadas": "show blocked", "limpiar": "clear",
    }
    if cmd_l in alias:
        cmd_l = alias[cmd_l]

    partes = cmd_l.strip().split()
    base   = partes[0] if partes else ""

    # ── clear ──────────────────────────────────────────────────────────────────
    if base in ["clear", "cls"]:
        guardar("OK"); return {"salida": "__LIMPIAR__"}

    # ── help ───────────────────────────────────────────────────────────────────
    if base in ["help", "?", "man"]:
        guardar("OK")
        return {"salida": (
            "CyberLab Terminal (kali-like)\n"
            "Comandos disponibles:\n"
            "  help                    - este menú\n"
            "  whoami                  - usuario actual\n"
            "  pwd                     - directorio actual\n"
            "  ls                      - listar directorio\n"
            "  ip a / ifconfig         - interfaces de red\n"
            "  status                  - estado del laboratorio\n"
            "  history                 - historial de comandos\n"
            "  show alerts             - alertas del IDS\n"
            "  show events             - log de eventos\n"
            "  show blocked            - IPs bloqueadas\n"
            "  show services           - servicios detectados\n"
            "  show traffic            - tráfico de red\n"
            "  show banners            - banners de servicios\n"
            "  show vulnerabilities    - vulnerabilidades detectadas\n"
            "  show users              - usuarios del sistema\n"
            "  show sessions           - sesiones activas\n"
            "  show failed logins      - intentos fallidos de login\n"
            "  show processes          - procesos activos\n"
            "  show hosts              - hosts activos en la red\n"
            "  scan ports              - escaneo de puertos\n"
            "  resolve host            - resolver nombre de host\n"
            "  trace ip                - trazar ruta hacia IP\n"
            "  enumerate users         - enumerar usuarios del objetivo\n"
            "  enumerate services      - enumerar servicios del objetivo\n"
            "  export report           - exportar reporte de sesión\n"
            "  block ip <ip>           - bloquear IP\n"
            "  unblock ip <ip>         - desbloquear IP\n"
            "  clear                   - limpiar pantalla\n"
        )}

    # ── Comandos básicos ───────────────────────────────────────────────────────
    if cmd_l == "whoami":
        guardar("OK"); return {"salida": usuario.nombre_usuario}

    if cmd_l == "pwd":
        guardar("OK"); return {"salida": "/home/cyberlab"}

    if cmd_l in ["ls", "ls -la", "ls -l"]:
        guardar("OK")
        return {"salida": (
            "drwxr-xr-x  2 cyberlab cyberlab 4096 evidence/\n"
            "drwxr-xr-x  2 cyberlab cyberlab 4096 logs/\n"
            "drwxr-xr-x  2 cyberlab cyberlab 4096 reports/\n"
            "-rw-r--r--  1 cyberlab cyberlab  220 README.txt\n"
            "-rw-r--r--  1 cyberlab cyberlab 1024 incident.log\n"
        )}

    if cmd_l in ["ip a", "ip addr", "ifconfig", "show ip", "show ips"]:
        # FIX 1: mostrar la IP del escenario activo para que el estudiante sepa qué bloquear
        _, inst_activa = obtener_instancia_activa_usuario(bd, usuario.id)
        ip_atacante = None
        if inst_activa:
            var_ip = bd.query(VariableInstancia).filter(
                VariableInstancia.instancia_id == inst_activa.id,
                VariableInstancia.clave == "ip_atacante"
            ).first()
            if var_ip:
                ip_atacante = var_ip.valor

        salida_base = (
            "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\n"
            "    inet 127.0.0.1/8 scope host lo\n"
            "2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500\n"
            "    inet 192.168.1.10/24 brd 192.168.1.255 scope global eth0\n"
        )
        if ip_atacante:
            salida_base += (
                f"\n[IDS] Inbound traffic alert detected:\n"
                f"  → Source IP flagged: {ip_atacante}\n"
                f"  → This address is generating suspicious activity on your network.\n"
            )
        guardar("OK")
        return {"salida": salida_base}

    if cmd_l == "history":
        acciones = bd.query(AccionUsuario).filter(
            AccionUsuario.usuario_id == usuario.id
        ).order_by(AccionUsuario.fecha_creacion.desc()).limit(20).all()
        if not acciones:
            guardar("OK"); return {"salida": "No hay historial de comandos aún."}
        lineas = [f"  {i+1}  {a.comando}" for i, a in enumerate(reversed(acciones))]
        guardar("OK"); return {"salida": "\n".join(lineas)}

    # ── status ─────────────────────────────────────────────────────────────────
    if cmd_l == "status":
        total_e = bd.query(Evento).count()
        total_a = bd.query(Alerta).count()
        _, inst = obtener_instancia_activa_usuario(bd, usuario.id)
        bloq = bd.query(BloqueoEscenario).filter(
            BloqueoEscenario.escenario_id == inst.id
        ).count() if inst else 0
        guardar("OK")
        return {"salida": (
            f"System status: OK\n"
            f"events: {total_e}\nalerts: {total_a}\n"
            f"blocked_ips (scenario): {bloq}\nlab: operational\n"
        )}

    # ── show alerts ────────────────────────────────────────────────────────────
    if cmd_l == "show alerts":
        alertas = bd.query(Alerta).order_by(Alerta.fecha_creacion.desc()).limit(10).all()
        if not alertas:
            guardar("OK"); return {"salida": "No alerts registered."}
        lineas = [
            f"{a.fecha_creacion.isoformat() if a.fecha_creacion else 'N/A'} | {a.severidad} | {a.titulo} | {a.descripcion}"
            for a in alertas
        ]
        guardar("OK"); return {"salida": "\n".join(lineas)}

    # ── show events ────────────────────────────────────────────────────────────
    if cmd_l == "show events":
        eventos = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(10).all()
        if not eventos:
            guardar("OK"); return {"salida": "No events registered."}
        lineas = [
            f"{e.fecha_creacion.isoformat() if e.fecha_creacion else 'N/A'} | {e.tipo_evento} | src={e.ip_origen} | {e.descripcion}"
            for e in eventos
        ]
        guardar("OK"); return {"salida": "\n".join(lineas)}

    # ── show blocked ───────────────────────────────────────────────────────────
    if cmd_l == "show blocked":
        _, inst = obtener_instancia_activa_usuario(bd, usuario.id)
        if not inst:
            guardar("OK"); return {"salida": "No active scenario."}
        ips = bd.query(BloqueoEscenario).filter(
            BloqueoEscenario.escenario_id == inst.id
        ).order_by(BloqueoEscenario.fecha_creacion.desc()).all()
        if not ips:
            guardar("OK"); return {"salida": "No blocked IPs in current scenario."}
        lineas = [
            f"{ip.fecha_creacion.isoformat() if ip.fecha_creacion else 'N/A'} | {ip.direccion_ip} | reason={ip.motivo}"
            for ip in ips
        ]
        guardar("OK"); return {"salida": "\n".join(lineas)}

    # ── show services ──────────────────────────────────────────────────────────
    if cmd_l == "show services":
        eventos = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(20).all()
        servicios = set()
        for e in eventos:
            if "22" in e.descripcion or "ssh" in e.descripcion.lower(): servicios.add("SSH     (22/tcp)  — OPEN")
            if "80" in e.descripcion or "http" in e.descripcion.lower(): servicios.add("HTTP    (80/tcp)  — OPEN")
            if "443" in e.descripcion or "https" in e.descripcion.lower(): servicios.add("HTTPS  (443/tcp)  — OPEN")
            if "21" in e.descripcion or "ftp" in e.descripcion.lower(): servicios.add("FTP     (21/tcp)  — OPEN")
            if "8080" in e.descripcion or "panel" in e.descripcion.lower(): servicios.add("HTTP   (8080/tcp) — OPEN")
            if "smtp" in e.descripcion.lower(): servicios.add("SMTP    (25/tcp)  — OPEN")
            if "rdp" in e.descripcion.lower() or "3389" in e.descripcion: servicios.add("RDP   (3389/tcp)  — OPEN")
            if "vpn" in e.descripcion.lower(): servicios.add("VPN    (1194/udp) — OPEN")
        if not servicios:
            servicios = {"SSH (22/tcp) — OPEN", "HTTP (80/tcp) — OPEN", "HTTPS (443/tcp) — OPEN"}
        guardar("OK")
        return {"salida": "Detected services:\n" + "\n".join(sorted(servicios))}

    # ── scan ports ─────────────────────────────────────────────────────────────
    if cmd_l == "scan ports":
        guardar("OK")
        return {"salida": (
            "Starting port scan...\n"
            "PORT     STATE  SERVICE   VERSION\n"
            "22/tcp   open   ssh       OpenSSH 8.2\n"
            "80/tcp   open   http      Apache 2.4.41\n"
            "443/tcp  open   https     nginx 1.18.0\n"
            "8080/tcp open   http-alt  Tomcat 9.0\n"
            "Scan complete. 4 open ports found.\n"
        )}

    # ── show traffic ───────────────────────────────────────────────────────────
    if cmd_l == "show traffic":
        eventos = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(5).all()
        total_e = bd.query(Evento).count()
        guardar("OK")
        salida = f"Network traffic analysis — {total_e} total events\n"
        salida += "─" * 50 + "\n"
        for e in eventos:
            salida += f"src={e.ip_origen} | type={e.tipo_evento} | {e.descripcion[:60]}\n"
        return {"salida": salida}

    # ── show banners ───────────────────────────────────────────────────────────
    if cmd_l == "show banners":
        guardar("OK")
        return {"salida": (
            "Service banners detected:\n"
            "  SSH    : SSH-2.0-OpenSSH_7.4 (outdated — CVE-2018-15473)\n"
            "  HTTP   : Server: Apache/2.2.34 (outdated — CVE-2017-7679)\n"
            "  FTP    : 220 vsftpd 2.3.4 (VULNERABLE — backdoor)\n"
            "  HTTPS  : nginx/1.18.0 Ubuntu\n"
            "WARNING: Multiple services exposing version information.\n"
        )}

    # ── resolve host ───────────────────────────────────────────────────────────
    if cmd_l == "resolve host":
        eventos = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(1).all()
        ip_origen = eventos[0].ip_origen if eventos else "192.168.1.100"
        guardar("OK")
        return {"salida": (
            f"Resolving {ip_origen}...\n"
            f"  PTR record: attacker-node-{ip_origen.replace('.', '-')}.malicious.net\n"
            f"  ASN       : AS12345 — Unknown/Suspicious Network\n"
            f"  Country   : UNKNOWN\n"
            f"  Reputation: MALICIOUS (threat intelligence match)\n"
        )}

    # ── show vulnerabilities ───────────────────────────────────────────────────
    if cmd_l == "show vulnerabilities":
        guardar("OK")
        return {"salida": (
            "Vulnerability scan results:\n"
            "  CRITICAL : vsftpd 2.3.4 backdoor (CVE-2011-2523) — port 21\n"
            "  HIGH     : OpenSSH 7.4 user enum (CVE-2018-15473) — port 22\n"
            "  HIGH     : Apache 2.2.34 buffer overflow (CVE-2017-7679) — port 80\n"
            "  MEDIUM   : nginx info disclosure — port 443\n"
            "  LOW      : HTTP server header exposure — port 8080\n"
            "Total: 1 CRITICAL, 2 HIGH, 1 MEDIUM, 1 LOW\n"
        )}

    # ── trace ip ───────────────────────────────────────────────────────────────
    if cmd_l == "trace ip":
        eventos = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(1).all()
        ip_origen = eventos[0].ip_origen if eventos else "192.168.1.100"
        guardar("OK")
        return {"salida": (
            f"Tracing route to {ip_origen}...\n"
            f"  1  192.168.1.1      gateway          1ms\n"
            f"  2  10.0.0.1         isp-router       5ms\n"
            f"  3  172.16.0.1       transit-node     12ms\n"
            f"  4  {ip_origen}      TARGET           18ms\n"
            f"Route complete. Origin confirmed: external network.\n"
        )}

    # ── show users ─────────────────────────────────────────────────────────────
    if cmd_l == "show users":
        guardar("OK")
        return {"salida": (
            "System users:\n"
            "  root     — uid=0  (privileged)\n"
            "  admin    — uid=1000 (sudo)\n"
            "  operador — uid=1001\n"
            "  backup   — uid=1002\n"
            "  sysadmin — uid=1003 (sudo)\n"
            "  deploy   — uid=1004\n"
        )}

    # ── show sessions ──────────────────────────────────────────────────────────
    if cmd_l == "show sessions":
        eventos = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(3).all()
        guardar("OK")
        salida = "Active sessions:\n"
        for i, e in enumerate(eventos):
            salida += f"  SESSION-{i+1:03d} | src={e.ip_origen} | type={e.tipo_evento} | ACTIVE\n"
        if not eventos:
            salida += "  No active sessions detected.\n"
        return {"salida": salida}

    # ── show failed logins ─────────────────────────────────────────────────────
    if cmd_l == "show failed logins":
        eventos = bd.query(Evento).filter(
            Evento.tipo_evento == "Fuerza Bruta"
        ).order_by(Evento.fecha_creacion.desc()).limit(10).all()
        if not eventos:
            guardar("OK"); return {"salida": "No failed login attempts detected."}
        guardar("OK")
        lineas = [
            f"{e.fecha_creacion.isoformat() if e.fecha_creacion else 'N/A'} | FAILED LOGIN | src={e.ip_origen} | {e.descripcion}"
            for e in eventos
        ]
        return {"salida": "Failed login attempts:\n" + "\n".join(lineas)}

    # ── show processes ─────────────────────────────────────────────────────────
    if cmd_l == "show processes":
        guardar("OK")
        return {"salida": (
            "Active processes:\n"
            "  PID  1    /sbin/init\n"
            "  PID  215  /usr/sbin/sshd -D\n"
            "  PID  318  /usr/sbin/apache2 -k start\n"
            "  PID  412  /usr/bin/python3 /opt/monitor.py\n"
            "  PID  891  /bin/bash (ANOMALOUS — unexpected shell)\n"
            "  PID  934  nc -lvp 4444 (SUSPICIOUS — netcat listener)\n"
            "WARNING: Suspicious processes detected (PID 891, 934).\n"
        )}

    # ── show hosts ─────────────────────────────────────────────────────────────
    if cmd_l == "show hosts":
        eventos = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(20).all()
        ips = list(set(e.ip_origen for e in eventos))[:8]
        guardar("OK")
        salida = "Active hosts in network:\n"
        for ip in ips:
            salida += f"  {ip}  — ACTIVE (malicious activity detected)\n"
        if not ips:
            salida += "  192.168.1.1   — gateway\n  192.168.1.10  — local host\n"
        return {"salida": salida}

    # ── enumerate users ────────────────────────────────────────────────────────
    if cmd_l == "enumerate users":
        guardar("OK")
        return {"salida": (
            "Enumerating users on target...\n"
            "  [+] admin     — VALID USER (login attempted)\n"
            "  [+] root      — VALID USER (login attempted)\n"
            "  [+] operator  — VALID USER\n"
            "  [-] guest     — invalid\n"
            "  [-] test      — invalid\n"
            "Enumeration complete. 3 valid users found.\n"
            "WARNING: User enumeration is itself an indicator of compromise.\n"
        )}

    # ── enumerate services ─────────────────────────────────────────────────────
    if cmd_l == "enumerate services":
        guardar("OK")
        return {"salida": (
            "Enumerating services on target...\n"
            "  SSH     22/tcp  — OpenSSH 7.4 (user enum possible)\n"
            "  HTTP    80/tcp  — Apache 2.2.34 (multiple CVEs)\n"
            "  FTP     21/tcp  — vsftpd 2.3.4 (BACKDOOR PRESENT)\n"
            "  SMB    445/tcp  — Samba 3.x (EternalBlue risk)\n"
            "  HTTP  8080/tcp  — Tomcat 9.0 (default creds possible)\n"
            "Enumeration complete. 5 services identified, 3 with known vulnerabilities.\n"
        )}

    # ── export report ──────────────────────────────────────────────────────────
    if cmd_l == "export report":
        total_e = bd.query(Evento).count()
        total_a = bd.query(Alerta).count()
        acciones = bd.query(AccionUsuario).filter(
            AccionUsuario.usuario_id == usuario.id
        ).count()
        guardar("OK")
        return {"salida": (
            f"Exporting technical report...\n"
            f"  Operator  : {usuario.nombre_usuario}\n"
            f"  Events    : {total_e}\n"
            f"  Alerts    : {total_a}\n"
            f"  Commands  : {acciones}\n"
            f"  Report    : /home/cyberlab/reports/incident_{usuario.nombre_usuario}.txt\n"
            f"Report exported successfully.\n"
        )}

    # ── block ip ───────────────────────────────────────────────────────────────
    if base == "block" and len(partes) >= 2:
        ip_txt = partes[2] if len(partes) == 3 and partes[1] == "ip" else (partes[1] if len(partes) == 2 else None)
        if not ip_txt:
            guardar("ERROR"); return {"salida": "Usage: block ip <address>"}

        _, inst = obtener_instancia_activa_usuario(bd, usuario.id)
        if inst:
            existe_esc = bd.query(BloqueoEscenario).filter(
                BloqueoEscenario.escenario_id == inst.id,
                BloqueoEscenario.direccion_ip == ip_txt
            ).first()
            if not existe_esc:
                bd.add(BloqueoEscenario(
                    escenario_id=inst.id, direccion_ip=ip_txt,
                    motivo="Manual block (operator)"
                ))
                bd.commit()

        existe_global = bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip_txt).first()
        if not existe_global:
            bd.add(IpBloqueada(direccion_ip=ip_txt, motivo="Manual block (operator)"))
            bd.commit()

        guardar("OK")
        return {"salida": f"iptables: blocked {ip_txt}"}

       # ================================================================
# MODO DEFENSA — Endpoints a agregar en main.py
# Ubicación: al final del archivo, antes del último bloque
# ================================================================
#
# También agrega este schema en schemas.py:
#
# class SolicitudTerminalDefensa(BaseModel):
#     nombre_usuario: str
#     comando: str
#     ip_escenario: str | None = None
#
# ================================================================


@app.post("/defensa/terminal")
def terminal_defensiva(datos: dict, bd: Session = Depends(obtener_bd)):
    """
    Terminal SOC defensiva. Procesa comandos de análisis, consulta de logs,
    alertas, eventos y bloqueo desde la perspectiva del defensor.
    """
    nombre_usuario = datos.get("nombre_usuario", "")
    raw            = (datos.get("comando") or "").strip()
    ip_escenario   = datos.get("ip_escenario", None)

    usuario = bd.query(Usuario).filter(Usuario.nombre_usuario == nombre_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    cmd_l = raw.lower().strip()

    def guardar(res: str):
        bd.add(AccionUsuario(comando=raw, resultado=res, usuario_id=usuario.id))
        bd.commit()

    if not raw:
        guardar("ERROR")
        return {"salida": "bash: command not found"}

    partes = cmd_l.split()
    base   = partes[0] if partes else ""

    # ── clear / limpiar ─────────────────────────────────────────────
    if base in ["clear", "cls", "limpiar"]:
        guardar("OK")
        return {"salida": "__LIMPIAR__"}

    # ── ayuda ────────────────────────────────────────────────────────
    if base in ["ayuda", "help", "?"]:
        guardar("OK")
        return {"salida": (
            "CyberLab SOC Terminal — Modo Defensa\n"
            "══════════════════════════════════════\n"
            "EVENTOS:\n"
            "  eventos                    - todos los eventos del sistema\n"
            "  eventos recientes          - últimos eventos registrados\n"
            "  eventos fuerza-bruta       - filtrar por tipo fuerza bruta\n"
            "  eventos escaneo            - filtrar por escaneo de puertos\n"
            "  eventos red                - eventos de red\n"
            "\nALERTAS:\n"
            "  alertas                    - alertas activas\n"
            "  alertas criticas           - solo alertas críticas\n"
            "  alertas activas            - alertas en curso\n"
            "\nANÁLISIS DE IPs:\n"
            "  analizar-ip <IP>           - análisis completo de IP\n"
            "  historial-ip <IP>          - historial de actividad de IP\n"
            "  trafico-ip <IP>            - tráfico generado por IP\n"
            "\nBLOQUEO:\n"
            "  bloquear-ip <IP>           - bloquear IP en firewall\n"
            "  desbloquear-ip <IP>        - remover bloqueo\n"
            "  ips-bloqueadas             - lista de IPs bloqueadas\n"
            "\nLOGS:\n"
            "  logs                       - logs generales del sistema\n"
            "  logs auth                  - logs de autenticación\n"
            "  logs firewall              - logs del firewall\n"
            "  logs ssh                   - logs del servicio SSH\n"
            "  logs web                   - logs del servidor web\n"
            "\nESTADO:\n"
            "  estado-sistema             - estado general del sistema\n"
            "  estado-firewall            - estado del firewall\n"
            "  estado-servidor            - estado del servidor\n"
            "  estado-red                 - estado de la red\n"
            "\nOTROS:\n"
            "  correlacionar              - correlacionar eventos y alertas\n"
            "  generar-reporte            - generar reporte de incidente\n"
            "  whoami                     - usuario activo\n"
            "  clear                      - limpiar terminal\n"
        )}

    # ── whoami ───────────────────────────────────────────────────────
    if cmd_l == "whoami":
        guardar("OK")
        return {"salida": f"{usuario.nombre_usuario} [rol: analista-soc]"}

    # ── eventos ──────────────────────────────────────────────────────
    if cmd_l == "eventos":
        evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(12).all()
        if not evs:
            guardar("OK")
            return {"salida": "No hay eventos registrados en el sistema."}
        lineas = [f"{'='*60}", f"  EVENTOS DEL SISTEMA — Total: {bd.query(Evento).count()}", f"{'='*60}"]
        for e in evs:
            ts = e.fecha_creacion.strftime("%H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"  [{ts}] {e.tipo_evento:<20} src={e.ip_origen:<18} {e.descripcion[:55]}")
        guardar("OK")
        return {"salida": "\n".join(lineas)}

    if cmd_l == "eventos recientes":
        evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(5).all()
        if not evs:
            guardar("OK"); return {"salida": "Sin eventos recientes."}
        lineas = ["  EVENTOS RECIENTES (últimos 5):"]
        for e in evs:
            ts = e.fecha_creacion.strftime("%H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"  [{ts}] {e.tipo_evento} | src={e.ip_origen} | {e.descripcion[:60]}")
        guardar("OK")
        return {"salida": "\n".join(lineas)}

    if cmd_l == "eventos fuerza-bruta":
        evs = bd.query(Evento).filter(
            Evento.tipo_evento.ilike("%fuerza%")
        ).order_by(Evento.fecha_creacion.desc()).limit(10).all()
        total = bd.query(Evento).filter(Evento.tipo_evento.ilike("%fuerza%")).count()
        if not evs:
            guardar("OK"); return {"salida": "No se detectaron eventos de fuerza bruta."}
        lineas = [f"  EVENTOS FUERZA BRUTA — {total} registros:"]
        for e in evs:
            ts = e.fecha_creacion.strftime("%H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"  [{ts}] BRUTE-FORCE | src={e.ip_origen} | {e.descripcion[:65]}")
        lineas.append(f"\n  ⚠  {total} intentos de fuerza bruta detectados.")
        if total >= 5:
            lineas.append("  ⚠  Umbral crítico superado. Se recomienda bloqueo inmediato.")
        guardar("OK")
        return {"salida": "\n".join(lineas)}

    if cmd_l == "eventos escaneo":
        evs = bd.query(Evento).filter(
            Evento.tipo_evento.ilike("%escaneo%")
        ).order_by(Evento.fecha_creacion.desc()).limit(10).all()
        total = bd.query(Evento).filter(Evento.tipo_evento.ilike("%escaneo%")).count()
        if not evs:
            guardar("OK"); return {"salida": "No se detectaron eventos de escaneo de puertos."}
        lineas = [f"  EVENTOS ESCANEO DE PUERTOS — {total} registros:"]
        for e in evs:
            ts = e.fecha_creacion.strftime("%H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"  [{ts}] PORT-SCAN | src={e.ip_origen} | {e.descripcion[:65]}")
        lineas.append(f"\n  ⚠  {total} sondas de escaneo detectadas.")
        guardar("OK")
        return {"salida": "\n".join(lineas)}

    if cmd_l == "eventos red":
        evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(8).all()
        ips_unicas = list(set(e.ip_origen for e in evs))
        lineas = ["  EVENTOS DE RED — Resumen:"]
        lineas.append(f"  IPs activas detectadas: {len(ips_unicas)}")
        for ip in ips_unicas[:6]:
            cnt = bd.query(Evento).filter(Evento.ip_origen == ip).count()
            lineas.append(f"  → {ip:<18} {cnt} eventos")
        guardar("OK")
        return {"salida": "\n".join(lineas)}

    # ── alertas ──────────────────────────────────────────────────────
    if cmd_l in ["alertas", "alertas activas"]:
        als = bd.query(Alerta).order_by(Alerta.fecha_creacion.desc()).limit(10).all()
        if not als:
            guardar("OK"); return {"salida": "Sin alertas activas en el sistema."}
        lineas = [f"  ALERTAS ACTIVAS — Total: {bd.query(Alerta).count()}"]
        for a in als:
            ts  = a.fecha_creacion.strftime("%H:%M:%S") if a.fecha_creacion else "N/A"
            sev = "🔴" if a.severidad == "Alta" else "🟡" if a.severidad == "Media" else "🟢"
            lineas.append(f"  [{ts}] {sev} [{a.severidad:<6}] {a.titulo}")
            lineas.append(f"         └─ {a.descripcion[:70]}")
        guardar("OK")
        return {"salida": "\n".join(lineas)}

    if cmd_l == "alertas criticas":
        als = bd.query(Alerta).filter(
            Alerta.severidad.in_(["Alta", "Crítica", "Critica"])
        ).order_by(Alerta.fecha_creacion.desc()).limit(8).all()
        if not als:
            guardar("OK"); return {"salida": "No hay alertas críticas activas."}
        lineas = [f"  🔴 ALERTAS CRÍTICAS — {len(als)} detectadas:"]
        for a in als:
            ts = a.fecha_creacion.strftime("%H:%M:%S") if a.fecha_creacion else "N/A"
            lineas.append(f"  [{ts}] 🔴 CRÍTICA | {a.titulo}")
            lineas.append(f"         └─ {a.descripcion[:75]}")
            lineas.append(f"         └─ ACCIÓN REQUERIDA: Investigar y bloquear origen.")
        guardar("OK")
        return {"salida": "\n".join(lineas)}

    # ── analizar-ip ──────────────────────────────────────────────────
    if cmd_l.startswith("analizar-ip"):
        ip_obj = partes[1] if len(partes) > 1 else ip_escenario or "?"
        evs = bd.query(Evento).filter(Evento.ip_origen == ip_obj).order_by(Evento.fecha_creacion.desc()).all()
        total  = len(evs)
        tipos  = list(set(e.tipo_evento for e in evs))
        bloq   = bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip_obj).first()
        riesgo = "CRÍTICO" if total >= 8 else "ALTO" if total >= 4 else "MEDIO" if total >= 2 else "BAJO"
        guardar("OK")
        return {"salida": (
            f"  ANÁLISIS DE IP: {ip_obj}\n"
            f"  {'─'*45}\n"
            f"  Estado actual  : {'🔴 BLOQUEADA' if bloq else '🟢 ACTIVA (no bloqueada)'}\n"
            f"  Nivel de riesgo: {riesgo}\n"
            f"  Total eventos  : {total}\n"
            f"  Tipos detectados: {', '.join(tipos) if tipos else 'Sin actividad'}\n"
            f"  Primera actividad: {evs[-1].fecha_creacion.strftime('%H:%M:%S') if evs else 'N/A'}\n"
            f"  Última actividad : {evs[0].fecha_creacion.strftime('%H:%M:%S') if evs else 'N/A'}\n"
            f"  Geolocalización : External / Unclassified Network\n"
            f"  Reputación      : {'MALICIOUS — Threat Intel Match' if total >= 3 else 'SUSPICIOUS'}\n"
            + (f"  ⚠  Acción recomendada: bloquear-ip {ip_obj}\n" if not bloq and total >= 3 else "")
        )}

    # ── historial-ip ─────────────────────────────────────────────────
    if cmd_l.startswith("historial-ip"):
        ip_obj = partes[1] if len(partes) > 1 else ip_escenario or "?"
        evs = bd.query(Evento).filter(Evento.ip_origen == ip_obj).order_by(Evento.fecha_creacion.asc()).all()
        if not evs:
            guardar("OK"); return {"salida": f"  Sin historial para IP {ip_obj}."}
        lineas = [f"  HISTORIAL COMPLETO — IP: {ip_obj} ({len(evs)} eventos):"]
        for e in evs:
            ts = e.fecha_creacion.strftime("%H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"  [{ts}] {e.tipo_evento:<22} {e.descripcion[:55]}")
        lineas.append(f"\n  Resumen: {len(evs)} eventos registrados. IP con actividad {'persistente' if len(evs) >= 5 else 'detectada'}.")
        guardar("OK")
        return {"salida": "\n".join(lineas)}

    # ── trafico-ip ───────────────────────────────────────────────────
    if cmd_l.startswith("trafico-ip"):
        ip_obj = partes[1] if len(partes) > 1 else ip_escenario or "?"
        evs = bd.query(Evento).filter(Evento.ip_origen == ip_obj).order_by(Evento.fecha_creacion.desc()).limit(6).all()
        total = bd.query(Evento).filter(Evento.ip_origen == ip_obj).count()
        guardar("OK")
        return {"salida": (
            f"  ANÁLISIS DE TRÁFICO — IP: {ip_obj}\n"
            f"  {'─'*45}\n"
            f"  Paquetes totales : {total * 47} (estimado)\n"
            f"  Conexiones       : {total}\n"
            f"  Protocolo principal: TCP\n"
            f"  Puertos destino  : 22 (SSH), 80 (HTTP), 443 (HTTPS)\n"
            f"  Patrón detectado : {'Escaneo sistemático' if any('escaneo' in str(e.tipo_evento).lower() for e in evs) else 'Intentos de autenticación repetidos'}\n"
            f"  Velocidad        : {total * 3} req/min (ANÓMALO)\n"
            f"  {'─'*45}\n"
            f"  ⚠  Tráfico clasificado como MALICIOSO.\n"
        )}

    # ── bloquear-ip ──────────────────────────────────────────────────
    if cmd_l.startswith("bloquear-ip"):
        ip_obj = partes[1] if len(partes) > 1 else ip_escenario or "?"
        # Bloqueo en escenario activo
        _, inst = obtener_instancia_activa_usuario(bd, usuario.id)
        if inst:
            existe = bd.query(BloqueoEscenario).filter(
                BloqueoEscenario.escenario_id == inst.id,
                BloqueoEscenario.direccion_ip == ip_obj
            ).first()
            if not existe:
                bd.add(BloqueoEscenario(
                    escenario_id=inst.id,
                    direccion_ip=ip_obj,
                    motivo="Bloqueo defensivo SOC"
                ))
                bd.commit()
        # Bloqueo global
        existe_g = bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip_obj).first()
        if not existe_g:
            bd.add(IpBloqueada(direccion_ip=ip_obj, motivo="Bloqueo defensivo SOC"))
            bd.commit()
        guardar("OK")
        return {"salida": (
            f"  🛡 BLOQUEO APLICADO\n"
            f"  IP bloqueada     : {ip_obj}\n"
            f"  Regla firewall   : iptables -A INPUT -s {ip_obj} -j DROP → aplicada\n"
            f"  Estado           : BLOQUEADA\n"
            f"  Motivo           : Actividad maliciosa detectada — bloqueo defensivo SOC\n"
            f"  Verificación     : usa 'ips-bloqueadas' para confirmar.\n"
        )}

    # ── desbloquear-ip ───────────────────────────────────────────────
    if cmd_l.startswith("desbloquear-ip"):
        ip_obj = partes[1] if len(partes) > 1 else "?"
        existe = bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip_obj).first()
        if existe:
            bd.delete(existe); bd.commit()
            guardar("OK")
            return {"salida": f"  ✓ IP {ip_obj} desbloqueada. Regla firewall removida."}
        guardar("OK")
        return {"salida": f"  IP {ip_obj} no estaba bloqueada."}

    # ── ips-bloqueadas ───────────────────────────────────────────────
    if cmd_l == "ips-bloqueadas":
        ips = bd.query(IpBloqueada).order_by(IpBloqueada.id.desc()).all()
        if not ips:
            guardar("OK"); return {"salida": "  No hay IPs bloqueadas actualmente."}
        lineas = [f"  IPs BLOQUEADAS EN FIREWALL — {len(ips)} reglas activas:"]
        for ip in ips:
            lineas.append(f"  🔴 {ip.direccion_ip:<18} motivo: {ip.motivo or 'N/A'}")
        guardar("OK")
        return {"salida": "\n".join(lineas)}

    # ── logs ─────────────────────────────────────────────────────────
    if cmd_l == "logs":
        evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(8).all()
        als = bd.query(Alerta).order_by(Alerta.fecha_creacion.desc()).limit(4).all()
        lineas = ["  SYSTEM LOGS — Resumen del sistema:"]
        lineas.append(f"  Eventos totales : {bd.query(Evento).count()}")
        lineas.append(f"  Alertas totales : {bd.query(Alerta).count()}")
        lineas.append("  Últimas entradas:")
        for e in evs[:5]:
            ts = e.fecha_creacion.strftime("%H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"    [{ts}] LOG {e.tipo_evento} src={e.ip_origen}")
        guardar("OK")
        return {"salida": "\n".join(lineas)}

    if cmd_l == "logs auth":
        evs = bd.query(Evento).filter(
            Evento.tipo_evento.ilike("%fuerza%")
        ).order_by(Evento.fecha_creacion.desc()).limit(10).all()
        total_fb = bd.query(Evento).filter(Evento.tipo_evento.ilike("%fuerza%")).count()
        lineas = [f"  AUTH LOG — {total_fb} intentos de autenticación sospechosos:"]
        for e in evs:
            ts = e.fecha_creacion.strftime("%H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"  [{ts}] AUTH_FAIL src={e.ip_origen} {e.descripcion[:55]}")
        if total_fb >= 5:
            lineas.append(f"\n  ⚠  ALERTA: {total_fb} fallos de autenticación. Posible ataque de fuerza bruta.")
        guardar("OK")
        return {"salida": "\n".join(lineas)}

    if cmd_l == "logs firewall":
        ips = bd.query(IpBloqueada).all()
        evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(6).all()
        lineas = ["  FIREWALL LOG:"]
        for ip in ips:
            lineas.append(f"  DROP  IN src={ip.direccion_ip:<18} → Regla activa")
        for e in evs:
            ts = e.fecha_creacion.strftime("%H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"  [{ts}] ACCEPT IN src={e.ip_origen} proto=TCP")
        lineas.append(f"\n  Reglas activas: {len(ips)} | Conexiones monitoreadas: {bd.query(Evento).count()}")
        guardar("OK")
        return {"salida": "\n".join(lineas)}

    if cmd_l == "logs ssh":
        evs = bd.query(Evento).filter(
            Evento.descripcion.ilike("%ssh%")
        ).order_by(Evento.fecha_creacion.desc()).limit(8).all()
        total = bd.query(Evento).filter(Evento.descripcion.ilike("%ssh%")).count()
        lineas = [f"  SSH LOG — {total} entradas:"]
        if evs:
            for e in evs:
                ts = e.fecha_creacion.strftime("%H:%M:%S") if e.fecha_creacion else "N/A"
                lineas.append(f"  [{ts}] sshd: Failed password from {e.ip_origen} port 22 ssh2")
        else:
            # Mostrar actividad SSH simulada con IPs del sistema
            evs_gen = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(5).all()
            for e in evs_gen:
                ts = e.fecha_creacion.strftime("%H:%M:%S") if e.fecha_creacion else "N/A"
                lineas.append(f"  [{ts}] sshd: Failed password from {e.ip_origen} port 22 ssh2")
        guardar("OK")
        return {"salida": "\n".join(lineas)}

    if cmd_l == "logs web":
        evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(6).all()
        lineas = ["  WEB SERVER LOG (Apache/nginx):"]
        for e in evs:
            ts = e.fecha_creacion.strftime("%H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f'  [{ts}] {e.ip_origen} "GET /admin HTTP/1.1" 401 — suspicious')
            lineas.append(f'  [{ts}] {e.ip_origen} "POST /login HTTP/1.1" 403 — blocked')
        lineas.append("\n  ⚠  Múltiples intentos de acceso a rutas administrativas detectados.")
        guardar("OK")
        return {"salida": "\n".join(lineas)}

    # ── estado-sistema ───────────────────────────────────────────────
    if cmd_l == "estado-sistema":
        total_e = bd.query(Evento).count()
        total_a = bd.query(Alerta).count()
        total_b = bd.query(IpBloqueada).count()
        riesgo  = "ALTO" if total_a >= 3 else "MEDIO" if total_a >= 1 else "BAJO"
        guardar("OK")
        return {"salida": (
            f"  ESTADO DEL SISTEMA — CyberLab SOC\n"
            f"  {'─'*45}\n"
            f"  Estado general   : {'⚠  BAJO ATAQUE' if total_a >= 2 else '✓ OPERATIVO'}\n"
            f"  Nivel de riesgo  : {riesgo}\n"
            f"  Eventos activos  : {total_e}\n"
            f"  Alertas activas  : {total_a}\n"
            f"  IPs bloqueadas   : {total_b}\n"
            f"  Servicios activos: SSH, HTTP, HTTPS, FTP\n"
            f"  Firewall         : {'ACTIVO — ' + str(total_b) + ' reglas' if total_b else 'ACTIVO — sin reglas'}\n"
            f"  IDS/IPS          : ACTIVO — monitoreando\n"
            f"  Uptime           : 99.7%\n"
        )}

    if cmd_l == "estado-firewall":
        total_b = bd.query(IpBloqueada).count()
        ips = bd.query(IpBloqueada).order_by(IpBloqueada.id.desc()).limit(5).all()
        lineas = [
            "  ESTADO DEL FIREWALL:",
            f"  Estado     : ACTIVO",
            f"  Reglas DROP: {total_b}",
            f"  Política   : ACCEPT por defecto, DROP explícito",
            "  Reglas activas:"
        ]
        for ip in ips:
            lineas.append(f"    DROP  src={ip.direccion_ip}")
        guardar("OK")
        return {"salida": "\n".join(lineas)}

    if cmd_l == "estado-servidor":
        total_e = bd.query(Evento).count()
        guardar("OK")
        return {"salida": (
            f"  ESTADO DEL SERVIDOR:\n"
            f"  {'─'*40}\n"
            f"  CPU       : {min(30 + total_e * 2, 95)}% uso\n"
            f"  RAM       : {min(40 + total_e, 90)}% uso\n"
            f"  Disco     : 67% uso\n"
            f"  Red       : {'SATURADA — tráfico anómalo' if total_e >= 8 else 'Normal'}\n"
            f"  Servicios : SSH ✓ | HTTP ✓ | HTTPS ✓\n"
            f"  Procesos  : {85 + total_e} activos\n"
            f"  Estado    : {'⚠  DEGRADADO' if total_e >= 8 else '✓ OPERATIVO'}\n"
        )}

    if cmd_l == "estado-red":
        evs = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(5).all()
        ips_act = list(set(e.ip_origen for e in evs))
        guardar("OK")
        return {"salida": (
            f"  ESTADO DE LA RED:\n"
            f"  IPs activas detectadas : {len(ips_act)}\n"
            f"  Tráfico entrante       : {'ANÓMALO — posible ataque' if len(ips_act) >= 2 else 'Normal'}\n"
            f"  Latencia promedio      : 12ms\n"
            f"  Pérdida de paquetes    : {min(len(ips_act) * 2, 15)}%\n"
            f"  IDS alertas activas    : {bd.query(Alerta).count()}\n"
        )}

    # ── correlacionar ────────────────────────────────────────────────
    if cmd_l == "correlacionar":
        total_e = bd.query(Evento).count()
        total_a = bd.query(Alerta).count()
        evs_fb  = bd.query(Evento).filter(Evento.tipo_evento.ilike("%fuerza%")).count()
        evs_sc  = bd.query(Evento).filter(Evento.tipo_evento.ilike("%escaneo%")).count()
        ips     = list(set(
            e.ip_origen for e in bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(20).all()
        ))
        guardar("OK")
        lineas = [
            "  CORRELACIÓN DE EVENTOS Y ALERTAS:",
            f"  {'─'*50}",
            f"  Eventos totales      : {total_e}",
            f"  Alertas activas      : {total_a}",
            f"  Eventos fuerza bruta : {evs_fb}",
            f"  Eventos escaneo      : {evs_sc}",
            f"  IPs únicas activas   : {len(ips)}",
            "",
            "  CORRELACIONES DETECTADAS:",
        ]
        if evs_fb >= 3 and evs_sc >= 2:
            lineas.append("  [ALTA]  Reconocimiento seguido de fuerza bruta — ataque en dos fases")
        if evs_fb >= 5:
            lineas.append("  [ALTA]  Fuerza bruta sostenida — atacante persistente")
        if len(ips) >= 3:
            lineas.append("  [MEDIA] Múltiples IPs — posible ataque coordinado o distribuido")
        if total_a >= 2:
            lineas.append("  [ALTA]  Múltiples alertas correlacionadas — incidente confirmado")
        lineas.append(f"\n  Conclusión: {'Incidente activo confirmado. Bloqueo recomendado.' if total_e >= 5 else 'Actividad sospechosa. Monitoreo continuo recomendado.'}")
        return {"salida": "\n".join(lineas)}

    # ── generar-reporte ──────────────────────────────────────────────
    if cmd_l == "generar-reporte":
        total_e = bd.query(Evento).count()
        total_a = bd.query(Alerta).count()
        total_b = bd.query(IpBloqueada).count()
        acc = bd.query(AccionUsuario).filter(AccionUsuario.usuario_id == usuario.id).count()
        guardar("OK")
        return {"salida": (
            f"  REPORTE DE INCIDENTE DEFENSIVO\n"
            f"  {'═'*45}\n"
            f"  Analista       : {usuario.nombre_usuario}\n"
            f"  Modo           : Defensa SOC\n"
            f"  Eventos        : {total_e}\n"
            f"  Alertas        : {total_a}\n"
            f"  IPs bloqueadas : {total_b}\n"
            f"  Comandos SOC   : {acc}\n"
            f"  Ruta           : /home/soc/reports/incident_{usuario.nombre_usuario}.pdf\n"
            f"  Estado         : ✅ REPORTE GENERADO\n"
        )}

    # ── comando no reconocido ────────────────────────────────────────
    guardar("ERROR")
    return {"salida": f"  bash: {raw}: command not found\n  Escribe 'ayuda' para ver los comandos disponibles."}


# ────────────────────────────────────────────────────────────────
# Endpoint: niveles de defensa completados (para desbloqueo)
# ────────────────────────────────────────────────────────────────
@app.get("/progreso/defensa/{nombre_usuario}")
def obtener_progreso_defensa(nombre_usuario: str, bd: Session = Depends(obtener_bd)):
    """
    Retorna los niveles de defensa completados por el usuario.
    Actualmente el progreso defensivo se guarda en localStorage;
    este endpoint sirve de respaldo y sincronización futura.
    """
    u = bd.query(Usuario).filter(Usuario.nombre_usuario == nombre_usuario).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Por ahora retorna estructura base — el frontend persiste en localStorage
    return {
        "nombre_usuario": u.nombre_usuario,
        "modo": "defensa",
        "niveles_completados": [],   # Se extiende cuando se persista defensa en BD
        "mensaje": "El progreso defensivo se sincroniza desde el cliente."
    } 

    # ── unblock ip ─────────────────────────────────────────────────────────────
    if base == "unblock" and len(partes) >= 2:
        ip_txt = partes[2] if len(partes) == 3 and partes[1] == "ip" else (partes[1] if len(partes) == 2 else None)
        if not ip_txt:
            guardar("ERROR"); return {"salida": "Usage: unblock ip <address>"}

        _, inst = obtener_instancia_activa_usuario(bd, usuario.id)
        if inst:
            bloq_esc = bd.query(BloqueoEscenario).filter(
                BloqueoEscenario.escenario_id == inst.id,
                BloqueoEscenario.direccion_ip == ip_txt
            ).first()
            if bloq_esc:
                bd.delete(bloq_esc); bd.commit()

        existe = bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip_txt).first()
        if existe:
            bd.delete(existe); bd.commit()
            guardar("OK"); return {"salida": f"iptables: unblocked {ip_txt}"}
        guardar("OK"); return {"salida": f"iptables: IP {ip_txt} was not blocked"}

    guardar("ERROR")
    return {"salida": f"bash: {raw}: command not found"}