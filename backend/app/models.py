from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, Float, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre_usuario = Column(String, unique=True, index=True, nullable=False)
    nombre = Column(String, nullable=True)
    correo = Column(String, unique=True, index=True, nullable=True)
    contrasena = Column(String, nullable=False)
    rol = Column(String, nullable=False, default="estudiante")
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    token_reset = Column(String, nullable=True)
    token_reset_expira = Column(DateTime(timezone=True), nullable=True)

    acciones = relationship("AccionUsuario", back_populates="usuario")
    progreso = relationship("ProgresoUsuario", back_populates="usuario")
    cursos_creados = relationship("Curso", back_populates="creador")


class Evento(Base):
    __tablename__ = "eventos"

    id = Column(Integer, primary_key=True, index=True)
    tipo_evento = Column(String, nullable=False)
    ip_origen = Column(String, nullable=False)
    descripcion = Column(Text, nullable=False)
    # Dueño del evento: cada estudiante ve solo su propio laboratorio
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True, index=True)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())


class Alerta(Base):
    __tablename__ = "alertas"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    severidad = Column(String, nullable=False)
    descripcion = Column(Text, nullable=False)
    evento_id = Column(Integer, ForeignKey("eventos.id"), nullable=True)
    # Dueño de la alerta: cada estudiante ve solo su propio laboratorio
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True, index=True)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())


class IpBloqueada(Base):
    __tablename__ = "ips_bloqueadas"
    # El firewall es por estudiante: cada uno bloquea en su propio laboratorio.
    # Dos alumnos pueden bloquear la misma IP sin chocar (unique compuesto).
    __table_args__ = (
        UniqueConstraint("usuario_id", "direccion_ip", name="uq_ip_bloqueada_usuario_ip"),
    )

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True, index=True)
    direccion_ip = Column(String, index=True, nullable=False)
    motivo = Column(Text, nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())


class AccionUsuario(Base):
    __tablename__ = "acciones_usuario"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    comando = Column(Text, nullable=False)
    resultado = Column(Text, nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", back_populates="acciones")


class Curso(Base):
    __tablename__ = "cursos"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    descripcion = Column(Text, nullable=True)
    nivel = Column(String, nullable=True)
    activo = Column(Boolean, default=True)

    creado_por_usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    creador = relationship("Usuario", back_populates="cursos_creados")
    capitulos = relationship("Capitulo", back_populates="curso", cascade="all, delete-orphan")


class Capitulo(Base):
    __tablename__ = "capitulos"
    __table_args__ = (
        UniqueConstraint("curso_id", "orden", name="uq_capitulo_curso_orden"),
    )

    id = Column(Integer, primary_key=True, index=True)
    curso_id = Column(Integer, ForeignKey("cursos.id"), nullable=False)
    titulo = Column(String, nullable=False)
    orden = Column(Integer, nullable=False)

    curso = relationship("Curso", back_populates="capitulos")
    lecciones = relationship("Leccion", back_populates="capitulo", cascade="all, delete-orphan")


class Leccion(Base):
    __tablename__ = "lecciones"
    __table_args__ = (
        UniqueConstraint("capitulo_id", "orden", name="uq_leccion_capitulo_orden"),
    )

    id = Column(Integer, primary_key=True, index=True)
    capitulo_id = Column(Integer, ForeignKey("capitulos.id"), nullable=False)

    titulo = Column(String, nullable=False)
    tipo = Column(String, nullable=False)
    orden = Column(Integer, nullable=False)

    ruta_contenido = Column(String, nullable=True)

    capitulo = relationship("Capitulo", back_populates="lecciones")
    progreso = relationship("ProgresoUsuario", back_populates="leccion", cascade="all, delete-orphan")


class ProgresoUsuario(Base):
    __tablename__ = "progreso_usuario"
    __table_args__ = (
        UniqueConstraint("usuario_id", "leccion_id", name="uq_progreso_usuario_leccion"),
    )

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    leccion_id = Column(Integer, ForeignKey("lecciones.id"), nullable=False)

    completado = Column(Boolean, default=False)
    porcentaje = Column(Integer, default=0)

    ultima_actualizacion = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    usuario = relationship("Usuario", back_populates="progreso")
    leccion = relationship("Leccion", back_populates="progreso")


# ==========================================================
# EJERCICIOS CREADOS POR DOCENTE
# ==========================================================

class EjercicioDocente(Base):
    __tablename__ = "ejercicios_docente"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    descripcion = Column(Text, nullable=False)
    instrucciones = Column(Text, nullable=True)
    tipo = Column(String, nullable=False, default="ataque")  # ataque | defensa
    tiempo_minutos = Column(Integer, nullable=False, default=10)
    contexto_generado = Column(Text, nullable=True)  # escenario IA
    nivel = Column(Integer, nullable=False, default=1)  # 1-7
    activo = Column(Boolean, default=False, nullable=False)
    fecha_limite = Column(DateTime(timezone=True), nullable=True)
    creado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

    creador = relationship("Usuario", foreign_keys=[creado_por_id])
    items = relationship("ItemEjercicioDocente", back_populates="ejercicio", cascade="all, delete-orphan", order_by="ItemEjercicioDocente.orden")
    entregas = relationship("EntregaEjercicioDocente", back_populates="ejercicio", cascade="all, delete-orphan")


class ItemEjercicioDocente(Base):
    __tablename__ = "items_ejercicio_docente"

    id = Column(Integer, primary_key=True, index=True)
    ejercicio_id = Column(Integer, ForeignKey("ejercicios_docente.id"), nullable=False, index=True)
    descripcion = Column(Text, nullable=False)
    orden = Column(Integer, nullable=False, default=0)

    ejercicio = relationship("EjercicioDocente", back_populates="items")


class EntregaEjercicioDocente(Base):
    __tablename__ = "entregas_ejercicio_docente"
    __table_args__ = (UniqueConstraint("ejercicio_id", "usuario_id", name="uq_entrega_ejercicio_usuario"),)

    id = Column(Integer, primary_key=True, index=True)
    ejercicio_id = Column(Integer, ForeignKey("ejercicios_docente.id"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    respuesta = Column(Text, nullable=True)
    estado = Column(String, nullable=False, default="entregado")  # entregado | evaluado
    nota = Column(Float, nullable=True)
    comentarios_docente = Column(Text, nullable=True)
    ayudas_pedidas = Column(Integer, nullable=False, default=0)
    # Snapshot estructurado de la sesión al entregar (JSON): checklist con
    # comando/segundo por ítem, timeline de comandos, fases, pistas, cierre,
    # porcentajes y nota sugerida. La frase legible queda en `respuesta`.
    detalle = Column(Text, nullable=True)
    # El docente puede reabrir la entrega para que el estudiante vuelva a
    # rendir el ejercicio. Mientras está True, el alumno puede iniciarlo de
    # nuevo y la siguiente entrega reemplaza a esta (limpiando la nota).
    reintento_habilitado = Column(Boolean, default=False, nullable=False)
    fecha_entrega = Column(DateTime(timezone=True), server_default=func.now())
    fecha_evaluacion = Column(DateTime(timezone=True), nullable=True)

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
    contenido = Column(Text, nullable=False, default="")

    actualizado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    fecha_actualizacion = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class SesionEjercicio(Base):
    """Sesión activa de un ejercicio docente. El backend es la fuente de verdad
    del checklist, el temporizador y el resultado — el frontend solo visualiza."""
    __tablename__ = "sesiones_ejercicio"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    ejercicio_id = Column(Integer, ForeignKey("ejercicios_docente.id"), nullable=False, index=True)

    estado = Column(String, nullable=False, default="activa")  # activa | completada | expirada
    items_estado = Column(Text, nullable=False, default="{}")  # JSON {item_id: bool}
    ayudas = Column(Integer, nullable=False, default=0)
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

    fecha_inicio = Column(DateTime(timezone=True), server_default=func.now())
    fecha_limite = Column(DateTime(timezone=True), nullable=False)
    fecha_fin = Column(DateTime(timezone=True), nullable=True)

    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    ejercicio = relationship("EjercicioDocente", foreign_keys=[ejercicio_id])
