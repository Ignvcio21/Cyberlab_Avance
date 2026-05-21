from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text, desc
from sqlalchemy.exc import IntegrityError
from .schemas import SolicitudTerminal, RespuestaTerminal

from typing import Dict, Any, List
import re
import os
import random

from dotenv import load_dotenv
from openai import OpenAI

from .database import SesionLocal, engine, Base
from .models import (
    Usuario, Evento, Alerta, IpBloqueada, AccionUsuario,
    Curso, Capitulo, Leccion, Ejercicio, ProgresoUsuario,
    IntentoEjercicio, EvaluacionDocente,
    PlantillaEscenario, VariablePlantilla, EscenarioInstancia, VariableInstancia, EscenarioActivoUsuario, BloqueoEscenario
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
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
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
    accion = AccionUsuario(comando=comando, resultado=resultado, usuario_id=usuario_id)
    bd.add(accion)
    bd.commit()


def obtener_usuario_por_nombre(bd: Session, nombre_usuario: str) -> Usuario | None:
    return bd.query(Usuario).filter(Usuario.nombre_usuario == nombre_usuario).first()


def exigir_rol(usuario: Usuario | None, roles_permitidos: list[str]):
    if not usuario or usuario.rol not in roles_permitidos:
        raise HTTPException(status_code=403, detail="No autorizado")


def asegurar_columna_rol():
    with engine.connect() as conn:
        cols = conn.execute(text("PRAGMA table_info(usuarios)")).fetchall()
        nombres = [c[1] for c in cols]
        if "rol" not in nombres:
            conn.execute(text("ALTER TABLE usuarios ADD COLUMN rol TEXT NOT NULL DEFAULT 'estudiante'"))
            conn.commit()


def sembrar_contenido_si_falta(bd: Session):
    existe = bd.query(Curso).first()
    if existe:
        return

    curso = Curso(
        titulo="CyberLab: Fundamentos y práctica progresiva",
        descripcion="Curso base con niveles secuenciales (teoría + práctica) para entrenamiento en pentesting y respuesta.",
        nivel="Base",
        activo=True
    )
    bd.add(curso)
    bd.commit()
    bd.refresh(curso)

    secciones = [
        ("introduccion", "Introducción"),
        ("objetivos", "Objetivos del nivel"),
        ("fundamentos", "Fundamentos teóricos"),
        ("metodologia", "Metodología de trabajo"),
        ("comandos", "Comandos y explicación"),
        ("evidencia", "Evidencia y análisis"),
        ("procedimiento", "Procedimiento guiado"),
        ("errores", "Errores comunes"),
        ("buenas_practicas", "Buenas prácticas"),
        ("criterio", "Criterio de aprobación"),
    ]

    niveles = [
        (1, "Introducción y fundamentos"),
        (2, "Fuerza bruta y control de acceso"),
        (3, "Reconocimiento y escaneo de puertos"),
        (4, "Inyección SQL: detección y mitigación"),
        (5, "XSS: análisis y prevención"),
        (6, "Defensa: contención y hardening básico"),
        (7, "Defensa: monitoreo, eventos y alertas"),
    ]

    for orden_cap, titulo_cap in niveles:
        cap = Capitulo(curso_id=curso.id, titulo=f"Nivel {orden_cap}: {titulo_cap}", orden=orden_cap)
        bd.add(cap)
        bd.commit()
        bd.refresh(cap)

        orden_lec = 1
        for id_md, titulo_lec in secciones:
            ruta = f"/contenidos/informacion/nivel{orden_cap}/{id_md}.md"
            lec = Leccion(
                capitulo_id=cap.id,
                titulo=titulo_lec,
                tipo="teoria",
                orden=orden_lec,
                ruta_contenido=ruta
            )
            bd.add(lec)
            orden_lec += 1

        bd.commit()

    cap1 = bd.query(Capitulo).filter(Capitulo.curso_id == curso.id, Capitulo.orden == 1).first()
    if cap1:
        lec1 = bd.query(Leccion).filter(Leccion.capitulo_id == cap1.id).order_by(Leccion.orden.desc()).first()
        if lec1:
            bd.add(Ejercicio(
                leccion_id=lec1.id,
                descripcion="Práctica (Nivel 1): análisis inicial de alertas y eventos en escenario controlado",
                tipo="ataque",
                comandos_objetivo=10,
                tiempo_limite_seg=300
            ))
            bd.commit()

    cap2 = bd.query(Capitulo).filter(Capitulo.curso_id == curso.id, Capitulo.orden == 2).first()
    if cap2:
        lec2 = bd.query(Leccion).filter(Leccion.capitulo_id == cap2.id).order_by(Leccion.orden.desc()).first()
        if lec2:
            bd.add(Ejercicio(
                leccion_id=lec2.id,
                descripcion="Práctica (Nivel 2): contención de fuerza bruta mediante bloqueo manual y verificación",
                tipo="defensa",
                comandos_objetivo=10,
                tiempo_limite_seg=300
            ))
            bd.commit()


# ============================
# ESCENARIOS VARIABLES (helpers + seed)
# ============================

def _generar_ip_privada():
    return f"192.168.1.{random.randint(10, 250)}"


def _generar_usuario_objetivo():
    return random.choice(["admin", "root", "operador", "soporte", "usuario"])


def _generar_servicio():
    return random.choice(["ssh", "rdp", "vpn", "web", "panel"])


def _generar_puertos():
    return random.choice(["22,80,443", "22,3389", "21,22,80", "80,443,8080", "25,110,143"])


def _renderizar_texto(plantilla_texto: str, variables: dict):
    texto = plantilla_texto
    for k, v in variables.items():
        texto = texto.replace("{{" + k + "}}", str(v))
    return texto


def seed_plantillas_escenario(bd: Session):
    if bd.query(PlantillaEscenario).count() > 0:
        return

    plant_fuerza = PlantillaEscenario(
        ejercicio_id=1,
        nombre="Fuerza bruta: intentos de autenticación",
        tipo="fuerza_bruta",
        narrativa_base=(
            "Se observa un patrón de intentos de autenticación en el servicio {{servicio}} "
            "hacia la cuenta objetivo ({{usuario_objetivo}}) desde la IP {{ip_atacante}}. "
            "La frecuencia de eventos aumentó en pocos segundos, lo que sugiere automatización. "
            "Tu tarea es validar evidencia (alertas/eventos), contener (bloquear IP) y verificar."
        ),
        activo=True
    )
    bd.add(plant_fuerza)
    bd.commit()
    bd.refresh(plant_fuerza)

    bd.add_all([
        VariablePlantilla(plantilla_id=plant_fuerza.id, clave="ip_atacante", descripcion="IP origen", regla="ip_privada"),
        VariablePlantilla(plantilla_id=plant_fuerza.id, clave="usuario_objetivo", descripcion="Cuenta objetivo", regla="usuario_comun"),
        VariablePlantilla(plantilla_id=plant_fuerza.id, clave="servicio", descripcion="Servicio atacado", regla="servicio_comun"),
    ])
    bd.commit()

    plant_scan = PlantillaEscenario(
        ejercicio_id=2,
        nombre="Reconocimiento: escaneo de puertos",
        tipo="escaneo_puertos",
        narrativa_base=(
            "Se detecta actividad de reconocimiento desde {{ip_atacante}} contra un host interno. "
            "Los registros muestran sondas sobre puertos {{puertos}}. "
            "Tu tarea es revisar eventos, confirmar el patrón, contener si corresponde y documentar evidencia."
        ),
        activo=True
    )
    bd.add(plant_scan)
    bd.commit()
    bd.refresh(plant_scan)

    bd.add_all([
        VariablePlantilla(plantilla_id=plant_scan.id, clave="ip_atacante", descripcion="IP origen", regla="ip_privada"),
        VariablePlantilla(plantilla_id=plant_scan.id, clave="puertos", descripcion="Puertos escaneados", regla="puertos_comunes"),
    ])
    bd.commit()


def obtener_o_crear_escenario_activo(bd: Session, nombre_usuario: str, ejercicio_id: int):
    usuario = obtener_usuario_por_nombre(bd, nombre_usuario)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no existe")

    activo = bd.query(EscenarioActivoUsuario).filter(EscenarioActivoUsuario.usuario_id == usuario.id).first()
    if activo:
        inst = bd.query(EscenarioInstancia).filter(EscenarioInstancia.id == activo.instancia_id).first()
        if inst and inst.estado == "activo" and inst.ejercicio_id == ejercicio_id:
            vars_inst = bd.query(VariableInstancia).filter(VariableInstancia.instancia_id == inst.id).all()
            variables = {v.clave: v.valor for v in vars_inst}
            return usuario, inst, variables

    plantilla = (
        bd.query(PlantillaEscenario)
        .filter(PlantillaEscenario.ejercicio_id == ejercicio_id, PlantillaEscenario.activo == True)
        .first()
    )
    if not plantilla:
        raise HTTPException(status_code=404, detail="No existe plantilla activa para ese ejercicio")

    defs = bd.query(VariablePlantilla).filter(VariablePlantilla.plantilla_id == plantilla.id).all()
    variables_val = {}

    for v in defs:
        if v.regla == "ip_privada":
            variables_val[v.clave] = _generar_ip_privada()
        elif v.regla == "usuario_comun":
            variables_val[v.clave] = _generar_usuario_objetivo()
        elif v.regla == "servicio_comun":
            variables_val[v.clave] = _generar_servicio()
        elif v.regla == "puertos_comunes":
            variables_val[v.clave] = _generar_puertos()
        else:
            variables_val[v.clave] = "N/D"

    titulo = f"Caso activo: {plantilla.nombre}"
    texto = _renderizar_texto(plantilla.narrativa_base, variables_val)

    inst = EscenarioInstancia(
        plantilla_id=plantilla.id,
        ejercicio_id=ejercicio_id,
        usuario_id=usuario.id,
        titulo_caso=titulo,
        texto_caso=texto,
        estado="activo"
    )
    bd.add(inst)
    bd.commit()
    bd.refresh(inst)

    bd.add_all([VariableInstancia(instancia_id=inst.id, clave=k, valor=str(v)) for k, v in variables_val.items()])
    bd.commit()

    if activo:
        activo.instancia_id = inst.id
    else:
        bd.add(EscenarioActivoUsuario(usuario_id=usuario.id, instancia_id=inst.id))
    bd.commit()

    return usuario, inst, variables_val


@app.on_event("startup")
def iniciar_sistema():
    asegurar_columna_rol()

    bd = SesionLocal()

    admin = bd.query(Usuario).filter(Usuario.nombre_usuario == "admin").first()
    if not admin:
        bd.add(Usuario(nombre_usuario="admin", contrasena="admin123", rol="admin"))
        bd.commit()
    else:
        if admin.rol != "admin":
            admin.rol = "admin"
            bd.commit()

    sembrar_contenido_si_falta(bd)
    seed_plantillas_escenario(bd)

    bd.close()


@app.get("/")
def raiz():
    return {"mensaje": "Backend funcionando"}


@app.post("/iniciar-sesion")
def iniciar_sesion(datos: SolicitudInicioSesion, bd: Session = Depends(obtener_bd)):
    usuario = bd.query(Usuario).filter(
        Usuario.nombre_usuario == datos.nombre_usuario,
        Usuario.contrasena == datos.contrasena
    ).first()

    if not usuario:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    return {"mensaje": "Inicio de sesión correcto", "nombre_usuario": usuario.nombre_usuario, "rol": usuario.rol}


@app.post("/registrar")
def registrar_estudiante(datos: SolicitudRegistroEstudiante, bd: Session = Depends(obtener_bd)):
    existente = bd.query(Usuario).filter(Usuario.nombre_usuario == datos.nombre_usuario).first()
    if existente:
        raise HTTPException(status_code=400, detail="El usuario ya existe")

    bd.add(Usuario(nombre_usuario=datos.nombre_usuario, contrasena=datos.contrasena, rol="estudiante"))
    bd.commit()
    return {"mensaje": "Registro completado (estudiante)"}


@app.post("/admin/crear-usuario")
def admin_crear_usuario(datos: SolicitudCrearUsuario, bd: Session = Depends(obtener_bd)):
    admin = obtener_usuario_por_nombre(bd, datos.nombre_usuario_admin)
    exigir_rol(admin, ["admin"])

    rol_objetivo = (datos.rol or "").strip().lower()
    if rol_objetivo not in ["estudiante", "docente"]:
        raise HTTPException(status_code=400, detail="Rol inválido (solo estudiante o docente)")

    existente = bd.query(Usuario).filter(Usuario.nombre_usuario == datos.nombre_usuario).first()
    if existente:
        raise HTTPException(status_code=400, detail="El usuario ya existe")

    bd.add(Usuario(nombre_usuario=datos.nombre_usuario, contrasena=datos.contrasena, rol=rol_objetivo))
    bd.commit()
    return {"mensaje": f"Usuario creado ({rol_objetivo})"}


@app.get("/admin/usuarios", response_model=list[RespuestaUsuario])
def admin_listar_usuarios(nombre_usuario: str, bd: Session = Depends(obtener_bd)):
    u = obtener_usuario_por_nombre(bd, nombre_usuario)
    exigir_rol(u, ["admin"])
    return bd.query(Usuario).order_by(Usuario.id.asc()).all()


@app.post("/escenario/crear", response_model=EscenarioInstanciaSalida)
def crear_escenario(datos: SolicitudCrearEscenario, bd: Session = Depends(obtener_bd)):
    usuario = obtener_usuario_por_nombre(bd, datos.nombre_usuario)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no existe")

    if not datos.forzar_nuevo:
        activo = bd.query(EscenarioActivoUsuario).filter(EscenarioActivoUsuario.usuario_id == usuario.id).first()
        if activo:
            inst = bd.query(EscenarioInstancia).filter(EscenarioInstancia.id == activo.instancia_id).first()
            if inst and inst.estado == "activo":
                vars_inst = bd.query(VariableInstancia).filter(VariableInstancia.instancia_id == inst.id).all()
                return EscenarioInstanciaSalida(
                    id=inst.id,
                    ejercicio_id=inst.ejercicio_id,
                    plantilla_id=inst.plantilla_id,
                    titulo_caso=inst.titulo_caso,
                    texto_caso=inst.texto_caso,
                    estado=inst.estado,
                    fecha_creacion=inst.fecha_creacion,
                    variables=[VariableInstanciaSalida(clave=v.clave, valor=v.valor) for v in vars_inst]
                )

    _, inst, _variables = obtener_o_crear_escenario_activo(bd, datos.nombre_usuario, datos.ejercicio_id, forzar_nuevo=datos.forzar_nuevo)
    vars_inst = bd.query(VariableInstancia).filter(VariableInstancia.instancia_id == inst.id).all()
    return EscenarioInstanciaSalida(
        id=inst.id,
        ejercicio_id=inst.ejercicio_id,
        plantilla_id=inst.plantilla_id,
        titulo_caso=inst.titulo_caso,
        texto_caso=inst.texto_caso,
        estado=inst.estado,
        fecha_creacion=inst.fecha_creacion,
        variables=[VariableInstanciaSalida(clave=v.clave, valor=v.valor) for v in vars_inst]
    )


@app.post("/admin/curso")
def admin_crear_curso(datos: SolicitudCrearCurso, bd: Session = Depends(obtener_bd)):
    usuario = obtener_usuario_por_nombre(bd, datos.nombre_usuario)
    exigir_rol(usuario, ["admin", "docente"])

    curso = Curso(
        titulo=datos.titulo,
        descripcion=datos.descripcion,
        nivel=datos.nivel,
        activo=True,
        creado_por_usuario_id=usuario.id
    )
    bd.add(curso)
    bd.commit()
    bd.refresh(curso)
    return {"mensaje": "Curso creado", "curso_id": curso.id}


@app.post("/admin/capitulo")
def admin_crear_capitulo(datos: SolicitudCrearCapitulo, bd: Session = Depends(obtener_bd)):
    usuario = obtener_usuario_por_nombre(bd, datos.nombre_usuario)
    exigir_rol(usuario, ["admin", "docente"])

    curso = bd.query(Curso).filter(Curso.id == datos.curso_id).first()
    if not curso:
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    cap = Capitulo(curso_id=datos.curso_id, titulo=datos.titulo, orden=datos.orden)
    bd.add(cap)
    bd.commit()
    bd.refresh(cap)
    return {"mensaje": "Capítulo creado", "capitulo_id": cap.id}


@app.post("/admin/leccion")
def admin_crear_leccion(datos: SolicitudCrearLeccion, bd: Session = Depends(obtener_bd)):
    usuario = obtener_usuario_por_nombre(bd, datos.nombre_usuario)
    exigir_rol(usuario, ["admin", "docente"])

    cap = bd.query(Capitulo).filter(Capitulo.id == datos.capitulo_id).first()
    if not cap:
        raise HTTPException(status_code=404, detail="Capítulo no encontrado")

    lec = Leccion(
        capitulo_id=datos.capitulo_id,
        titulo=datos.titulo,
        tipo=datos.tipo,
        orden=datos.orden,
        ruta_contenido=datos.ruta_contenido
    )
    bd.add(lec)
    bd.commit()
    bd.refresh(lec)
    return {"mensaje": "Lección creada", "leccion_id": lec.id}


@app.post("/admin/ejercicio")
def admin_crear_ejercicio(datos: SolicitudCrearEjercicio, bd: Session = Depends(obtener_bd)):
    usuario = obtener_usuario_por_nombre(bd, datos.nombre_usuario)
    exigir_rol(usuario, ["admin", "docente"])

    lec = bd.query(Leccion).filter(Leccion.id == datos.leccion_id).first()
    if not lec:
        raise HTTPException(status_code=404, detail="Lección no encontrada")

    ej = Ejercicio(
        leccion_id=datos.leccion_id,
        descripcion=datos.descripcion,
        tipo=datos.tipo,
        comandos_objetivo=datos.comandos_objetivo,
        tiempo_limite_seg=datos.tiempo_limite_seg
    )
    bd.add(ej)
    bd.commit()
    bd.refresh(ej)
    return {"mensaje": "Ejercicio creado", "ejercicio_id": ej.id}


@app.get("/contenido/estructura", response_model=EstructuraSalida)
def obtener_estructura(bd: Session = Depends(obtener_bd)):
    cursos = bd.query(Curso).order_by(Curso.id.asc()).all()
    salida = []
    for c in cursos:
        cap_list = bd.query(Capitulo).filter(Capitulo.curso_id == c.id).order_by(Capitulo.orden.asc()).all()
        caps = []
        for cap in cap_list:
            lec_list = bd.query(Leccion).filter(Leccion.capitulo_id == cap.id).order_by(Leccion.orden.asc()).all()
            lecs = []
            for lec in lec_list:
                ej_list = bd.query(Ejercicio).filter(Ejercicio.leccion_id == lec.id).order_by(Ejercicio.id.asc()).all()
                lecs.append({
                    "id": lec.id,
                    "titulo": lec.titulo,
                    "tipo": lec.tipo,
                    "orden": lec.orden,
                    "ruta_contenido": lec.ruta_contenido,
                    "ejercicios": [
                        {
                            "id": ej.id,
                            "descripcion": ej.descripcion,
                            "tipo": ej.tipo,
                            "comandos_objetivo": ej.comandos_objetivo,
                            "tiempo_limite_seg": ej.tiempo_limite_seg
                        }
                        for ej in ej_list
                    ]
                })
            caps.append({"id": cap.id, "titulo": cap.titulo, "orden": cap.orden, "lecciones": lecs})
        salida.append({"id": c.id, "titulo": c.titulo, "descripcion": c.descripcion, "nivel": c.nivel, "activo": c.activo, "capitulos": caps})
    return {"cursos": salida}


@app.post("/progreso/actualizar")
def actualizar_progreso(datos: SolicitudActualizarProgreso, bd: Session = Depends(obtener_bd)):
    usuario = obtener_usuario_por_nombre(bd, datos.nombre_usuario)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    leccion = bd.query(Leccion).filter(Leccion.id == datos.leccion_id).first()
    if not leccion:
        raise HTTPException(status_code=404, detail="Lección no encontrada")

    porcentaje_nuevo = max(0, min(100, int(datos.porcentaje)))

    registro = bd.query(ProgresoUsuario).filter(
        ProgresoUsuario.usuario_id == usuario.id,
        ProgresoUsuario.leccion_id == datos.leccion_id
    ).first()

    if registro:
        if porcentaje_nuevo > registro.porcentaje:
            registro.porcentaje = porcentaje_nuevo
        registro.completado = registro.porcentaje >= 100
        bd.commit()
        return {"mensaje": "Progreso actualizado", "porcentaje": registro.porcentaje, "completado": registro.completado}

    registro = ProgresoUsuario(
        usuario_id=usuario.id,
        leccion_id=datos.leccion_id,
        porcentaje=porcentaje_nuevo,
        completado=porcentaje_nuevo >= 100
    )
    bd.add(registro)
    bd.commit()
    return {"mensaje": "Progreso creado", "porcentaje": registro.porcentaje, "completado": registro.completado}


@app.get("/progreso/{nombre_usuario}")
def obtener_progreso_usuario(nombre_usuario: str, bd: Session = Depends(obtener_bd)):
    usuario = bd.query(Usuario).filter(Usuario.nombre_usuario == nombre_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    registros = (
        bd.query(ProgresoUsuario)
        .filter(ProgresoUsuario.usuario_id == usuario.id)
        .all()
    )

    progreso = [
        {
            "leccion_id": r.leccion_id,
            "porcentaje": r.porcentaje,
            "completado": r.completado,
            "ultima_actualizacion": r.ultima_actualizacion.isoformat() if r.ultima_actualizacion else None,
        }
        for r in registros
    ]

    return {
        "nombre_usuario": usuario.nombre_usuario,
        "rol": usuario.rol,
        "progreso": progreso
    }


@app.post("/intentos/crear")
def crear_intento(datos: SolicitudCrearIntento, bd: Session = Depends(obtener_bd)):
    usuario = obtener_usuario_por_nombre(bd, datos.nombre_usuario)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    ejercicio = bd.query(Ejercicio).filter(Ejercicio.id == datos.ejercicio_id).first()
    if not ejercicio:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")

    intento = IntentoEjercicio(
        usuario_id=usuario.id,
        ejercicio_id=datos.ejercicio_id,
        tiempo_seg=int(datos.tiempo_seg),
        errores=int(datos.errores),
        porcentaje=int(datos.porcentaje),
        estado=datos.estado
    )
    bd.add(intento)
    bd.commit()
    bd.refresh(intento)
    return {"mensaje": "Intento registrado", "intento_id": intento.id}


@app.get("/docente/intentos")
def docente_listar_intentos(nombre_usuario_docente: str, bd: Session = Depends(obtener_bd)):
    docente = obtener_usuario_por_nombre(bd, nombre_usuario_docente)
    exigir_rol(docente, ["admin", "docente"])

    intentos = bd.query(IntentoEjercicio).order_by(IntentoEjercicio.id.desc()).limit(100).all()
    salida = []
    for it in intentos:
        u = bd.query(Usuario).filter(Usuario.id == it.usuario_id).first()
        ej = bd.query(Ejercicio).filter(Ejercicio.id == it.ejercicio_id).first()
        salida.append({
            "intento_id": it.id,
            "usuario": u.nombre_usuario if u else None,
            "ejercicio_id": it.ejercicio_id,
            "estado": it.estado,
            "porcentaje": it.porcentaje,
            "tiempo_seg": it.tiempo_seg,
            "errores": it.errores,
            "tiene_evaluacion": it.evaluacion is not None,
            "descripcion_ejercicio": ej.descripcion if ej else None
        })
    return {"intentos": salida}


@app.get("/docente/intentos/{intento_id}")
def docente_detalle_intento(intento_id: int, nombre_usuario_docente: str, bd: Session = Depends(obtener_bd)):
    docente = obtener_usuario_por_nombre(bd, nombre_usuario_docente)
    exigir_rol(docente, ["admin", "docente"])

    it = bd.query(IntentoEjercicio).filter(IntentoEjercicio.id == intento_id).first()
    if not it:
        raise HTTPException(status_code=404, detail="Intento no encontrado")

    u = bd.query(Usuario).filter(Usuario.id == it.usuario_id).first()
    ej = bd.query(Ejercicio).filter(Ejercicio.id == it.ejercicio_id).first()

    evaluacion = None
    if it.evaluacion:
        evaluacion = {
            "id": it.evaluacion.id,
            "docente_id": it.evaluacion.docente_id,
            "nota": it.evaluacion.nota,
            "comentarios": it.evaluacion.comentarios,
            "fecha": it.evaluacion.fecha
        }

    return {
        "intento": {
            "id": it.id,
            "usuario": u.nombre_usuario if u else None,
            "usuario_id": it.usuario_id,
            "ejercicio_id": it.ejercicio_id,
            "descripcion_ejercicio": ej.descripcion if ej else None,
            "tipo_ejercicio": ej.tipo if ej else None,
            "estado": it.estado,
            "porcentaje": it.porcentaje,
            "tiempo_seg": it.tiempo_seg,
            "errores": it.errores,
            "fecha_inicio": it.fecha_inicio,
            "fecha_fin": it.fecha_fin,
            "evaluacion": evaluacion
        }
    }


@app.post("/docente/evaluar")
def docente_evaluar_intento(datos: SolicitudEvaluarIntento, bd: Session = Depends(obtener_bd)):
    docente = obtener_usuario_por_nombre(bd, datos.nombre_usuario_docente)
    exigir_rol(docente, ["admin", "docente"])

    intento = bd.query(IntentoEjercicio).filter(IntentoEjercicio.id == datos.intento_id).first()
    if not intento:
        raise HTTPException(status_code=404, detail="Intento no encontrado")

    existente = bd.query(EvaluacionDocente).filter(EvaluacionDocente.intento_id == intento.id).first()
    if existente:
        existente.nota = float(datos.nota)
        existente.comentarios = datos.comentarios
        bd.commit()
        return {"mensaje": "Evaluación actualizada"}

    ev = EvaluacionDocente(
        intento_id=intento.id,
        docente_id=docente.id,
        nota=float(datos.nota),
        comentarios=datos.comentarios
    )
    bd.add(ev)
    bd.commit()
    return {"mensaje": "Evaluación creada"}


@app.post("/simular/fuerza-bruta")
def simular_fuerza_bruta(body: SolicitudSimular, bd: Session = Depends(obtener_bd)):
    usuario, inst, variables = obtener_o_crear_escenario_activo(bd, body.nombre_usuario, ejercicio_id=1)

    ip = variables.get("ip_atacante")
    servicio = variables.get("servicio", "autenticación")
    usuario_objetivo = variables.get("usuario_objetivo", "admin")

    if not ip:
        raise HTTPException(status_code=500, detail="Escenario activo sin ip_atacante")

    bloqueada = bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip).first()
    if bloqueada:
        return {
            "mensaje": f"Simulación detenida: la IP {ip} está bloqueada",
            "tipo_ataque": "Fuerza Bruta",
            "ip": ip,
            "titulo_caso": inst.titulo_caso,
            "texto_caso": inst.texto_caso,
            "siguiente_paso": f"Usa 'show blocked' o 'unblock ip {ip}'"
        }

    for i in range(1, 11):
        bd.add(Evento(
            tipo_evento="Fuerza Bruta",
            ip_origen=ip,
            descripcion=f"Intento fallido de autenticación #{i} sobre {servicio} (cuenta objetivo: {usuario_objetivo})"
        ))
    bd.commit()

    intentos = bd.query(Evento).filter(Evento.ip_origen == ip, Evento.tipo_evento == "Fuerza Bruta").count()

    if intentos >= 5:
        bd.add(Alerta(
            titulo="Ataque de fuerza bruta detectado",
            severidad="Alta",
            descripcion=f"Se detectaron {intentos} intentos fallidos desde la IP {ip} (servicio: {servicio})"
        ))
        bd.commit()

    registrar_accion(bd, "simular fuerza-bruta", "OK", usuario_id=usuario.id)

    return {
        "mensaje": f"Simulación ejecutada - {intentos} intentos detectados",
        "tipo_ataque": "Fuerza Bruta",
        "ip": ip,
        "titulo_caso": inst.titulo_caso,
        "texto_caso": inst.texto_caso,
        "siguiente_paso": "Usa 'show alerts' o 'show events' para comenzar el análisis."
    }


@app.get("/estadisticas")
def obtener_estadisticas(db: Session = Depends(obtener_bd)) -> Dict[str, Any]:
    total_eventos = db.query(Evento).count()
    total_alertas = db.query(Alerta).count()

    eventos_recientes_db = (
        db.query(Evento)
        .order_by(Evento.fecha_creacion.desc())
        .limit(10)
        .all()
    )

    alertas_recientes_db = (
        db.query(Alerta)
        .order_by(Alerta.fecha_creacion.desc())
        .limit(10)
        .all()
    )

    eventos_recientes = [
        {
            "id": e.id,
            "tipo_evento": e.tipo_evento,
            "ip_origen": e.ip_origen,
            "descripcion": e.descripcion,
            "fecha_creacion": e.fecha_creacion.isoformat() if e.fecha_creacion else None,
        }
        for e in eventos_recientes_db
    ]

    alertas_recientes = [
        {
            "id": a.id,
            "titulo": a.titulo,
            "severidad": a.severidad,
            "descripcion": a.descripcion,
            "evento_id": a.evento_id,
            "fecha_creacion": a.fecha_creacion.isoformat() if a.fecha_creacion else None,
        }
        for a in alertas_recientes_db
    ]

    return {
        "total_eventos": total_eventos,
        "total_alertas": total_alertas,
        "eventos_recientes": eventos_recientes,
        "alertas_recientes": alertas_recientes,
    }


@app.post("/ia/feedback")
def ia_feedback(body: SolicitudFeedbackIA):
    prompt = f"""
Eres un docente universitario de ciberseguridad.
Contexto: laboratorio controlado (CyberLab). NO des instrucciones para atacar sistemas reales.
Tu tarea: explicar el comando del estudiante de forma didáctica y breve.

Formato obligatorio:
1) Qué hizo el comando
2) Por qué está bien o mal según la evidencia
3) Qué revisar a continuación

Nivel: {body.nivel}
Comando: {body.comando}
Resultado del sistema: {body.resultado}
Evidencia disponible:
{body.evidencia}
"""
    r = cliente_openai.responses.create(model="gpt-5-nano", input=prompt)
    return {"feedback": r.output_text}

@app.post("/terminal", response_model=RespuestaTerminal)
def ejecutar_terminal(datos: SolicitudTerminal, bd: Session = Depends(obtener_bd)):
    """
    Terminal estilo Linux (Kali-like).
    - Comandos en inglés (y alias en español opcionales).
    - Salidas realistas.
    - Registra en acciones_usuario.
    """

    usuario = bd.query(Usuario).filter(Usuario.nombre_usuario == datos.nombre_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no existe")

    raw = (datos.comando or "").strip()
    cmd = raw.strip()
    cmd_l = cmd.lower().strip()

    def guardar_accion(comando_txt: str, resultado_txt: str):
        bd.add(AccionUsuario(comando=comando_txt, resultado=resultado_txt, usuario_id=usuario.id))
        bd.commit()

    if not cmd:
        guardar_accion("(vacío)", "ERROR")
        return {"salida": "bash: command not found"}

    # Alias español -> comandos linux-like (opcional)
    alias = {
        "ayuda": "help",
        "estado": "status",
        "ver alertas": "show alerts",
        "ver eventos": "show events",
        "ver bloqueadas": "show blocked",
        "limpiar": "clear",
    }
    if cmd_l in alias:
        cmd_l = alias[cmd_l]
        cmd = cmd_l

    partes = cmd.strip().split()
    base = partes[0].lower() if partes else ""

    # clear
    if base in ["clear", "cls"]:
        guardar_accion(raw, "OK")
        return {"salida": "__LIMPIAR__"}

    # help
    if base in ["help", "?", "man"]:
        salida = (
            "CyberLab Terminal (kali-like)\n"
            "Available commands:\n"
            "  help | man                   - show this help\n"
            "  whoami                       - current user\n"
            "  pwd                          - print working directory\n"
            "  ls                           - list directory\n"
            "  ip a | ifconfig              - show interfaces\n"
            "  show ip                      - alias of ip a\n"
            "  status                       - lab status\n"
            "  show alerts                  - list alerts\n"
            "  show events                  - list events\n"
            "  show blocked                 - list blocked IPs\n"
            "  block <ip>                   - block an IP\n"
            "  unblock <ip>                 - unblock an IP\n"
            "  block ip <ip>                - block an IP (explicit)\n"
            "  unblock ip <ip>              - unblock an IP (explicit)\n"
            "  clear                        - clear screen\n"
        )
        guardar_accion(raw, "OK")
        return {"salida": salida}

    # whoami/pwd/ls/ip a
    if cmd_l == "whoami":
        guardar_accion(raw, "OK")
        return {"salida": usuario.nombre_usuario}

    if cmd_l == "pwd":
        guardar_accion(raw, "OK")
        return {"salida": "/home/cyberlab"}

    if cmd_l in ["ls", "ls -la", "ls -l"]:
        salida = (
            "drwxr-xr-x  2 cyberlab cyberlab 4096 May 19 22:00 .\n"
            "drwxr-xr-x  3 root    root    4096 May 19 22:00 ..\n"
            "-rw-r--r--  1 cyberlab cyberlab  220 May 19 22:00 README.txt\n"
            "drwxr-xr-x  2 cyberlab cyberlab 4096 May 19 22:00 evidence/\n"
        )
        guardar_accion(raw, "OK")
        return {"salida": salida}

    # show ip => ip a
    if cmd_l in ["show ip", "show ips"]:
        cmd_l = "ip a"

    if cmd_l in ["ip a", "ip addr", "ifconfig"]:
        salida = (
            "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\n"
            "    inet 127.0.0.1/8 scope host lo\n"
            "2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500\n"
            "    inet 192.168.1.10/24 brd 192.168.1.255 scope global eth0\n"
        )
        guardar_accion(raw, "OK")
        return {"salida": salida}

    # status / show alerts / show events / show blocked
    if cmd_l == "status":
        total_eventos = bd.query(Evento).count()
        total_alertas = bd.query(Alerta).count()
        activo_rel, inst_activa = obtener_instancia_activa_usuario(bd, usuario.id)
        total_bloq = 0
        if inst_activa:
            total_bloq = bd.query(BloqueoEscenario).filter(BloqueoEscenario.escenario_id == inst_activa.id).count()
        salida = (
            "System status: OK\n"
            f"events: {total_eventos}\n"
            f"alerts: {total_alertas}\n"
            f"blocked_ips: {total_bloq}\n"
            "lab: operational\n"
        )
        guardar_accion(raw, "OK")
        return {"salida": salida}

    if cmd_l == "show alerts":
        alertas = bd.query(Alerta).order_by(Alerta.fecha_creacion.desc()).limit(10).all()
        if not alertas:
            guardar_accion(raw, "OK")
            return {"salida": "No alerts."}

        lineas = []
        for a in alertas:
            ts = a.fecha_creacion.isoformat() if a.fecha_creacion else "unknown-time"
            lineas.append(f"{ts} | {a.severidad} | {a.titulo} | {a.descripcion}")
        guardar_accion(raw, "OK")
        return {"salida": "\n".join(lineas)}

    if cmd_l == "show events":
        eventos = bd.query(Evento).order_by(Evento.fecha_creacion.desc()).limit(10).all()
        if not eventos:
            guardar_accion(raw, "OK")
            return {"salida": "No events."}

        lineas = []
        for e in eventos:
            ts = e.fecha_creacion.isoformat() if e.fecha_creacion else "unknown-time"
            lineas.append(f"{ts} | {e.tipo_evento} | src={e.ip_origen} | {e.descripcion}")
        guardar_accion(raw, "OK")
        return {"salida": "\n".join(lineas)}

    if cmd_l == "show blocked":
        activo_rel, inst_activa = obtener_instancia_activa_usuario(bd, usuario.id)
        if not inst_activa:
            guardar_accion(raw, "OK")
            return {"salida": "No active scenario."}

        ips = bd.query(BloqueoEscenario).filter(BloqueoEscenario.escenario_id == inst_activa.id).order_by(BloqueoEscenario.fecha_creacion.desc()).all()
        if not ips:
            guardar_accion(raw, "OK")
            return {"salida": "No blocked IPs."}

        lineas = []
        for ip in ips:
            ts = ip.fecha_creacion.isoformat() if ip.fecha_creacion else "unknown-time"
            lineas.append(f"{ts} | {ip.direccion_ip} | reason={ip.motivo}")
        guardar_accion(raw, "OK")
        return {"salida": "\n".join(lineas)}

    # block ip <ip>
    if base == "block" and len(partes) == 3 and partes[1].lower() == "ip":
        ip_txt = partes[2].strip()
        existe = bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip_txt).first()
        if existe:
            guardar_accion(raw, "OK")
            return {"salida": f"iptables: IP {ip_txt} already blocked"}
        bd.add(IpBloqueada(direccion_ip=ip_txt, motivo="Manual block (operator)"))
        bd.commit()
        guardar_accion(raw, "OK")
        return {"salida": f"iptables: blocked {ip_txt}"}

    # unblock ip <ip>
    if base == "unblock" and len(partes) == 3 and partes[1].lower() == "ip":
        ip_txt = partes[2].strip()
        existe = bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip_txt).first()
        if not existe:
            guardar_accion(raw, "OK")
            return {"salida": f"iptables: IP {ip_txt} was not blocked"}
        bd.delete(existe)
        bd.commit()
        guardar_accion(raw, "OK")
        return {"salida": f"iptables: unblocked {ip_txt}"}

    # block <ip>
    if base == "block" and len(partes) == 2:
        ip_txt = partes[1].strip()
        existe = bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip_txt).first()
        if existe:
            guardar_accion(raw, "OK")
            return {"salida": f"iptables: IP {ip_txt} already blocked"}
        bd.add(IpBloqueada(direccion_ip=ip_txt, motivo="Manual block (operator)"))
        bd.commit()
        guardar_accion(raw, "OK")
        return {"salida": f"iptables: blocked {ip_txt}"}

    # unblock <ip>
    if base == "unblock" and len(partes) == 2:
        ip_txt = partes[1].strip()
        existe = bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip_txt).first()
        if not existe:
            guardar_accion(raw, "OK")
            return {"salida": f"iptables: IP {ip_txt} was not blocked"}
        bd.delete(existe)
        bd.commit()
        guardar_accion(raw, "OK")
        return {"salida": f"iptables: unblocked {ip_txt}"}

    guardar_accion(raw, "ERROR")
    return {"salida": f"bash: {raw}: command not found"}