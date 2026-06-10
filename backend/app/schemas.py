from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime


class SolicitudInicioSesion(BaseModel):
    correo: str
    contrasena: str


class SolicitudRegistroEstudiante(BaseModel):
    nombre: str
    correo: str
    contrasena: str

    @field_validator("contrasena")
    @classmethod
    def validar_contrasena(cls, v):
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


class SolicitudFeedbackIA(BaseModel):
    nivel: int
    comando: str
    resultado: str
    evidencia: str


class SolicitudCrearUsuario(BaseModel):
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
    # Estado de la sesión de ejercicio activa, validado por el backend
    sesion: dict | None = None


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
    nombre: Optional[str] = None
    correo: Optional[str] = None
    rol: str
    fecha_creacion: datetime

    class Config:
        from_attributes = True

class SolicitudTerminalDefensa(BaseModel):
    nombre_usuario: str
    comando: str
    ip_escenario: str | None = None


class SolicitudCambiarRol(BaseModel):
    nombre_usuario: str
    nuevo_rol: str


class SolicitudEliminarUsuario(BaseModel):
    nombre_usuario: str
    nombre_usuario_admin: str


# ============================
# EJERCICIOS DOCENTE
# ============================

class ItemEjercicioDocenteEntrada(BaseModel):
    descripcion: str
    orden: int = 0


class SolicitudCrearEjercicioDocente(BaseModel):
    # Opcional: si no se entrega, el backend genera uno según tipo y nivel
    titulo: Optional[str] = None
    descripcion: str
    instrucciones: Optional[str] = None
    tipo: str = "ataque"
    nivel: int = 1
    tiempo_minutos: int = 10
    fecha_limite: datetime
    visible: bool = False
    items: List[ItemEjercicioDocenteEntrada] = []


class SolicitudIaAsistir(BaseModel):
    titulo: Optional[str] = None
    tipo: str = "ataque"
    nivel: int = 1
    num_puntos: int = 4


class ItemEjercicioDocenteSalida(BaseModel):
    id: int
    descripcion: str
    orden: int

    class Config:
        from_attributes = True


class EjercicioDocenteSalida(BaseModel):
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
    respuesta: Optional[str] = None
    ayudas_pedidas: int = 0


class SolicitudEvaluarEntrega(BaseModel):
    nota: float
    comentarios: Optional[str] = None


class EntregaSalida(BaseModel):
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
    nombre: str
    nombre_usuario: str


class SolicitudCambiarContrasenaPerfil(BaseModel):
    contrasena_actual: str
    nueva_contrasena: str

    @field_validator("nueva_contrasena")
    @classmethod
    def validar_contrasena(cls, v):
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


# ── Anuncios docente ──────────────────────────────────────────────

class SolicitudCrearAnuncio(BaseModel):
    titulo: str
    mensaje: str
    tipo: str = "aviso"  # urgente | aviso | info


class SolicitudEditarAnuncio(BaseModel):
    titulo: str
    mensaje: str
    tipo: str


# ── Recuperación de contraseña ────────────────────────────────────

class SolicitudRecuperarContrasena(BaseModel):
    correo: str


class SolicitudResetContrasena(BaseModel):
    token: str
    nueva_contrasena: str

    @field_validator("nueva_contrasena")
    @classmethod
    def validar_contrasena(cls, v):
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v
