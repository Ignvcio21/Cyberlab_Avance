"""
estrategias.py — Patrón de diseño STRATEGY (Estrategia)

Cada "tipo de simulación" del laboratorio (fuerza bruta, escaneo de puertos,
host objetivo) es un ALGORITMO distinto para generar los eventos de un
escenario. El patrón Strategy encapsula cada algoritmo en su propia clase,
todas con la MISMA interfaz (`generar`), de modo que el código que arma el
escenario puede intercambiarlas sin conocer sus detalles internos.

Agregar un nuevo tipo de simulación = crear una clase nueva y registrarla en
MAPA_ESTRATEGIAS, sin tocar el resto del sistema.
"""
from abc import ABC, abstractmethod          # ABC = clase base abstracta; abstractmethod = método obligatorio en las hijas
from dataclasses import dataclass, field     # dataclass = clase de datos sin escribir __init__ a mano
import random                                # random = para elegir servicios, cuentas y perfiles al azar (igual que antes)


@dataclass
class EventoSimulado:
    """Objeto de dominio que produce una estrategia. NO toca la base de datos:
    solo describe un evento. El Sujeto (Observer) lo persiste y lo notifica."""
    tipo: str                                # tipo_evento que se guardará (ej. "Fuerza Bruta")
    ip: str                                  # IP de origen del evento dentro del escenario
    descripcion: str                         # texto del evento tal como lo verá el estudiante
    contexto: dict = field(default_factory=dict)  # datos extra (servicio, cuenta, puertos) para que los detectores armen las alertas


class EstrategiaEscenario(ABC):
    """Interfaz común a todas las estrategias. Define el "contrato": toda
    estrategia concreta debe saber generar la lista de eventos de su escenario."""

    @abstractmethod                          # obliga a que cada estrategia concreta implemente este método
    def generar(self, ip: str) -> list:
        """Devuelve la lista de EventoSimulado que compone este escenario."""
        ...                                  # cuerpo vacío: la lógica vive en cada subclase


class EstrategiaFuerzaBruta(EstrategiaEscenario):
    """Estrategia concreta: simula un ataque de fuerza bruta contra un servicio."""

    def __init__(self, intentos: int = 8):   # parámetro configurable: cuántos intentos fallidos sembrar
        self._intentos = intentos            # se guarda para usarlo al generar los eventos

    def generar(self, ip: str) -> list:
        servicio = random.choice(["ssh", "rdp", "vpn", "panel-web"])      # servicio atacado, elegido al azar
        cuenta = random.choice(["admin", "root", "operador", "soporte"])  # cuenta objetivo, elegida al azar
        eventos = []                                                       # acumulador de los eventos a devolver
        for i in range(1, self._intentos + 1):                            # un evento por cada intento fallido
            eventos.append(EventoSimulado(                                # se crea el evento de dominio
                "Fuerza Bruta",                                           # tipo del evento
                ip,                                                       # IP atacante
                f"Intento fallido #{i} en {servicio} contra cuenta '{cuenta}'",  # descripción visible
                {"servicio": servicio, "cuenta": cuenta},                 # contexto: lo que el detector necesitará para la alerta
            ))
        return eventos                                                    # se entregan los eventos al Sujeto


class EstrategiaEscaneoPuertos(EstrategiaEscenario):
    """Estrategia concreta: simula un escaneo (reconocimiento) de puertos."""

    def generar(self, ip: str) -> list:
        puertos = random.choice(["22, 80, 443", "21, 22, 80", "80, 443, 8080", "22, 3389"])  # set de puertos sondeados
        eventos = []                                                      # acumulador de eventos
        for p in puertos.replace(" ", "").split(","):                     # un evento (sonda) por cada puerto
            eventos.append(EventoSimulado(                                # se crea el evento de dominio
                "Escaneo de Puertos",                                     # tipo del evento
                ip,                                                       # IP que escanea
                f"Sonda detectada en puerto {p} desde {ip}",              # descripción visible
                {"puertos": puertos},                                     # contexto: lista completa de puertos para la alerta
            ))
        return eventos                                                    # se entregan los eventos al Sujeto


class EstrategiaObjetivoAtaque(EstrategiaEscenario):
    """Estrategia concreta (modo ATAQUE): siembra un host OBJETIVO a auditar,
    con sus servicios, banners de versión y una vulnerabilidad. No genera
    alerta (es el pentester quien investiga; no hay defensor que se alarme)."""

    def generar(self, ip: str) -> list:
        perfil = random.choice([                                          # se elige al azar un perfil de host vulnerable
            {"svcs": [("22", "SSH", "OpenSSH 7.4"), ("80", "HTTP", "Apache 2.4.29"), ("3306", "MySQL", "MySQL 5.5.62")],
             "vuln": "MySQL 5.5 expuesto — posibles credenciales por defecto (root sin contraseña)"},
            {"svcs": [("21", "FTP", "vsftpd 2.3.4"), ("22", "SSH", "OpenSSH 8.0"), ("80", "HTTP", "nginx 1.14.0")],
             "vuln": "vsftpd 2.3.4 — versión con backdoor conocido (CVE-2011-2523)"},
            {"svcs": [("80", "HTTP", "Apache 2.4.49"), ("443", "HTTPS", "Apache 2.4.49"), ("8080", "HTTP-alt", "Tomcat 9.0.30")],
             "vuln": "Apache 2.4.49 — path traversal y RCE (CVE-2021-41773)"},
            {"svcs": [("22", "SSH", "OpenSSH 7.2"), ("445", "SMB", "Samba 3.6.25"), ("3389", "RDP", "xrdp 0.9.1")],
             "vuln": "Samba 3.6.25 — ejecución remota de código (CVE-2017-7494)"},
        ])
        puertos = ", ".join(s[0] for s in perfil["svcs"])                 # cadena con los puertos abiertos del host
        eventos = [EventoSimulado(                                        # primer evento: el host objetivo descubierto
            "Host Objetivo",                                              # tipo del evento
            ip,                                                           # IP del host objetivo
            f"Host {ip} activo — puertos abiertos: {puertos}",           # descripción visible
            {},                                                           # sin contexto: este escenario no dispara alertas
        )]
        for puerto, svc, version in perfil["svcs"]:                       # un evento por cada servicio expuesto
            eventos.append(EventoSimulado(                                # se crea el evento de servicio
                "Servicio Expuesto",                                      # tipo del evento
                ip,                                                       # IP del host
                f"{puerto}/tcp open {svc} — {version}",                   # banner del servicio
                {},                                                       # sin contexto
            ))
        eventos.append(EventoSimulado(                                    # evento final: la vulnerabilidad detectada
            "Vulnerabilidad",                                             # tipo del evento
            ip,                                                           # IP del host
            perfil["vuln"],                                               # descripción de la vulnerabilidad
            {},                                                           # sin contexto
        ))
        return eventos                                                    # se entregan los eventos al Sujeto


# Registro de estrategias disponibles: la CLAVE identifica el tipo de simulación
# y el VALOR es la clase concreta. Aquí se "registra" una estrategia nueva.
MAPA_ESTRATEGIAS = {
    "fuerza_bruta": EstrategiaFuerzaBruta,   # clave -> clase de la estrategia de fuerza bruta
    "escaneo": EstrategiaEscaneoPuertos,     # clave -> clase de la estrategia de escaneo de puertos
    "objetivo": EstrategiaObjetivoAtaque,    # clave -> clase de la estrategia de host objetivo
}


def crear_estrategia(clave: str) -> EstrategiaEscenario:
    """Fábrica del patrón: dada una clave, devuelve una instancia de la
    estrategia correspondiente. El cliente elige la estrategia sin instanciar
    su clase directamente."""
    return MAPA_ESTRATEGIAS[clave]()         # busca la clase por clave y la instancia
