"""
schemas.py — Esquemas de validación (Pydantic)
---------------------------------------------------------------------------
Pydantic valida y da forma a los datos que ENTRAN (cuerpos de las peticiones)
y SALEN (respuestas) de la API. Por convención aquí:
  • "Solicitud..." = lo que el cliente envía (FastAPI valida tipos y reglas).
  • "...Salida"    = lo que la API responde (estructura del JSON de respuesta).
Si un dato no cumple el tipo/regla, FastAPI responde 422 automáticamente.
"""
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime


class SolicitudInicioSesion(BaseModel):
    """Cuerpo del login: correo + contraseña."""
    correo: str
    contrasena: str


class SolicitudRegistroEstudiante(BaseModel):
    """Cuerpo del registro público de un estudiante."""
    nombre: str
    correo: str
    contrasena: str

    # Validador de campo: se ejecuta al recibir el dato y rechaza contraseñas cortas.
    @field_validator("contrasena")
    @classmethod
    def validar_contrasena(cls, v):
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


class SolicitudFeedbackIA(BaseModel):
    """Datos para pedir retroalimentación de la IA sobre un comando ejecutado."""
    nivel: int
    comando: str
    resultado: str
    evidencia: str


class SolicitudCrearUsuario(BaseModel):
    """Cuerpo para que un admin cree un usuario (incluye el rol)."""
    nombre: str
    correo: str
    contrasena: str
    rol: str

    @field_validator("contrasena")
    @classmethod
    def validar_contrasena(cls, v):
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


# --- Esquemas de la estructura de cursos/capítulos/lecciones ---
class SolicitudCrearCurso(BaseModel):
    """Cuerpo para crear un curso (campos opcionales con default None)."""
    nombre_usuario: str
    titulo: str
    descripcion: Optional[str] = None   # Optional = puede no venir
    nivel: Optional[str] = None


class SolicitudCrearCapitulo(BaseModel):
    """Cuerpo para crear un capítulo dentro de un curso."""
    nombre_usuario: str
    curso_id: int
    titulo: str
    orden: int


class SolicitudCrearLeccion(BaseModel):
    """Cuerpo para crear una lección dentro de un capítulo."""
    nombre_usuario: str
    capitulo_id: int
    titulo: str
    tipo: str
    orden: int
    ruta_contenido: Optional[str] = None


class SolicitudCrearEjercicio(BaseModel):
    """Cuerpo para crear un ejercicio (modelo antiguo, ligado a una lección)."""
    nombre_usuario: str
    leccion_id: int
    descripcion: str
    tipo: str
    comandos_objetivo: int = 10     # valor por defecto si no se envía
    tiempo_limite_seg: int = 600


class SolicitudActualizarProgreso(BaseModel):
    """Cuerpo para marcar el avance de lectura de una lección."""
    nombre_usuario: str
    leccion_id: int
    porcentaje: int


class SolicitudEvaluarIntento(BaseModel):
    """Cuerpo para que el docente evalúe un intento de terminal."""
    nombre_usuario_docente: str
    intento_id: int
    nota: float
    comentarios: Optional[str] = None


class SolicitudSimular(BaseModel):
    """Cuerpo mínimo para disparar la simulación del laboratorio de un usuario."""
    nombre_usuario: str


# ============================
# ESCENARIOS VARIABLES (NUEVO)
# ============================

class SolicitudCrearEscenario(BaseModel):
    """Pide instanciar un escenario para un ejercicio (forzar_nuevo regenera uno)."""
    nombre_usuario: str
    ejercicio_id: int
    forzar_nuevo: bool = False


class VariableInstanciaSalida(BaseModel):
    """Par clave/valor de una variable del escenario instanciado."""
    clave: str
    valor: str


class EscenarioInstanciaSalida(BaseModel):
    """Respuesta con el escenario concreto generado para un ejercicio."""
    id: int
    ejercicio_id: int
    plantilla_id: int
    titulo_caso: str
    texto_caso: str
    estado: str
    fecha_creacion: datetime
    variables: List[VariableInstanciaSalida] = []   # lista de variables del caso


# ============================
# TERMINAL (LINUX-LIKE)
# ============================

class SolicitudTerminal(BaseModel):
    """Cuerpo cuando el estudiante ejecuta un comando en la terminal de ataque."""
    nombre_usuario: str
    comando: str


class RespuestaTerminal(BaseModel):
    """Respuesta de la terminal: salida de texto + estado de la sesión activa."""
    salida: str
    # Estado de la sesión de ejercicio activa, validado por el backend
    sesion: dict | None = None   # None si no hay ejercicio en curso


# ============================
# RESPUESTAS (Swagger)
# ============================

# Estos esquemas "Salida" anidados describen la estructura completa de un curso
# (curso → capítulos → lecciones → ejercicios) para el JSON de respuesta.
class EjercicioSalida(BaseModel):
    """Ejercicio tal como se devuelve dentro de una lección."""
    id: int
    descripcion: str
    tipo: str
    comandos_objetivo: int
    tiempo_limite_seg: int


class LeccionSalida(BaseModel):
    """Lección con su lista de ejercicios."""
    id: int
    titulo: str
    tipo: str
    orden: int
    ruta_contenido: Optional[str] = None
    ejercicios: List[EjercicioSalida] = []


class CapituloSalida(BaseModel):
    """Capítulo con su lista de lecciones."""
    id: int
    titulo: str
    orden: int
    lecciones: List[LeccionSalida] = []


class CursoSalida(BaseModel):
    """Curso completo con sus capítulos anidados."""
    id: int
    titulo: str
    descripcion: Optional[str] = None
    nivel: Optional[str] = None
    activo: bool
    capitulos: List[CapituloSalida] = []


class EstructuraSalida(BaseModel):
    """Raíz de la estructura: lista de todos los cursos."""
    cursos: List[CursoSalida] = []


class RespuestaUsuario(BaseModel):
    """Datos públicos de un usuario que devuelve la API (sin la contraseña)."""
    id: int
    nombre_usuario: str
    nombre: Optional[str] = None
    correo: Optional[str] = None
    rol: str
    fecha_creacion: datetime

    class Config:
        # from_attributes permite construir este esquema directo desde un objeto
        # ORM (modelo SQLAlchemy), leyendo sus atributos.
        from_attributes = True

class SolicitudTerminalDefensa(BaseModel):
    """Cuerpo de un comando en la terminal de defensa (puede incluir la IP del escenario)."""
    nombre_usuario: str
    comando: str
    ip_escenario: str | None = None


class SolicitudCambiarRol(BaseModel):
    """Cuerpo para cambiar el rol de un usuario (admin)."""
    nombre_usuario: str
    nuevo_rol: str


class SolicitudEliminarUsuario(BaseModel):
    """Cuerpo para eliminar un usuario (incluye quién lo solicita)."""
    nombre_usuario: str
    nombre_usuario_admin: str


# ============================
# EJERCICIOS DOCENTE
# ============================

class ItemEjercicioDocenteEntrada(BaseModel):
    """Un punto del checklist al crear un ejercicio."""
    descripcion: str
    orden: int = 0


class SolicitudCrearEjercicioDocente(BaseModel):
    """Cuerpo para crear un ejercicio docente con todos sus parámetros."""
    # Opcional: si no se entrega, el backend genera uno según tipo y nivel
    titulo: Optional[str] = None
    descripcion: str
    instrucciones: Optional[str] = None
    tipo: str = "ataque"            # ataque | defensa
    nivel: int = 1                  # 1–7
    tiempo_minutos: int = 10        # límite del temporizador
    fecha_limite: datetime          # plazo de entrega (obligatorio)
    visible: bool = False           # publicar de inmediato
    items: List[ItemEjercicioDocenteEntrada] = []   # checklist


class SolicitudIaAsistir(BaseModel):
    """Cuerpo para pedir a la IA que genere el contenido de un ejercicio."""
    titulo: Optional[str] = None
    tipo: str = "ataque"
    nivel: int = 1
    num_puntos: int = 4             # cuántos puntos del checklist generar


class ItemEjercicioDocenteSalida(BaseModel):
    """Item del checklist tal como se devuelve en la respuesta."""
    id: int
    descripcion: str
    orden: int

    class Config:
        from_attributes = True   # construible desde el objeto ORM


class EjercicioDocenteSalida(BaseModel):
    """Ejercicio docente completo en el JSON de respuesta."""
    id: int
    titulo: str
    descripcion: str
    instrucciones: Optional[str] = None
    activo: bool
    fecha_limite: Optional[datetime] = None
    creado_por: str
    fecha_creacion: datetime
    items: List[ItemEjercicioDocenteSalida] = []

    class Config:
        from_attributes = True


class SolicitudEntregarEjercicio(BaseModel):
    """Cuerpo de la entrega de un ejercicio por el estudiante."""
    respuesta: Optional[str] = None
    ayudas_pedidas: int = 0


class SolicitudEvaluarEntrega(BaseModel):
    """Cuerpo para que el docente evalúe una entrega (nota + comentarios)."""
    nota: float
    comentarios: Optional[str] = None


class SolicitudGuardarContenido(BaseModel):
    """Contenido markdown de una sección teórica editada desde el panel."""
    contenido: str


class EntregaSalida(BaseModel):
    """Entrega tal como se devuelve en las listas/respuestas de la API."""
    id: int
    ejercicio_id: int
    usuario: str
    respuesta: Optional[str] = None
    estado: str
    nota: Optional[float] = None
    comentarios_docente: Optional[str] = None
    fecha_entrega: datetime

    class Config:
        from_attributes = True


# ── Perfil de usuario ────────────────────────────────────────────

class SolicitudActualizarPerfil(BaseModel):
    """Cuerpo para actualizar el nombre y nombre de usuario del propio perfil."""
    nombre: str
    nombre_usuario: str


class SolicitudCambiarContrasenaPerfil(BaseModel):
    """Cuerpo para cambiar la propia contraseña (requiere la actual)."""
    contrasena_actual: str
    nueva_contrasena: str

    @field_validator("nueva_contrasena")
    @classmethod
    def validar_contrasena(cls, v):
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


# ── Recuperación de contraseña ────────────────────────────────────

class SolicitudRecuperarContrasena(BaseModel):
    """Cuerpo del primer paso: solo el correo al que enviar el enlace."""
    correo: str


class SolicitudResetContrasena(BaseModel):
    """Cuerpo del segundo paso: token del enlace + nueva contraseña."""
    token: str
    nueva_contrasena: str

    @field_validator("nueva_contrasena")
    @classmethod
    def validar_contrasena(cls, v):
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v
