"""
terminal_comandos.py — Patrón Command para las terminales de CyberLab

Cada comando es una unidad independiente registrada en un despachador
(REGISTRO_ATAQUE / REGISTRO_DEFENSA). Agregar un comando nuevo es
escribir una función y decorarla — sin tocar la lógica del endpoint.
El despachador devuelve la salida del comando, o None si el comando no
está implementado (en cuyo caso el endpoint delega en la IA).
"""
import re

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from .models import (
    Usuario, Evento, Alerta, IpBloqueada, AccionUsuario,
)
from .sesiones import ips_maliciosas

# ── Helpers de laboratorio (scope por usuario) ────────────────────

def q_eventos(bd: Session, usuario_id: int):
    """Eventos del laboratorio del usuario (cada estudiante ve solo el suyo)."""
    return bd.query(Evento).filter(Evento.usuario_id == usuario_id)


def q_alertas(bd: Session, usuario_id: int):
    """Alertas del laboratorio del usuario (cada estudiante ve solo el suyo)."""
    return bd.query(Alerta).filter(Alerta.usuario_id == usuario_id)


def q_bloqueadas(bd: Session, usuario_id: int):
    """IPs bloqueadas en el firewall del propio usuario (aislado por estudiante)."""
    return bd.query(IpBloqueada).filter(IpBloqueada.usuario_id == usuario_id)


def _bloquear_ip(bd: Session, usuario_id: int, ip: str, motivo: str):
    """Bloquea una IP en el firewall del usuario; tolera la carrera (otra
    petición pudo bloquearla a la vez) sin reventar con IntegrityError."""
    if q_bloqueadas(bd, usuario_id).filter(IpBloqueada.direccion_ip == ip).first():
        return
    bd.add(IpBloqueada(usuario_id=usuario_id, direccion_ip=ip, motivo=motivo))
    try:
        bd.commit()
    except IntegrityError:
        bd.rollback()  # ya estaba bloqueada por otra petición concurrente


def _desbloquear_ip(bd: Session, usuario_id: int, ip: str) -> bool:
    """Quita el bloqueo de una IP del firewall del usuario. True si existía."""
    existe = q_bloqueadas(bd, usuario_id).filter(IpBloqueada.direccion_ip == ip).first()
    if existe:
        bd.delete(existe); bd.commit()
        return True
    return False


# ── Registro y despachador (patrón Command) ───────────────────────

REGISTRO_ATAQUE = []
REGISTRO_DEFENSA = []


def comando(patron: str, registro: list):
    """Decorador: registra un handler para los comandos que calcen con el patrón."""
    rx = re.compile(patron)
    def deco(fn):
        registro.append((rx, fn))
        return fn
    return deco


def despachar(registro: list, bd: Session, usuario: Usuario, raw: str, ctx: dict | None = None):
    """Busca el primer handler cuyo patrón calce con el comando normalizado.
    Devuelve la salida (str) o None si ningún comando implementado calza."""
    # Normaliza: quita espacios sobrantes, recorta y pasa a minúsculas para que
    # "  SHOW   Alerts " calce igual que "show alerts".
    cmd_l = re.sub(r"\s+", " ", (raw or "").strip().lower())
    for rx, fn in registro:           # recorre los handlers en orden de registro
        m = rx.match(cmd_l)           # ¿este patrón calza con el comando?
        if m:
            # Ejecuta el handler; `m` lleva los grupos capturados (ej: la IP).
            return fn(bd, usuario, m, ctx or {})
    return None                       # ningún comando implementado calzó → lo verá la IA


# ==================================================================
# COMANDOS — TERMINAL ATAQUE (kali-like)
# ==================================================================
# CONVENCIÓN: cada handler decorado con @comando(patron, REGISTRO_ATAQUE)
# recibe (bd, usuario, m, ctx) y DEVUELVE el texto que se mostrará en la
# terminal. La mayoría consulta los datos del laboratorio del propio usuario
# (eventos/alertas/IPs) y los formatea imitando la salida de una herramienta de
# Kali. Devolver "__LIMPIAR__" es la señal especial para limpiar la pantalla.

# Alias en español → comando canónico (no se usa en el matching directo, sirve
# de referencia de equivalencias amigables).
ALIAS_ATAQUE = {
    "ayuda": "help", "estado": "status", "ver alertas": "show alerts",
    "ver eventos": "show events", "ver bloqueadas": "show blocked", "limpiar": "clear",
}


@comando(r"^(clear|cls)$", REGISTRO_ATAQUE)
def atk_clear(bd, usuario, m, ctx):
    """clear / cls → señal para que el frontend limpie la terminal."""
    return "__LIMPIAR__"


@comando(r"^(help|\?|man)$", REGISTRO_ATAQUE)
def atk_help(bd, usuario, m, ctx):
    """help / ? / man → lista de comandos con datos reales del laboratorio."""
    return (
        "CyberLab Terminal — Kali Linux (IA activa)\n"
        "Puedes usar cualquier comando de Kali Linux.\n"
        "Comandos con datos reales del laboratorio:\n"
        "  show alerts, show events, show blocked, show traffic,\n"
        "  show failed logins, show sessions, show hosts,\n"
        "  resolve host, trace ip, status, history,\n"
        "  block ip <ip>, unblock ip <ip>, export report\n"
        "Cualquier otro comando Linux/Kali es procesado por IA.\n"
    )


@comando(r"^whoami$", REGISTRO_ATAQUE)
def atk_whoami(bd, usuario, m, ctx):
    """whoami → nombre del usuario en sesión."""
    return usuario.nombre_usuario


@comando(r"^pwd$", REGISTRO_ATAQUE)
def atk_pwd(bd, usuario, m, ctx):
    """pwd → directorio de trabajo simulado."""
    return "/home/kali"


@comando(r"^ls( -la| -l| -a)?$", REGISTRO_ATAQUE)
def atk_ls(bd, usuario, m, ctx):
    """ls → listado de archivos/carpetas simulados del entorno Kali."""
    return "drwxr-xr-x  evidence/\ndrwxr-xr-x  logs/\ndrwxr-xr-x  reports/\n-rw-r--r--  README.txt\n-rw-r--r--  incident.log"


@comando(r"^(ip a|ip addr|ifconfig)$", REGISTRO_ATAQUE)
def atk_ip_a(bd, usuario, m, ctx):
    """ip a / ifconfig → interfaces de red simuladas."""
    return "1: lo: <LOOPBACK,UP> mtu 65536\n   inet 127.0.0.1/8\n2: eth0: <BROADCAST,MULTICAST,UP> mtu 1500\n   inet 192.168.1.10/24 brd 192.168.1.255"


@comando(r"^history$", REGISTRO_ATAQUE)
def atk_history(bd, usuario, m, ctx):
    """history → últimos 20 comandos reales que el usuario ejecutó (de la BD)."""
    acciones = bd.query(AccionUsuario).filter(AccionUsuario.usuario_id == usuario.id).order_by(AccionUsuario.fecha_creacion.asc()).limit(20).all()
    if not acciones: return "No hay historial registrado."
    # enumera los comandos como lo haría el `history` de bash.
    return "\n".join(f"  {i+1}  {a.comando}" for i, a in enumerate(acciones))


@comando(r"^status$", REGISTRO_ATAQUE)
def atk_status(bd, usuario, m, ctx):
    """status → resumen del laboratorio: nº de eventos, alertas e IPs bloqueadas."""
    total_e = q_eventos(bd, usuario.id).count(); total_a = q_alertas(bd, usuario.id).count()
    bloq = q_bloqueadas(bd, usuario.id).count()
    # Con 2+ alertas se considera que el sistema está "bajo ataque".
    estado = "BAJO ATAQUE" if total_a >= 2 else "OPERATIVO"
    return f"● Sistema: {estado}\n  Eventos registrados : {total_e}\n  Alertas activas     : {total_a}\n  IPs bloqueadas      : {bloq}"


@comando(r"^show alerts$", REGISTRO_ATAQUE)
def atk_show_alerts(bd, usuario, m, ctx):
    """show alerts → últimas 10 alertas del IDS del laboratorio del usuario."""
    alertas = q_alertas(bd, usuario.id).order_by(Alerta.fecha_creacion.desc()).limit(10).all()
    if not alertas: return "No hay alertas registradas."
    # Formatea cada alerta: [hora] [severidad] título — descripción (recortada).
    return f"ALERTAS ({len(alertas)}):\n" + "\n".join(
        f"[{a.fecha_creacion.strftime('%H:%M:%S') if a.fecha_creacion else 'N/A'}] [{a.severidad}] {a.titulo} — {a.descripcion[:60]}"
        for a in alertas
    )


@comando(r"^show events$", REGISTRO_ATAQUE)
def atk_show_events(bd, usuario, m, ctx):
    """show events → últimos 12 eventos registrados (con su total)."""
    eventos = q_eventos(bd, usuario.id).order_by(Evento.fecha_creacion.desc()).limit(12).all()
    if not eventos: return "No hay eventos registrados."
    # Las :<22 / :<18 alinean las columnas con relleno de espacios.
    return f"EVENTOS ({q_eventos(bd, usuario.id).count()} total):\n" + "\n".join(
        f"[{e.fecha_creacion.strftime('%H:%M:%S') if e.fecha_creacion else 'N/A'}] {e.tipo_evento:<22} src={e.ip_origen:<18} {e.descripcion[:50]}"
        for e in eventos
    )


@comando(r"^show blocked$", REGISTRO_ATAQUE)
def atk_show_blocked(bd, usuario, m, ctx):
    """show blocked → IPs actualmente bloqueadas en el firewall del usuario."""
    ips = q_bloqueadas(bd, usuario.id).order_by(IpBloqueada.id.desc()).limit(10).all()
    if not ips: return "No hay IPs bloqueadas."
    return "IPs BLOQUEADAS:\n" + "\n".join(f"  DROP  {ip.direccion_ip}  # {ip.motivo}" for ip in ips)


@comando(r"^show traffic$", REGISTRO_ATAQUE)
def atk_show_traffic(bd, usuario, m, ctx):
    """show traffic → tráfico de red simulado a partir de los eventos recientes."""
    eventos = q_eventos(bd, usuario.id).order_by(Evento.fecha_creacion.desc()).limit(8).all()
    if not eventos: return "Sin tráfico registrado."
    return "TRÁFICO DE RED:\n" + "\n".join(
        f"  {e.ip_origen:<18} → {e.tipo_evento:<20} {e.descripcion[:45]}"
        for e in eventos
    )


@comando(r"^show failed logins$", REGISTRO_ATAQUE)
def atk_show_failed(bd, usuario, m, ctx):
    """show failed logins → eventos de fuerza bruta (logins fallidos)."""
    # ilike("%fuerza%") filtra los eventos cuyo tipo contiene "fuerza" (insensible a mayúsculas).
    evs = q_eventos(bd, usuario.id).filter(Evento.tipo_evento.ilike("%fuerza%")).order_by(Evento.fecha_creacion.desc()).limit(10).all()
    if not evs: return "No hay intentos de login fallidos registrados."
    return f"FAILED LOGINS ({len(evs)}):\n" + "\n".join(
        f"  [{e.fecha_creacion.strftime('%H:%M:%S') if e.fecha_creacion else 'N/A'}] FAILED src={e.ip_origen} {e.descripcion[:50]}"
        for e in evs
    )


@comando(r"^show sessions$", REGISTRO_ATAQUE)
def atk_show_sessions(bd, usuario, m, ctx):
    """show sessions → sesiones activas simuladas a partir de los eventos."""
    evs = q_eventos(bd, usuario.id).order_by(Evento.fecha_creacion.desc()).limit(5).all()
    if not evs: return "Sin sesiones activas registradas."
    return "SESIONES ACTIVAS:\n" + "\n".join(
        f"  SESSION-{i+1:03d}  src={e.ip_origen:<18} estado=ACTIVA  {e.tipo_evento}"
        for i, e in enumerate(evs)
    )


@comando(r"^show hosts$", REGISTRO_ATAQUE)
def atk_show_hosts(bd, usuario, m, ctx):
    """show hosts → IPs únicas detectadas, marcando cuáles están bloqueadas."""
    # set(...) elimina IPs repetidas de los últimos 20 eventos.
    ips = list(set(e.ip_origen for e in q_eventos(bd, usuario.id).order_by(Evento.fecha_creacion.desc()).limit(20).all()))
    if not ips: return "No se detectaron hosts activos."
    # Conjunto de IPs bloqueadas para marcar el estado de cada host.
    bloqueadas = {ip.direccion_ip for ip in q_bloqueadas(bd, usuario.id).all()}
    return "HOSTS DETECTADOS:\n" + "\n".join(
        f"  {ip:<18} {'[BLOQUEADA]' if ip in bloqueadas else '[ACTIVA]'}"
        for ip in ips[:8]
    )


# ── Reconocimiento del host objetivo (modo ataque) ───────────────
# Leen los datos del objetivo sembrados por el escenario, para que la
# auditoría opere sobre datos reales y no respuestas inventadas por IA.

@comando(r"^(scan ports|nmap)(\s+\S+)?$", REGISTRO_ATAQUE)
def atk_scan_ports(bd, usuario, m, ctx):
    """scan ports / nmap → muestra los servicios expuestos del host objetivo."""
    # Los "Servicio Expuesto" fueron sembrados por el escenario (estrategia objetivo).
    svcs = q_eventos(bd, usuario.id).filter(Evento.tipo_evento == "Servicio Expuesto").all()
    if not svcs:
        # Si aún no hay servicios, al menos muestra el host objetivo descubierto.
        host = q_eventos(bd, usuario.id).filter(Evento.tipo_evento == "Host Objetivo").first()
        return f"Escaneo en curso...\n{host.descripcion}" if host else "No hay un objetivo activo. Inicia un ejercicio de ataque."
    ip = svcs[0].ip_origen
    lineas = [f"Escaneo de puertos sobre {ip}:", "PORT     STATE  SERVICE   VERSION"]
    for e in svcs:
        lineas.append("  " + e.descripcion)   # cada servicio ya viene formateado como puerto/servicio/versión
    return "\n".join(lineas)


@comando(r"^(show services|enumerate services)$", REGISTRO_ATAQUE)
def atk_show_services(bd, usuario, m, ctx):
    """show services → lista los servicios expuestos detectados en el objetivo."""
    svcs = q_eventos(bd, usuario.id).filter(Evento.tipo_evento == "Servicio Expuesto").all()
    if not svcs: return "No se detectaron servicios. Escanea el objetivo primero."
    return "SERVICIOS EXPUESTOS:\n" + "\n".join(f"  {e.descripcion}" for e in svcs)


@comando(r"^show banners$", REGISTRO_ATAQUE)
def atk_show_banners(bd, usuario, m, ctx):
    """show banners → extrae el banner (versión) de cada servicio expuesto."""
    svcs = q_eventos(bd, usuario.id).filter(Evento.tipo_evento == "Servicio Expuesto").all()
    if not svcs: return "Sin banners capturados. Escanea el objetivo primero."
    # split('— ',1)[-1] toma lo que va después del "—", es decir, la versión.
    return "BANNERS DE SERVICIOS:\n" + "\n".join(f"  {e.descripcion.split('— ',1)[-1]}" for e in svcs)


@comando(r"^show vulnerabilities$", REGISTRO_ATAQUE)
def atk_show_vulns(bd, usuario, m, ctx):
    """show vulnerabilities → vulnerabilidades sembradas en el host objetivo."""
    vulns = q_eventos(bd, usuario.id).filter(Evento.tipo_evento == "Vulnerabilidad").all()
    if not vulns: return "No se identificaron vulnerabilidades aún."
    return "VULNERABILIDADES DETECTADAS:\n" + "\n".join(f"  [!] {e.descripcion}" for e in vulns)


@comando(r"^resolve host$", REGISTRO_ATAQUE)
def atk_resolve_host(bd, usuario, m, ctx):
    """resolve host → resuelve la IP del último evento mostrando si es maliciosa.
    Clave del ejercicio: el alumno descubre así cuál IP es la del atacante."""
    ev = q_eventos(bd, usuario.id).order_by(Evento.fecha_creacion.desc()).first()
    ip_o = ev.ip_origen if ev else "192.168.1.100"
    # ips_maliciosas() saca del estado de la sesión las IPs realmente atacantes.
    sesion = ctx.get("sesion")
    ips_mal = ips_maliciosas(sesion) if sesion else []
    if ip_o in ips_mal:
        # IP del atacante → reputación maliciosa (pista para bloquearla).
        return f"PTR {ip_o}: attacker-{ip_o.replace('.', '-')}.malicious.net\nASN: AS666 (malicious-hosting)\nReputación: MALICIOSA — listada en 3 blocklists"
    # IP legítima → no es el objetivo a bloquear.
    return f"PTR {ip_o}: host-{ip_o.replace('.', '-')}.isp-client.net\nASN: AS1234 (standard-isp)\nReputación: LEGÍTIMA — sin registros en blocklists"


@comando(r"^trace ip$", REGISTRO_ATAQUE)
def atk_trace_ip(bd, usuario, m, ctx):
    """trace ip → traceroute simulado hacia la IP del último evento."""
    ev = q_eventos(bd, usuario.id).order_by(Evento.fecha_creacion.desc()).first()
    ip_o = ev.ip_origen if ev else "?"
    sesion = ctx.get("sesion")
    ips_mal = ips_maliciosas(sesion) if sesion else []
    etiqueta = "ATTACKER" if ip_o in ips_mal else "KNOWN-HOST"   # marca el último salto
    return f"traceroute to {ip_o}:\n  1  192.168.1.1   1.2 ms\n  2  10.0.0.1      8.4 ms\n  3  {ip_o}   42.1 ms  {etiqueta}"


@comando(r"^export report$", REGISTRO_ATAQUE)
def atk_export_report(bd, usuario, m, ctx):
    """export report → genera un resumen del incidente con los conteos del laboratorio."""
    total_e = q_eventos(bd, usuario.id).count(); total_a = q_alertas(bd, usuario.id).count()
    bloq = q_bloqueadas(bd, usuario.id).count()
    acciones = bd.query(AccionUsuario).filter(AccionUsuario.usuario_id == usuario.id).count()
    ruta = f"/home/kali/reports/incident_{usuario.nombre_usuario}.txt"   # ruta simulada del archivo
    return (
        f"[+] Generando reporte de incidente...\n"
        f"    Analista  : {usuario.nombre_usuario}\n"
        f"    Eventos   : {total_e}\n"
        f"    Alertas   : {total_a}\n"
        f"    Bloqueadas: {bloq} IPs\n"
        f"    Comandos  : {acciones} registrados\n"
        f"[+] Reporte exportado → {ruta}"
    )


@comando(r"^block ip (\S+)$", REGISTRO_ATAQUE)
def atk_block_ip(bd, usuario, m, ctx):
    """block ip <ip> → bloquea una IP en el firewall del usuario (acción real en BD)."""
    ip_txt = m.group(1)   # group(1) = la IP capturada por el patrón (\S+)
    _bloquear_ip(bd, usuario.id, ip_txt, "Manual block")
    return f"iptables -A INPUT -s {ip_txt} -j DROP\n→ {ip_txt} bloqueada correctamente."


@comando(r"^unblock ip (\S+)$", REGISTRO_ATAQUE)
def atk_unblock_ip(bd, usuario, m, ctx):
    """unblock ip <ip> → quita el bloqueo de una IP (si existía)."""
    ip_txt = m.group(1)
    if _desbloquear_ip(bd, usuario.id, ip_txt):
        return f"iptables -D INPUT -s {ip_txt} -j DROP\n→ {ip_txt} desbloqueada."
    return f"{ip_txt} no estaba bloqueada."


# ==================================================================
# COMANDOS — TERMINAL DEFENSA (SOC)
# ==================================================================
# Mismo patrón que los de ataque, pero registrados en REGISTRO_DEFENSA y con
# comandos propios de un analista SOC (journalctl, grep auth.log, iptables,
# tcpdump…). Igual leen los datos del laboratorio del usuario y los formatean
# imitando la salida real de cada herramienta.

@comando(r"^(clear|cls|limpiar)$", REGISTRO_DEFENSA)
def def_clear(bd, usuario, m, ctx):
    """clear / limpiar → señal para limpiar la terminal SOC."""
    return "__LIMPIAR__"


@comando(r"^(ayuda|help|\?)$", REGISTRO_DEFENSA)
def def_help(bd, usuario, m, ctx):
    """ayuda / help → chuleta de comandos disponibles en la terminal SOC."""
    return (
        "CyberLab SOC Terminal — comandos reales Linux/Kali\n"
        "─────────────────────────────────────────────────────\n"
        "EVENTOS:   journalctl -n 50 | journalctl -n 10\n"
        "           grep Failed /var/log/auth.log\n"
        "           grep scan /var/log/syslog | netstat -an\n"
        "ALERTAS:   tail -50 /var/log/syslog | tail -f /var/log/syslog\n"
        "           grep -i crit /var/log/syslog\n"
        "ANÁLISIS:  nmap -sV <IP> | tcpdump host <IP> -c 20\n"
        "           grep <IP> /var/log/auth.log\n"
        "BLOQUEO:   iptables -A INPUT -s <IP> -j DROP\n"
        "           iptables -D INPUT -s <IP> -j DROP\n"
        "           iptables -L INPUT -n\n"
        "LOGS:      cat /var/log/syslog | cat /var/log/auth.log\n"
        "           iptables -L -v | grep sshd /var/log/auth.log\n"
        "           tail -50 /var/log/nginx/access.log\n"
        "ESTADO:    systemctl status | top -bn1\n"
        "           iptables -L -n -v | netstat -tulpn\n"
        "MISC:      lastb -n 20 | export-report | whoami | clear\n"
    )


@comando(r"^whoami$", REGISTRO_DEFENSA)
def def_whoami(bd, usuario, m, ctx):
    """whoami → identidad del analista SOC en sesión."""
    return f"{usuario.nombre_usuario} [uid=1000(soc-analyst) gid=1000 groups=1000,sudo]"


@comando(r"^journalctl(?: -n (\d+))?$", REGISTRO_DEFENSA)
def def_journalctl(bd, usuario, m, ctx):
    """journalctl [-n N] → últimas N entradas del journal (eventos del laboratorio)."""
    n = min(int(m.group(1) or 50), 100)   # N pedido (50 por defecto), tope de 100
    evs = q_eventos(bd, usuario.id).order_by(Evento.fecha_creacion.desc()).limit(n).all()
    if not evs: return "-- No entries --"
    lineas = [f"-- Journal begins (last {n}). --"]
    for e in evs:
        ts = e.fecha_creacion.strftime("%b %d %H:%M:%S") if e.fecha_creacion else "N/A"
        lineas.append(f"{ts} soc-lab kernel: [{e.tipo_evento}] src={e.ip_origen} {e.descripcion[:55]}")
    return "\n".join(lineas)


@comando(r"^grep failed /var/log/auth\.log$", REGISTRO_DEFENSA)
def def_grep_failed(bd, usuario, m, ctx):
    """grep Failed auth.log → logins fallidos (eventos de fuerza bruta)."""
    evs = q_eventos(bd, usuario.id).filter(Evento.tipo_evento.ilike("%fuerza%")).order_by(Evento.fecha_creacion.desc()).limit(15).all()
    total = q_eventos(bd, usuario.id).filter(Evento.tipo_evento.ilike("%fuerza%")).count()
    if not evs: return "(no output)"
    lineas = []
    for e in evs:
        ts = e.fecha_creacion.strftime("%b %d %H:%M:%S") if e.fecha_creacion else "N/A"
        lineas.append(f"{ts} soc-lab sshd[1234]: Failed password for root from {e.ip_origen} port 54321 ssh2")
    # Con 5+ intentos añade una recomendación de acción inmediata.
    if total >= 5: lineas.append(f"# {total} failed attempts — immediate action recommended")
    return "\n".join(lineas)


@comando(r"^grep scan /var/log/syslog$", REGISTRO_DEFENSA)
def def_grep_scan(bd, usuario, m, ctx):
    """grep scan syslog → eventos de escaneo de puertos detectados."""
    evs = q_eventos(bd, usuario.id).filter(Evento.tipo_evento.ilike("%escaneo%")).order_by(Evento.fecha_creacion.desc()).limit(10).all()
    if not evs: return "(no output)"
    lineas = []
    for e in evs:
        ts = e.fecha_creacion.strftime("%b %d %H:%M:%S") if e.fecha_creacion else "N/A"
        lineas.append(f"{ts} soc-lab kernel: [portscan] NMAP SYN scan detected from {e.ip_origen}")
    return "\n".join(lineas)


@comando(r"^netstat -an$", REGISTRO_DEFENSA)
def def_netstat_an(bd, usuario, m, ctx):
    """netstat -an → conexiones de red simuladas a partir de las IPs de los eventos."""
    evs = q_eventos(bd, usuario.id).order_by(Evento.fecha_creacion.desc()).limit(8).all()
    ips = list(set(e.ip_origen for e in evs))   # IPs únicas
    lineas = ["Active Internet connections (servers and established)",
              "Proto Recv-Q Send-Q Local Address           Foreign Address         State"]
    for ip in ips[:6]:
        cnt = q_eventos(bd, usuario.id).filter(Evento.ip_origen == ip).count()
        lineas.append(f"tcp        0      0 0.0.0.0:22              {ip}:54{cnt:03d}    ESTABLISHED")
    lineas.append("tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN")
    return "\n".join(lineas)


@comando(r"^tail -\d+ /var/log/syslog$", REGISTRO_DEFENSA)
def def_tail_syslog(bd, usuario, m, ctx):
    """tail -N syslog → mezcla las últimas alertas (CRIT/WARN) y eventos del log."""
    als = q_alertas(bd, usuario.id).order_by(Alerta.fecha_creacion.desc()).limit(10).all()
    evs = q_eventos(bd, usuario.id).order_by(Evento.fecha_creacion.desc()).limit(15).all()
    if not als and not evs: return "(empty log)"
    lineas = []
    for a in als:
        ts = a.fecha_creacion.strftime("%b %d %H:%M:%S") if a.fecha_creacion else "N/A"
        sev = "CRIT" if a.severidad in ("Alta","Crítica","Critica") else "WARN"   # severidad → nivel de log
        lineas.append(f"{ts} soc-lab ids[999]: [{sev}] {a.titulo}: {a.descripcion[:70]}")
    for e in evs:
        ts = e.fecha_creacion.strftime("%b %d %H:%M:%S") if e.fecha_creacion else "N/A"
        lineas.append(f"{ts} soc-lab kernel: {e.tipo_evento} from {e.ip_origen}")
    return "\n".join(lineas)


@comando(r"^grep -i crit /var/log/syslog$", REGISTRO_DEFENSA)
def def_grep_crit(bd, usuario, m, ctx):
    """grep -i crit syslog → solo las alertas de severidad alta/crítica."""
    als = q_alertas(bd, usuario.id).filter(Alerta.severidad.in_(["Alta","Crítica","Critica"])).order_by(Alerta.fecha_creacion.desc()).limit(8).all()
    if not als: return "(no output)"
    lineas = []
    for a in als:
        ts = a.fecha_creacion.strftime("%b %d %H:%M:%S") if a.fecha_creacion else "N/A"
        lineas.append(f"{ts} soc-lab ids[999]: [CRIT] {a.titulo}: {a.descripcion[:75]}")
    return "\n".join(lineas)


@comando(r"^tail -f /var/log/syslog$", REGISTRO_DEFENSA)
def def_tail_f_syslog(bd, usuario, m, ctx):
    """tail -f syslog → "seguimiento en vivo": muestra las alertas recientes y un ^C final."""
    als = q_alertas(bd, usuario.id).order_by(Alerta.fecha_creacion.desc()).limit(5).all()
    lineas = ["==> /var/log/syslog <=="]
    for a in als:
        ts = a.fecha_creacion.strftime("%b %d %H:%M:%S") if a.fecha_creacion else "N/A"
        lineas.append(f"{ts} soc-lab ids[999]: {a.titulo}")
    lineas.append("^C")
    return "\n".join(lineas)


@comando(r"^nmap\b(.*)$", REGISTRO_DEFENSA)
def def_nmap(bd, usuario, m, ctx):
    """nmap <ip> → escaneo a una IP: puertos simulados + nivel de riesgo según sus eventos."""
    partes = (m.group(1) or "").split()                               # argumentos tras "nmap"
    ip_obj = partes[-1] if partes else (ctx.get("ip_escenario") or "?")  # IP objetivo (último arg o la del escenario)
    evs    = q_eventos(bd, usuario.id).filter(Evento.ip_origen == ip_obj).all()
    total  = len(evs)                                                 # nº de eventos asociados a esa IP
    tipos  = list(set(e.tipo_evento for e in evs))                    # tipos de evento únicos
    bloq   = q_bloqueadas(bd, usuario.id).filter(IpBloqueada.direccion_ip == ip_obj).first()  # ¿bloqueada?
    # Riesgo en función de cuántos eventos generó la IP.
    riesgo = "CRÍTICO" if total >= 8 else "ALTO" if total >= 4 else "MEDIO" if total >= 2 else "BAJO"
    return (
        f"Starting Nmap 7.94 ( https://nmap.org )\n"
        f"Nmap scan report for {ip_obj}\n"
        f"Host is {'up' if not bloq else 'filtered (blocked)'}.\n"
        f"PORT     STATE  SERVICE   VERSION\n"
        f"22/tcp   open   ssh       OpenSSH 8.9\n"
        f"80/tcp   open   http      nginx 1.22\n"
        f"443/tcp  open   https     nginx 1.22\n"
        f"Riesgo: {riesgo} | Eventos: {total} | Tipos: {', '.join(tipos) if tipos else 'ninguno'}\n"
        f"Nmap done: 1 IP address scanned"
    )


@comando(r"^grep (\S+) .*?/var/log/auth\.log$", REGISTRO_DEFENSA)
def def_grep_auth(bd, usuario, m, ctx):
    """grep <término> auth.log → busca por IP (filtra sus eventos) o por "sshd"."""
    termino = m.group(1)   # lo que se busca (capturado por el patrón)
    # Si el término son solo dígitos y puntos, se interpreta como una IP.
    es_ip_busqueda = all(c.isdigit() or c == "." for c in termino)
    if es_ip_busqueda:
        ip_obj = termino
        evs = q_eventos(bd, usuario.id).filter(Evento.ip_origen == ip_obj).order_by(Evento.fecha_creacion.asc()).all()
        if not evs: return f"(no output — {ip_obj} not found in auth.log)"
        lineas = []
        for e in evs:
            ts = e.fecha_creacion.strftime("%b %d %H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"{ts} soc-lab sshd[1234]: Failed password from {ip_obj} port 22 ssh2")
        return "\n".join(lineas)
    if termino == "sshd":
        evs = q_eventos(bd, usuario.id).order_by(Evento.fecha_creacion.desc()).limit(10).all()
        lineas = []
        for e in evs:
            ts = e.fecha_creacion.strftime("%b %d %H:%M:%S") if e.fecha_creacion else "N/A"
            lineas.append(f"{ts} soc-lab sshd[1234]: Failed password from {e.ip_origen} port 22 ssh2")
        return "\n".join(lineas)
    return None


@comando(r"^tcpdump\b(.*)$", REGISTRO_DEFENSA)
def def_tcpdump(bd, usuario, m, ctx):
    """tcpdump host <ip> → captura de paquetes simulada hacia una IP."""
    partes = (m.group(1) or "").split()
    ip_obj = ctx.get("ip_escenario") or "?"
    # Si el comando trae "host <ip>", se toma esa IP como objetivo.
    try:
        idx = partes.index("host")
        ip_obj = partes[idx + 1]
    except (ValueError, IndexError):
        pass   # no se indicó "host ..."; se queda con la IP del escenario
    total = q_eventos(bd, usuario.id).filter(Evento.ip_origen == ip_obj).count()
    return (
        f"tcpdump: verbose output suppressed, use -v/-vv for full protocol decode\n"
        f"listening on eth0, link-type EN10MB (Ethernet)\n"
        f"IP {ip_obj}.54321 > soc-lab.22: Flags [S], seq 0, win 64240\n"
        f"IP {ip_obj}.54322 > soc-lab.80: Flags [S], seq 1, win 64240\n"
        f"IP {ip_obj}.54323 > soc-lab.443: Flags [S], seq 2, win 64240\n"
        f"20 packets captured | Total eventos: {total} | Velocidad: {total*3} pkt/s (ANÓMALO)\n"
        f"20 packets received by filter"
    )


@comando(r"^iptables .*-a .*-s (\S+).*drop.*$", REGISTRO_DEFENSA)
def def_iptables_block(bd, usuario, m, ctx):
    """iptables -A ... -s <ip> ... DROP → bloquea la IP (acción real en la BD)."""
    ip_obj = m.group(1)   # IP capturada de la regla
    _bloquear_ip(bd, usuario.id, ip_obj, f"iptables -A INPUT -s {ip_obj} -j DROP")
    return f"# regla DROP aplicada para {ip_obj}\n# iptables -L INPUT -n para verificar"


@comando(r"^iptables .*-d .*-s (\S+).*drop.*$", REGISTRO_DEFENSA)
def def_iptables_unblock(bd, usuario, m, ctx):
    """iptables -D ... -s <ip> ... DROP → elimina la regla (desbloquea la IP)."""
    ip_obj = m.group(1)
    if _desbloquear_ip(bd, usuario.id, ip_obj):
        return f"# regla DROP eliminada para {ip_obj}"
    return f"iptables: Bad rule (does not exist): No such file or directory — {ip_obj} not in chain"


@comando(r"^iptables -l input -n$", REGISTRO_DEFENSA)
def def_iptables_list_input(bd, usuario, m, ctx):
    """iptables -L INPUT -n → lista las reglas DROP (IPs bloqueadas) en formato tabla."""
    ips = q_bloqueadas(bd, usuario.id).order_by(IpBloqueada.id.desc()).all()
    lineas = ["Chain INPUT (policy ACCEPT)", "target     prot opt source               destination"]
    for ip in ips: lineas.append(f"DROP       all  --  {ip.direccion_ip:<20} 0.0.0.0/0")
    return "\n".join(lineas)


@comando(r"^iptables -l\b.*$", REGISTRO_DEFENSA)
def def_iptables_list(bd, usuario, m, ctx):
    """iptables -L (con flags) → resumen de reglas con conteos simulados de paquetes."""
    total_b = q_bloqueadas(bd, usuario.id).count()
    ips = q_bloqueadas(bd, usuario.id).order_by(IpBloqueada.id.desc()).limit(5).all()
    lineas = [f"Chain INPUT (policy ACCEPT {total_b} rules)",
              "pkts bytes target  prot opt in  out  source      destination"]
    for ip in ips:
        lineas.append(f"  42  2.1K DROP    all  --  any any  {ip.direccion_ip}  anywhere")
    return "\n".join(lineas)


@comando(r"^cat /var/log/syslog$", REGISTRO_DEFENSA)
def def_cat_syslog(bd, usuario, m, ctx):
    """cat syslog → resumen (sugiere usar tail para ver el detalle)."""
    total_e = q_eventos(bd, usuario.id).count(); total_a = q_alertas(bd, usuario.id).count()
    return f"/var/log/syslog: {total_e} eventos registrados, {total_a} alertas\nUsa tail -50 /var/log/syslog para ver las últimas entradas."


@comando(r"^cat /var/log/auth\.log$", REGISTRO_DEFENSA)
def def_cat_auth(bd, usuario, m, ctx):
    """cat auth.log → líneas de autenticación (logins fallidos por fuerza bruta)."""
    evs = q_eventos(bd, usuario.id).filter(Evento.tipo_evento.ilike("%fuerza%")).order_by(Evento.fecha_creacion.desc()).limit(12).all()
    if not evs: return "(empty)"
    lineas = []
    for e in evs:
        ts = e.fecha_creacion.strftime("%b %d %H:%M:%S") if e.fecha_creacion else "N/A"
        lineas.append(f"{ts} soc-lab sshd[1234]: Failed password for root from {e.ip_origen} port 22 ssh2")
    return "\n".join(lineas)


@comando(r"^tail -\d+ /var/log/nginx/access\.log$", REGISTRO_DEFENSA)
def def_tail_nginx(bd, usuario, m, ctx):
    """tail nginx/access.log → accesos web simulados (peticiones a /admin con 401)."""
    evs = q_eventos(bd, usuario.id).order_by(Evento.fecha_creacion.desc()).limit(8).all()
    lineas = []
    for e in evs:
        ts = e.fecha_creacion.strftime("%d/%b/%Y:%H:%M:%S") if e.fecha_creacion else "N/A"
        lineas.append(f'{e.ip_origen} - - [{ts} +0000] "GET /admin HTTP/1.1" 401 512')
    return "\n".join(lineas) if lineas else "(empty log)"


@comando(r"^systemctl status$", REGISTRO_DEFENSA)
def def_systemctl(bd, usuario, m, ctx):
    """systemctl status → estado del sistema; "degraded" si hay 2+ alertas."""
    total_e = q_eventos(bd, usuario.id).count(); total_a = q_alertas(bd, usuario.id).count(); total_b = q_bloqueadas(bd, usuario.id).count()
    riesgo  = "degraded" if total_a >= 2 else "running"
    return (
        f"● soc-lab\n"
        f"    State: {riesgo}\n"
        f"     Jobs: 0 queued\n"
        f"   Failed: {total_a} units\n"
        f"    Since: Mon 2025-01-01 00:00:00 UTC\n"
        f"   CGroup: /\n"
        f"           Eventos: {total_e} | Alertas: {total_a} | Bloqueadas: {total_b}\n"
        f"           Riesgo: {'ALTO' if total_a >= 3 else 'MEDIO' if total_a >= 1 else 'BAJO'}"
    )


@comando(r"^top -bn1$", REGISTRO_DEFENSA)
def def_top(bd, usuario, m, ctx):
    """top -bn1 → uso de CPU/RAM simulado que sube con la cantidad de eventos."""
    total_e = q_eventos(bd, usuario.id).count()
    # Más eventos = más carga (con topes de 95% CPU y 90% RAM).
    cpu = min(30 + total_e * 2, 95); ram = min(40 + total_e, 90)
    return (
        f"top - 12:00:00 up 5 days,  3:22,  1 user,  load average: {cpu/10:.2f}, {cpu/12:.2f}, {cpu/15:.2f}\n"
        f"Tasks: 142 total,   1 running, 141 sleeping\n"
        f"%Cpu(s): {cpu}.0 us,  2.0 sy,  0.0 ni, {100-cpu-2}.0 id\n"
        f"MiB Mem :   3942.0 total,    {3942-int(3942*ram/100)}.0 free,   {int(3942*ram/100)}.0 used\n"
        f"Estado: {'⚠ DEGRADADO — alta carga de CPU' if cpu >= 70 else '✓ OPERATIVO'}"
    )


@comando(r"^netstat -tulpn$", REGISTRO_DEFENSA)
def def_netstat_tulpn(bd, usuario, m, ctx):
    """netstat -tulpn → puertos en escucha + conexiones establecidas desde las IPs vistas."""
    evs = q_eventos(bd, usuario.id).order_by(Evento.fecha_creacion.desc()).limit(5).all()
    ips = list(set(e.ip_origen for e in evs))
    lineas = ["Active Internet connections (only servers)",
              "Proto Recv-Q Send-Q Local Address    Foreign Address  State   PID/Program",
              "tcp        0      0 0.0.0.0:22       0.0.0.0:*        LISTEN  1001/sshd",
              "tcp        0      0 0.0.0.0:80       0.0.0.0:*        LISTEN  1002/nginx",
              "tcp        0      0 0.0.0.0:443      0.0.0.0:*        LISTEN  1002/nginx"]
    for ip in ips[:3]:
        lineas.append(f"tcp        0      0 0.0.0.0:22       {ip}:*     ESTABLISHED  1001/sshd")
    return "\n".join(lineas)


@comando(r"^lastb -n 20$", REGISTRO_DEFENSA)
def def_lastb(bd, usuario, m, ctx):
    """lastb -n 20 → intentos de login + correlación de eventos (detecta ataques en fases)."""
    total_e = q_eventos(bd, usuario.id).count(); total_a = q_alertas(bd, usuario.id).count()
    evs_fb  = q_eventos(bd, usuario.id).filter(Evento.tipo_evento.ilike("%fuerza%")).count()   # nº de fuerza bruta
    evs_sc  = q_eventos(bd, usuario.id).filter(Evento.tipo_evento.ilike("%escaneo%")).count()  # nº de escaneos
    evs     = q_eventos(bd, usuario.id).order_by(Evento.fecha_creacion.desc()).limit(10).all()
    ips     = list(set(e.ip_origen for e in q_eventos(bd, usuario.id).order_by(Evento.fecha_creacion.desc()).limit(20).all()))
    lineas  = ["btmp begins Mon Jan  1 00:00:00 2025"]
    for e in evs:
        ts = e.fecha_creacion.strftime("%a %b %d %H:%M") if e.fecha_creacion else "N/A"
        lineas.append(f"root     ssh:{e.ip_origen}    {e.ip_origen}    {ts}   still logged in")
    # Líneas de correlación: ayudan al alumno a "leer" el incidente.
    lineas.append(f"\n# Correlación: eventos={total_e} alertas={total_a} ips_únicas={len(ips)}")
    lineas.append(f"# Fuerza bruta: {evs_fb} | Escaneo: {evs_sc}")
    # Escaneo + fuerza bruta juntos = ataque en 2 fases (reconocimiento + intrusión).
    if evs_fb >= 3 and evs_sc >= 2: lineas.append("# [ALTA] Reconocimiento + fuerza bruta — ataque en 2 fases")
    if total_a >= 2: lineas.append("# [ALTA] Múltiples alertas — incidente confirmado")
    return "\n".join(lineas)


@comando(r"^export-report$", REGISTRO_DEFENSA)
def def_export_report(bd, usuario, m, ctx):
    """export-report → genera el reporte final del incidente (vista SOC)."""
    total_e = q_eventos(bd, usuario.id).count(); total_a = q_alertas(bd, usuario.id).count(); total_b = q_bloqueadas(bd, usuario.id).count()
    return (
        f"=== INCIDENT REPORT — CyberLab SOC ===\n"
        f"Analista: {usuario.nombre_usuario}\n"
        f"Eventos:  {total_e} | Alertas: {total_a} | IPs bloqueadas: {total_b}\n"
        f"Estado:   ✅ REPORTE GENERADO\n"
        f"Archivo guardado: /var/log/soc/report_{usuario.nombre_usuario}.txt"
    )
