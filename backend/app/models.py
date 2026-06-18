"""
models.py — Modelos ORM (tablas de la base de datos)
---------------------------------------------------------------------------
Cada clase que hereda de `Base` representa UNA tabla. Los `Column(...)`
definen las columnas y los `relationship(...)` enlazan tablas relacionadas
para poder navegarlas desde Python (ej: usuario.progreso).
SQLAlchemy genera el SQL real a partir de estas definiciones.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, Float, UniqueConstraint
from sqlalchemy.sql import func          # func.now() = fecha/hora actual de la BD
from sqlalchemy.orm import relationship   # enlaces entre tablas
from .database import Base                # clase base declarativa común


class Usuario(Base):
    """Cuenta de la plataforma: estudiante, docente o admin."""
    __tablename__ = "usuarios"  # nombre real de la tabla en la BD

    id = Column(Integer, primary_key=True, index=True)                      # identificador único (PK)
    nombre_usuario = Column(String, unique=True, index=True, nullable=False) # login interno, único
    nombre = Column(String, nullable=True)                                   # nombre real a mostrar
    correo = Column(String, unique=True, index=True, nullable=True)          # email, único
    contrasena = Column(String, nullable=False)                              # hash bcrypt (nunca texto plano)
    rol = Column(String, nullable=False, default="estudiante")              # estudiante | docente | admin
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now()) # se rellena sola al crear
    token_reset = Column(String, nullable=True)                              # token de recuperación de contraseña
    token_reset_expira = Column(DateTime(timezone=True), nullable=True)      # caducidad de ese token

    # Relaciones inversas: permiten acceder a los registros asociados del usuario.
    acciones = relationship("AccionUsuario", back_populates="usuario")       # comandos ejecutados
    progreso = relationship("ProgresoUsuario", back_populates="usuario")     # avance en lecciones
    cursos_creados = relationship("Curso", back_populates="creador")         # cursos que creó (docente)


class Evento(Base):
    """Evento de seguridad simulado en el laboratorio (ej: intento de login)."""
    __tablename__ = "eventos"

    id = Column(Integer, primary_key=True, index=True)
    tipo_evento = Column(String, nullable=False)    # categoría del evento
    ip_origen = Column(String, nullable=False)      # IP simulada que lo generó
    descripcion = Column(Text, nullable=False)      # detalle legible
    # Dueño del evento: cada estudiante ve solo su propio laboratorio
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True, index=True)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())


class Alerta(Base):
    """Alerta del IDS derivada de uno o más eventos sospechosos."""
    __tablename__ = "alertas"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)                          # título corto de la alerta
    severidad = Column(String, nullable=False)                       # baja | media | alta | crítica
    descripcion = Column(Text, nullable=False)                       # explicación de la amenaza
    evento_id = Column(Integer, ForeignKey("eventos.id"), nullable=True)  # evento que la originó
    # Dueño de la alerta: cada estudiante ve solo su propio laboratorio
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True, index=True)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())


class IpBloqueada(Base):
    """IP que un estudiante bloqueó en el firewall de su laboratorio."""
    __tablename__ = "ips_bloqueadas"
    # El firewall es por estudiante: cada uno bloquea en su propio laboratorio.
    # Dos alumnos pueden bloquear la misma IP sin chocar (unique compuesto).
    # UniqueConstraint(usuario_id, direccion_ip): un mismo alumno no puede
    # bloquear dos veces la misma IP, pero distintos alumnos sí pueden.
    __table_args__ = (
        UniqueConstraint("usuario_id", "direccion_ip", name="uq_ip_bloqueada_usuario_ip"),
    )

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True, index=True)  # dueño del bloqueo
    direccion_ip = Column(String, index=True, nullable=False)   # IP bloqueada
    motivo = Column(Text, nullable=False)                       # razón del bloqueo
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())


class AccionUsuario(Base):
    """Registro de cada comando que un usuario ejecuta en la terminal (auditoría)."""
    __tablename__ = "acciones_usuario"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    comando = Column(Text, nullable=False)    # comando escrito por el usuario
    resultado = Column(Text, nullable=False)  # salida que devolvió la terminal
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", back_populates="acciones")


# --- Modelo de curso/capítulo/lección (estructura jerárquica del contenido) ---
class Curso(Base):
    """Curso: contenedor de capítulos (estructura del material teórico)."""
    __tablename__ = "cursos"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    descripcion = Column(Text, nullable=True)
    nivel = Column(String, nullable=True)
    activo = Column(Boolean, default=True)   # permite ocultar el curso sin borrarlo

    creado_por_usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    creador = relationship("Usuario", back_populates="cursos_creados")
    # cascade="all, delete-orphan": al borrar el curso se borran sus capítulos.
    capitulos = relationship("Capitulo", back_populates="curso", cascade="all, delete-orphan")


class Capitulo(Base):
    """Capítulo dentro de un curso, con un orden único dentro de él."""
    __tablename__ = "capitulos"
    # No puede haber dos capítulos con el mismo "orden" en el mismo curso.
    __table_args__ = (
        UniqueConstraint("curso_id", "orden", name="uq_capitulo_curso_orden"),
    )

    id = Column(Integer, primary_key=True, index=True)
    curso_id = Column(Integer, ForeignKey("cursos.id"), nullable=False)
    titulo = Column(String, nullable=False)
    orden = Column(Integer, nullable=False)   # posición dentro del curso

    curso = relationship("Curso", back_populates="capitulos")
    lecciones = relationship("Leccion", back_populates="capitulo", cascade="all, delete-orphan")


class Leccion(Base):
    """Lección dentro de un capítulo, con un orden único dentro de él."""
    __tablename__ = "lecciones"
    __table_args__ = (
        UniqueConstraint("capitulo_id", "orden", name="uq_leccion_capitulo_orden"),
    )

    id = Column(Integer, primary_key=True, index=True)
    capitulo_id = Column(Integer, ForeignKey("capitulos.id"), nullable=False)

    titulo = Column(String, nullable=False)
    tipo = Column(String, nullable=False)             # tipo de contenido (teoría, práctica…)
    orden = Column(Integer, nullable=False)

    ruta_contenido = Column(String, nullable=True)    # ruta al archivo de contenido

    capitulo = relationship("Capitulo", back_populates="lecciones")
    progreso = relationship("ProgresoUsuario", back_populates="leccion", cascade="all, delete-orphan")


class ProgresoUsuario(Base):
    """Avance de UN usuario en UNA lección (cuánto leyó/completó)."""
    __tablename__ = "progreso_usuario"
    # Una sola fila de progreso por (usuario, lección).
    __table_args__ = (
        UniqueConstraint("usuario_id", "leccion_id", name="uq_progreso_usuario_leccion"),
    )

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    leccion_id = Column(Integer, ForeignKey("lecciones.id"), nullable=False)

    completado = Column(Boolean, default=False)   # ¿lección terminada?
    porcentaje = Column(Integer, default=0)       # 0–100 de avance

    # onupdate=func.now(): se actualiza sola cada vez que cambia la fila.
    ultima_actualizacion = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    usuario = relationship("Usuario", back_populates="progreso")
    leccion = relationship("Leccion", back_populates="progreso")


# ==========================================================
# EJERCICIOS CREADOS POR DOCENTE
# ==========================================================

class EjercicioDocente(Base):
    """Ejercicio práctico creado por un docente (de ataque o defensa)."""
    __tablename__ = "ejercicios_docente"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    descripcion = Column(Text, nullable=False)
    instrucciones = Column(Text, nullable=True)              # pasos/contexto adicional
    tipo = Column(String, nullable=False, default="ataque")  # ataque | defensa
    tiempo_minutos = Column(Integer, nullable=False, default=10)  # límite del temporizador
    contexto_generado = Column(Text, nullable=True)  # escenario IA
    nivel = Column(Integer, nullable=False, default=1)  # 1-7
    activo = Column(Boolean, default=False, nullable=False)  # ¿visible para estudiantes? (publicado)
    fecha_limite = Column(DateTime(timezone=True), nullable=True)  # plazo de entrega
    creado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

    creador = relationship("Usuario", foreign_keys=[creado_por_id])
    # items ordenados por su campo "orden"; se borran junto con el ejercicio.
    items = relationship("ItemEjercicioDocente", back_populates="ejercicio", cascade="all, delete-orphan", order_by="ItemEjercicioDocente.orden")
    entregas = relationship("EntregaEjercicioDocente", back_populates="ejercicio", cascade="all, delete-orphan")


class ItemEjercicioDocente(Base):
    """Cada punto del checklist de un ejercicio (lo que el alumno debe lograr)."""
    __tablename__ = "items_ejercicio_docente"

    id = Column(Integer, primary_key=True, index=True)
    ejercicio_id = Column(Integer, ForeignKey("ejercicios_docente.id"), nullable=False, index=True)
    descripcion = Column(Text, nullable=False)        # texto del paso a completar
    orden = Column(Integer, nullable=False, default=0)  # posición en la lista

    ejercicio = relationship("EjercicioDocente", back_populates="items")


class EntregaEjercicioDocente(Base):
    """Entrega de un estudiante para un ejercicio (con su resultado y nota)."""
    __tablename__ = "entregas_ejercicio_docente"
    # Un estudiante solo puede tener UNA entrega por ejercicio.
    __table_args__ = (UniqueConstraint("ejercicio_id", "usuario_id", name="uq_entrega_ejercicio_usuario"),)

    id = Column(Integer, primary_key=True, index=True)
    ejercicio_id = Column(Integer, ForeignKey("ejercicios_docente.id"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    respuesta = Column(Text, nullable=True)                        # resumen legible del desempeño
    estado = Column(String, nullable=False, default="entregado")  # entregado | evaluado
    nota = Column(Float, nullable=True)                            # nota 1.0–7.0 (None si no evaluada)
    comentarios_docente = Column(Text, nullable=True)              # retroalimentación del docente
    ayudas_pedidas = Column(Integer, nullable=False, default=0)    # nº de pistas usadas (penaliza)
    # Snapshot estructurado de la sesión al entregar (JSON): checklist con
    # comando/segundo por ítem, timeline de comandos, fases, pistas, cierre,
    # porcentajes y nota sugerida. La frase legible queda en `respuesta`.
    detalle = Column(Text, nullable=True)
    # El docente puede reabrir la entrega para que el estudiante vuelva a
    # rendir el ejercicio. Mientras está True, el alumno puede iniciarlo de
    # nuevo y la siguiente entrega reemplaza a esta (limpiando la nota).
    reintento_habilitado = Column(Boolean, default=False, nullable=False)
    fecha_entrega = Column(DateTime(timezone=True), server_default=func.now())   # cuándo entregó
    fecha_evaluacion = Column(DateTime(timezone=True), nullable=True)            # cuándo se puso la nota

    ejercicio = relationship("EjercicioDocente", back_populates="entregas")
    usuario = relationship("Usuario", foreign_keys=[usuario_id])


class ContenidoInformativo(Base):
    """Override editable del contenido teórico de un nivel. Si existe una fila
    para (tipo, nivel, seccion), el visor la usa en vez del archivo .md estático.
    Permite editar la teoría desde el panel sin tocar archivos."""
    __tablename__ = "contenido_informativo"
    __table_args__ = (UniqueConstraint("tipo", "nivel", "seccion", name="uq_contenido_tipo_nivel_seccion"),)

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String, nullable=False)       # ataque | defensa
    nivel = Column(Integer, nullable=False)     # 1-7
    seccion = Column(String, nullable=False)    # introduccion, objetivos, ...
    contenido = Column(Text, nullable=False, default="")   # texto Markdown que reemplaza al .md

    actualizado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)  # quién editó
    fecha_actualizacion = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class SesionEjercicio(Base):
    """Sesión activa de un ejercicio docente. El backend es la fuente de verdad
    del checklist, el temporizador y el resultado — el frontend solo visualiza."""
    __tablename__ = "sesiones_ejercicio"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    ejercicio_id = Column(Integer, ForeignKey("ejercicios_docente.id"), nullable=False, index=True)

    estado = Column(String, nullable=False, default="activa")  # activa | completada | expirada
    items_estado = Column(Text, nullable=False, default="{}")  # JSON {item_id: bool} (checklist)
    ayudas = Column(Integer, nullable=False, default=0)        # pistas pedidas en esta sesión
    # IP del atacante del escenario — generada por el servidor y nunca
    # expuesta al cliente: el estudiante debe descubrirla en los logs
    ip_atacante = Column(String, nullable=True)
    # Niveles 6-7 (multi-vector): JSON con todas las IPs maliciosas;
    # ip_atacante mantiene la principal por compatibilidad
    ips_atacantes = Column(Text, nullable=True)
    # Plan de fases del ataque en tiempo real (JSON): el ataque escala
    # con el tiempo si el estudiante no lo contiene
    fases = Column(Text, nullable=False, default="[]")
    # Pistas solicitadas (JSON): [{"seg": segundos desde el inicio, "texto": pista}]
    pistas = Column(Text, nullable=True)

    fecha_inicio = Column(DateTime(timezone=True), server_default=func.now())  # arranque del temporizador
    fecha_limite = Column(DateTime(timezone=True), nullable=False)             # inicio + tiempo_minutos
    fecha_fin = Column(DateTime(timezone=True), nullable=True)                 # cuándo se cerró (si ya cerró)

    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    ejercicio = relationship("EjercicioDocente", foreign_keys=[ejercicio_id])
