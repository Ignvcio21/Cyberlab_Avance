"""
observadores.py — Patrón de diseño OBSERVER (Observador)

El laboratorio funciona como un IDS: cuando ocurren EVENTOS, unos detectores
los "observan" y, si se cumple una condición sospechosa (umbral de eventos),
emiten una ALERTA. El patrón Observer DESACOPLA quién genera los eventos de
quién reacciona ante ellos.

- Sujeto (SujetoEventos): registra los eventos y notifica a sus observadores.
- Observadores (DetectorFuerzaBruta, DetectorEscaneoPuertos): cuentan eventos
  de su tipo y crean la alerta cuando se alcanza el umbral.

Agregar una nueva detección = crear un detector nuevo y suscribirlo, sin tocar
ni las estrategias ni el resto del flujo.
"""
from abc import ABC, abstractmethod          # ABC = clase base abstracta; abstractmethod = método obligatorio en las hijas

from sqlalchemy.orm import Session           # Session = tipo de la conexión a la base de datos

from .models import Evento, Alerta           # Evento y Alerta = tablas que se persisten


class ObservadorEvento(ABC):
    """Interfaz común a todos los detectores (observadores)."""

    @abstractmethod                          # cada detector concreto DEBE implementar cómo reacciona a un evento
    def al_evento(self, evento) -> None:
        """Se llama por cada evento registrado: el detector acumula su estado."""
        ...                                  # cuerpo vacío: la lógica vive en cada subclase

    @abstractmethod                          # cada detector concreto DEBE implementar cómo emite su alerta
    def emitir(self, bd: Session, usuario_id: int) -> None:
        """Se llama al final de la siembra: si corresponde, crea la alerta."""
        ...                                  # cuerpo vacío: la lógica vive en cada subclase


class SujetoEventos:
    """Sujeto observable: centraliza el registro de eventos y avisa a los
    observadores suscritos. Es el corazón del patrón Observer."""

    def __init__(self):
        self._observadores = []              # lista de detectores suscritos a este sujeto

    def suscribir(self, observador: ObservadorEvento) -> None:
        """Agrega un observador a la lista de notificación."""
        self._observadores.append(observador)  # el detector queda registrado para recibir avisos

    def registrar(self, bd: Session, evento, usuario_id: int) -> None:
        """Persiste el evento en la base de datos y notifica a TODOS los
        observadores para que actualicen su estado."""
        bd.add(Evento(                       # se crea y agrega la fila de Evento (igual que antes)
            tipo_evento=evento.tipo,         # tipo del evento (viene del EventoSimulado)
            ip_origen=evento.ip,             # IP de origen
            usuario_id=usuario_id,           # dueño del laboratorio (cada estudiante ve el suyo)
            descripcion=evento.descripcion,  # texto del evento
        ))
        for observador in self._observadores:  # se recorre cada detector suscrito
            observador.al_evento(evento)        # se le notifica el evento (la "notificación" del patrón)

    def finalizar(self, bd: Session, usuario_id: int) -> None:
        """Cierra la siembra: cada observador decide si emite o no su alerta."""
        for observador in self._observadores:   # se recorre cada detector suscrito
            observador.emitir(bd, usuario_id)    # cada uno evalúa su umbral y crea la alerta si corresponde


class DetectorFuerzaBruta(ObservadorEvento):
    """Observador concreto: detecta fuerza bruta acumulando intentos fallidos
    y emite la alerta al superar el umbral."""

    def __init__(self, umbral: int = 5):     # umbral: nº de intentos a partir del cual se considera ataque
        self._umbral = umbral                # se guarda el umbral
        self._conteo = 0                     # contador de eventos de fuerza bruta vistos
        self._ip = None                      # IP atacante (se toma del último evento observado)
        self._servicio = None                # servicio atacado (viene del contexto del evento)
        self._cuenta = None                  # cuenta objetivo (viene del contexto del evento)

    def al_evento(self, evento) -> None:
        if evento.tipo != "Fuerza Bruta":    # solo le interesan los eventos de fuerza bruta
            return                           # cualquier otro tipo se ignora
        self._conteo += 1                    # cuenta este intento fallido
        self._ip = evento.ip                 # recuerda la IP atacante
        self._servicio = evento.contexto.get("servicio")  # recupera el servicio desde el contexto
        self._cuenta = evento.contexto.get("cuenta")      # recupera la cuenta desde el contexto

    def emitir(self, bd: Session, usuario_id: int) -> None:
        if self._conteo >= self._umbral:     # solo alerta si se alcanzó el umbral de intentos
            bd.add(Alerta(                   # crea la alerta (mismo contenido que antes)
                titulo="Ataque de fuerza bruta detectado",  # título de la alerta
                severidad="Alta",            # severidad
                usuario_id=usuario_id,       # dueño del laboratorio
                descripcion=f"Múltiples intentos fallidos desde {self._ip} en {self._servicio} (cuenta: {self._cuenta})",
            ))


class DetectorEscaneoPuertos(ObservadorEvento):
    """Observador concreto: detecta un escaneo de puertos y emite la alerta
    de reconocimiento al superar el umbral de sondas."""

    def __init__(self, umbral: int = 2):     # umbral: nº de sondas a partir del cual se considera escaneo
        self._umbral = umbral                # se guarda el umbral
        self._conteo = 0                     # contador de sondas vistas
        self._ip = None                      # IP que escanea
        self._puertos = None                 # lista de puertos sondeados (viene del contexto)

    def al_evento(self, evento) -> None:
        if evento.tipo != "Escaneo de Puertos":  # solo le interesan los eventos de escaneo
            return                           # cualquier otro tipo se ignora
        self._conteo += 1                    # cuenta esta sonda
        self._ip = evento.ip                 # recuerda la IP que escanea
        self._puertos = evento.contexto.get("puertos")  # recupera la lista completa de puertos del contexto

    def emitir(self, bd: Session, usuario_id: int) -> None:
        if self._conteo >= self._umbral:     # solo alerta si se alcanzó el umbral de sondas
            bd.add(Alerta(                   # crea la alerta (mismo contenido que antes)
                titulo="Reconocimiento de red detectado",  # título de la alerta
                severidad="Media",           # severidad
                usuario_id=usuario_id,       # dueño del laboratorio
                descripcion=f"Escaneo de puertos ({self._puertos}) detectado desde {self._ip}",
            ))
