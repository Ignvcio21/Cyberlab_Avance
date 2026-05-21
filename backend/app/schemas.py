from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SolicitudInicioSesion(BaseModel):
    nombre_usuario: str
    contrasena: str


class SolicitudRegistroEstudiante(BaseModel):
    nombre_usuario: str
    contrasena: str


class SolicitudFeedbackIA(BaseModel):
    nivel: int
    comando: str
    resultado: str
    evidencia: str


class SolicitudCrearUsuario(BaseModel):
    nombre_usuario_admin: str
    nombre_usuario: str
    contrasena: str
    rol: str


class SolicitudCrearCurso(BaseModel):
    nombre_usuario: str
    titulo: str
    descripcion: Optional[str] = None
    nivel: Optional[str] = None


class SolicitudCrearCapitulo(BaseModel):
    nombre_usuario: str
    curso_id: int
    titulo: str
    orden: int


class SolicitudCrearLeccion(BaseModel):
    nombre_usuario: str
    capitulo_id: int
    titulo: str
    tipo: str
    orden: int
    ruta_contenido: Optional[str] = None


class SolicitudCrearEjercicio(BaseModel):
    nombre_usuario: str
    leccion_id: int
    descripcion: str
    tipo: str
    comandos_objetivo: int = 10
    tiempo_limite_seg: int = 600


class SolicitudActualizarProgreso(BaseModel):
    nombre_usuario: str
    leccion_id: int
    porcentaje: int


class SolicitudCrearIntento(BaseModel):
    nombre_usuario: str
    ejercicio_id: int
    tiempo_seg: int
    errores: int
    porcentaje: int
    estado: str


class SolicitudEvaluarIntento(BaseModel):
    nombre_usuario_docente: str
    intento_id: int
    nota: float
    comentarios: Optional[str] = None


class SolicitudSimular(BaseModel):
    nombre_usuario: str


# ============================
# ESCENARIOS VARIABLES (NUEVO)
# ============================

class SolicitudCrearEscenario(BaseModel):
    nombre_usuario: str
    ejercicio_id: int
    forzar_nuevo: bool = False


class VariableInstanciaSalida(BaseModel):
    clave: str
    valor: str


class EscenarioInstanciaSalida(BaseModel):
    id: int
    ejercicio_id: int
    plantilla_id: int
    titulo_caso: str
    texto_caso: str
    estado: str
    fecha_creacion: datetime
    variables: List[VariableInstanciaSalida] = []


# ============================
# TERMINAL (LINUX-LIKE)
# ============================

class SolicitudTerminal(BaseModel):
    nombre_usuario: str
    comando: str


class RespuestaTerminal(BaseModel):
    salida: str


# ============================
# RESPUESTAS (Swagger)
# ============================

class EjercicioSalida(BaseModel):
    id: int
    descripcion: str
    tipo: str
    comandos_objetivo: int
    tiempo_limite_seg: int


class LeccionSalida(BaseModel):
    id: int
    titulo: str
    tipo: str
    orden: int
    ruta_contenido: Optional[str] = None
    ejercicios: List[EjercicioSalida] = []


class CapituloSalida(BaseModel):
    id: int
    titulo: str
    orden: int
    lecciones: List[LeccionSalida] = []


class CursoSalida(BaseModel):
    id: int
    titulo: str
    descripcion: Optional[str] = None
    nivel: Optional[str] = None
    activo: bool
    capitulos: List[CapituloSalida] = []


class EstructuraSalida(BaseModel):
    cursos: List[CursoSalida] = []


class RespuestaUsuario(BaseModel):
    id: int
    nombre_usuario: str
    rol: str
    fecha_creacion: datetime

    class Config:
        from_attributes = True