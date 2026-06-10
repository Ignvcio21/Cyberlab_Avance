"""
sesiones.py — Máquina de estados de ejercicios docente (servidor)

El backend es la única fuente de verdad: crea la sesión, valida cada comando
contra los items del ejercicio, controla el temporizador y genera la entrega.
El frontend solo refleja el estado que el servidor le devuelve.
"""
import json
import random
import re
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from .models import (
    SesionEjercicio, EjercicioDocente, ItemEjercicioDocente,
    EntregaEjercicioDocente, Evento, Alerta, IpBloqueada,
)

# ── Familias de comandos (matching por intención) ─────────────────
# Cada familia agrupa las formas válidas de realizar una misma acción,
# como expresiones regulares ancladas al comando base. Así, variantes
# como `journalctl -n 40` o `tail -100 /var/log/syslog` cuentan igual,
# pero un `echo nmap` no engaña al validador.
FAMILIAS = {
    "nmap":            [r"^nmap\b"],
    "scan_ports":      [r"^scan\s+ports\b"],
    "ping_arp":        [r"^ping\b", r"^arp\b"],
    "show_hosts":      [r"^show\s+hosts\b"],
    "show_services":   [r"^show\s+services\b", r"^enumerate\s+services\b"],
    "show_vulns":      [r"^show\s+vulnerabilities\b"],
    "show_banners":    [r"^show\s+banners\b", r"^(nc|netcat)\b", r"\bbanner\b"],
    "bloqueo":         [r"^block\s+ip\b", r"^unblock\s+ip\b", r"^iptables\b", r"^ufw\b", r"^firewall\b"],
    "reporte":         [r"^export([\s-]report)?\b", r"^report\b", r"^generar-reporte\b", r"^correlacionar\b"],
    "alertas":         [r"^show\s+alerts\b", r"^alert\b", r"^(tail|cat|less)\s+(-\w+\s+)*/var/log/syslog\b", r"^grep\s+(-\w+\s+)*crit\b.*\bsyslog\b", r"^grep\b.*/var/log/syslog\b"],
    "eventos":         [r"^show\s+events\b", r"^journalctl\b", r"^(tail|cat|head|less)\s+(-\w+\s+)*/var/log/\S+", r"^grep\b.*/var/log/\S+"],
    "trafico":         [r"^show\s+traffic\b", r"^tcpdump\b", r"^tshark\b", r"^wireshark\b"],
    "usuarios":        [r"^show\s+users\b", r"^enumerate\s+users\b", r"^whoami\b", r"^cat\s+/etc/passwd\b"],
    "sesiones":        [r"^show\s+sessions\b", r"^netstat\b", r"^ss\b"],
    "procesos":        [r"^show\s+processes\b", r"^ps\b", r"^top\b"],
    "interfaz":        [r"^ip\s+a(ddr)?\b", r"^ifconfig\b", r"^ipconfig\b"],
    "fallidos":        [r"^show\s+failed\b", r"^lastb\b", r"\bauth\.log\b"],
    "estado":          [r"^status\b", r"^show\s+blocked\b", r"^systemctl\b", r"^iptables\s+-l\b", r"^uptime\b"],
    "correlacion":     [r"^correlacionar\b", r"^lastb\b", r"^journalctl\b", r"^grep\b"],
    "forense":         [r"^forensic\b", r"^strings\b", r"^volatility\b", r"^autopsy\b", r"^tcpdump\b"],
    "threat":          [r"^yara\b", r"^zeek\b", r"^hunt\b", r"^threat\b"],
}
_FAMILIAS_RX = {nombre: [re.compile(p) for p in pats] for nombre, pats in FAMILIAS.items()}

# ── Reglas: descripción del item (keywords) → familias aceptadas ──
# Un item se cumple cuando su descripción contiene alguna keyword Y el
# comando ejecutado pertenece a alguna de las familias asociadas.
REGLAS_ITEMS = [
    {"kw": ["nmap", "escaneo tcp", "syn", "tcp syn"],                "fams": ["nmap", "scan_ports"]},
    {"kw": ["hosts activos", "hosts", "ping sweep", "descubrir hosts"], "fams": ["nmap", "ping_arp", "show_hosts"]},
    {"kw": ["puertos abiertos", "puertos", "port scan"],             "fams": ["nmap", "scan_ports"]},
    {"kw": ["servicios expuesto", "servicio expuesto", "servicios innecesari", "expuesto innecesari", "servicio innecesari"], "fams": ["show_services", "nmap"]},
    {"kw": ["servicios", "service", "versión", "version"],           "fams": ["nmap", "show_services"]},
    {"kw": ["vulnerabilidades", "vulnerabilidad", "vuln", "puntos débiles", "punto débil", "debilidad", "debilidades", "configuración de red", "configuracion de red"], "fams": ["show_vulns", "nmap", "scan_ports", "show_banners"]},
    {"kw": ["reforzar", "fortalecer", "mitigar", "mitigación", "hardening", "medidas de seguridad", "medidas para", "proponer medidas", "mejorar la seguridad", "incrementar la seguridad"], "fams": ["bloqueo", "show_vulns", "show_banners", "show_services"]},
    {"kw": ["documentar", "reporte", "informe", "evidencia", "hallazgo", "soluciones propuestas", "registrar", "reportar", "reporta", "dirección de seguridad", "medidas tomadas", "detalles del incidente", "futuros análisis", "futuros analisis"], "fams": ["reporte"]},
    {"kw": ["bloquear", "bloqueo", "firewall", "deny", "contener", "contención"], "fams": ["bloqueo"]},
    {"kw": ["alertas", "alerta", "ids"],                             "fams": ["alertas"]},
    {"kw": ["eventos", "evento", "log"],                             "fams": ["eventos"]},
    {"kw": ["tráfico", "trafico", "sniff", "captura"],               "fams": ["trafico"]},
    {"kw": ["usuarios", "usuario", "cuentas", "cuenta", "configuración de la cuenta", "account"], "fams": ["usuarios"]},
    {"kw": ["sesiones", "sesión", "conexiones activas"],             "fams": ["sesiones"]},
    {"kw": ["procesos", "proceso", "running"],                       "fams": ["procesos"]},
    {"kw": ["banner", "versión servicio", "versiones de servicio", "información de versión"], "fams": ["show_banners"]},
    {"kw": ["interfaz", "interfaces", "ip address", "dirección ip"], "fams": ["interfaz"]},
    {"kw": ["intentos fallidos", "bruteforce", "fuerza bruta"],      "fams": ["fallidos"]},
    {"kw": ["correos", "correo electrónico", "email", "bandeja", "inbox", "mail"], "fams": ["alertas", "eventos", "trafico"]},
    {"kw": ["phishing", "enlace malicioso", "enlaces maliciosos", "malware", "malicioso", "threat", "caza"], "fams": ["alertas", "eventos", "trafico", "threat"]},
    {"kw": ["accesos no autorizados", "acceso no autorizado", "inicio de sesión", "login reciente", "actividad reciente"], "fams": ["sesiones", "fallidos", "eventos"]},
    {"kw": ["reconocimiento", "reconocer", "mapear", "mapeo", "identificar red", "identificar host", "identificar serv"], "fams": ["show_hosts", "scan_ports", "show_services", "nmap"]},
    {"kw": ["verificar", "verificación", "estado"],                  "fams": ["estado"]},
    {"kw": ["correlac", "correlación", "análisis"],                  "fams": ["correlacion"]},
    {"kw": ["forense", "artefactos", "evidencia"],                   "fams": ["forense", "trafico"]},
]


def _ahora():
    return datetime.now(timezone.utc)


def aware_utc(dt):
    """SQLite devuelve datetimes naive; PostgreSQL, aware. Normaliza a UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


_aware = aware_utc


# ── Items que exigen apuntar a la IP real del escenario ──────────
# El paso solo se marca si el estudiante identificó la IP correcta:
#  - "bloqueo": se valida por EFECTO (la IP atacante quedó bloqueada en BD)
#  - "comando": la IP atacante debe aparecer en el comando ejecutado
KW_ITEM_BLOQUEO = ["bloquear", "bloqueo", "contener", "contención", "contencion", "mitigar"]
KW_ITEM_IP      = [
    "ip atacante", "ip sospechosa", "ip maliciosa", "ip del atacante",
    "historial de ip", "historial de la ip", "tráfico de la ip", "trafico de la ip",
    "analizar la ip", "analiza la ip", "analizar ip", "investigar la ip",
    "dirección ip del atacante", "direccion ip del atacante", "origen del ataque",
]


def _ip_aleatoria() -> str:
    return f"192.168.{random.randint(1, 10)}.{random.randint(10, 250)}"


def _sembrar_fuerza_bruta(bd: Session, ip: str, usuario_id: int, intentos: int = 8):
    servicio = random.choice(["ssh", "rdp", "vpn", "panel-web"])
    cuenta = random.choice(["admin", "root", "operador", "soporte"])
    for i in range(1, intentos + 1):
        bd.add(Evento(tipo_evento="Fuerza Bruta", ip_origen=ip, usuario_id=usuario_id,
                      descripcion=f"Intento fallido #{i} en {servicio} contra cuenta '{cuenta}'"))
    bd.add(Alerta(titulo="Ataque de fuerza bruta detectado", severidad="Alta", usuario_id=usuario_id,
                  descripcion=f"Múltiples intentos fallidos desde {ip} en {servicio} (cuenta: {cuenta})"))


def _sembrar_escaneo(bd: Session, ip: str, usuario_id: int):
    puertos = random.choice(["22, 80, 443", "21, 22, 80", "80, 443, 8080", "22, 3389"])
    for p in puertos.replace(" ", "").split(","):
        bd.add(Evento(tipo_evento="Escaneo de Puertos", ip_origen=ip, usuario_id=usuario_id,
                      descripcion=f"Sonda detectada en puerto {p} desde {ip}"))
    bd.add(Alerta(titulo="Reconocimiento de red detectado", severidad="Media", usuario_id=usuario_id,
                  descripcion=f"Escaneo de puertos ({puertos}) detectado desde {ip}"))


def _sembrar_eventos_escenario(bd: Session, ejercicio: EjercicioDocente, ips: list, usuario_id: int):
    """Crea actividad real del atacante en el laboratorio del usuario.
    Niveles 1-5: un atacante con un vector. Niveles 6-7: multi-vector —
    dos IPs maliciosas con vectores distintos más tráfico legítimo de
    ruido que el estudiante debe descartar."""
    if len(ips) == 1:
        if ejercicio.tipo == "defensa":
            _sembrar_fuerza_bruta(bd, ips[0], usuario_id)
        else:
            _sembrar_escaneo(bd, ips[0], usuario_id)
    else:
        _sembrar_fuerza_bruta(bd, ips[0], usuario_id)
        _sembrar_escaneo(bd, ips[1], usuario_id)
        # Ruido legítimo: una IP inocente que NO debe bloquearse
        ip_ruido = _ip_aleatoria()
        for ruta in ["/index.html", "/login"]:
            bd.add(Evento(tipo_evento="Tráfico Web", ip_origen=ip_ruido, usuario_id=usuario_id,
                          descripcion=f"GET {ruta} HTTP/1.1 200 — navegación normal desde {ip_ruido}"))
    bd.commit()


def ips_maliciosas(sesion: SesionEjercicio) -> list:
    """Todas las IPs atacantes del escenario (1 en niveles 1-5, 2 en 6-7)."""
    try:
        ips = json.loads(sesion.ips_atacantes or "null")
        if isinstance(ips, list) and ips:
            return ips
    except Exception:
        pass
    return [sesion.ip_atacante] if sesion.ip_atacante else []


def _atacantes_bloqueados(bd: Session, sesion: SesionEjercicio) -> bool:
    """True solo si TODAS las IPs maliciosas del escenario están bloqueadas."""
    ips = ips_maliciosas(sesion)
    if not ips:
        return False
    for ip in ips:
        if not bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip).first():
            return False
    return True


def _ip_atacante_bloqueada(bd: Session, ip: str) -> bool:
    return bd.query(IpBloqueada).filter(IpBloqueada.direccion_ip == ip).first() is not None


def _normalizar_comando(comando: str) -> str:
    return re.sub(r"\s+", " ", (comando or "").strip().lower())


def _comando_en_familias(comando_norm: str, familias: list) -> bool:
    for fam in familias:
        for rx in _FAMILIAS_RX.get(fam, []):
            if rx.search(comando_norm):
                return True
    return False


def item_cumplido(descripcion: str, comando: str, salida: str) -> bool:
    """Determina si un comando ejecutado satisface el item descrito.
    Valida por intención: el comando debe pertenecer a alguna de las
    familias asociadas a las keywords de la descripción."""
    sal = (salida or "").lower()
    if "command not found" in sal:
        return False
    d = (descripcion or "").lower()
    c = _normalizar_comando(comando)
    if not c:
        return False
    for regla in REGLAS_ITEMS:
        if any(k in d for k in regla["kw"]) and _comando_en_familias(c, regla["fams"]):
            return True
    return False


def obtener_sesion_activa(bd: Session, usuario_id: int) -> SesionEjercicio | None:
    return bd.query(SesionEjercicio).filter(
        SesionEjercicio.usuario_id == usuario_id,
        SesionEjercicio.estado == "activa",
    ).first()


def _leer_items(sesion: SesionEjercicio) -> dict:
    try:
        return {int(k): bool(v) for k, v in json.loads(sesion.items_estado or "{}").items()}
    except Exception:
        return {}


def _porcentaje(items: dict) -> int:
    if not items:
        return 0
    return round(sum(1 for v in items.values() if v) / len(items) * 100)


def crear_sesion(bd: Session, usuario_id: int, ejercicio: EjercicioDocente) -> SesionEjercicio:
    # Cerrar cualquier sesión activa anterior (de este u otro ejercicio)
    previa = obtener_sesion_activa(bd, usuario_id)
    if previa:
        finalizar_sesion(bd, previa, "expirada")

    # Laboratorio limpio: un ejercicio = un incidente. Se eliminan los
    # eventos/alertas del ejercicio anterior del propio usuario para que
    # la investigación no se contamine con datos viejos.
    bd.query(Alerta).filter(Alerta.usuario_id == usuario_id).delete(synchronize_session=False)
    bd.query(Evento).filter(Evento.usuario_id == usuario_id).delete(synchronize_session=False)
    bd.commit()

    # Niveles 6-7: escenario multi-vector con dos atacantes distintos
    multi = (ejercicio.nivel or 1) >= 6
    ips = [_ip_aleatoria()]
    if multi:
        ip2 = _ip_aleatoria()
        while ip2 == ips[0]:
            ip2 = _ip_aleatoria()
        ips.append(ip2)

    items = {it.id: False for it in ejercicio.items}
    # Plan de fases del ataque: si el estudiante no contiene al atacante,
    # el incidente escala al 25%, 50% y 75% del tiempo disponible
    total_seg = (ejercicio.tiempo_minutos or 10) * 60
    plan_fases = [
        {"orden": 1, "en_seg": int(total_seg * 0.25), "estado": "pendiente"},
        {"orden": 2, "en_seg": int(total_seg * 0.50), "estado": "pendiente"},
        {"orden": 3, "en_seg": int(total_seg * 0.75), "estado": "pendiente"},
    ]
    sesion = SesionEjercicio(
        usuario_id=usuario_id,
        ejercicio_id=ejercicio.id,
        estado="activa",
        items_estado=json.dumps({str(k): v for k, v in items.items()}),
        ayudas=0,
        ip_atacante=ips[0],
        ips_atacantes=json.dumps(ips) if multi else None,
        fases=json.dumps(plan_fases),
        fecha_inicio=_ahora(),
        fecha_limite=_ahora() + timedelta(minutes=ejercicio.tiempo_minutos or 10),
    )
    bd.add(sesion)
    bd.commit()
    bd.refresh(sesion)
    _sembrar_eventos_escenario(bd, ejercicio, ips, usuario_id)
    return sesion


def finalizar_sesion(bd: Session, sesion: SesionEjercicio, estado: str):
    """Cierra la sesión y genera/actualiza la entrega con datos calculados
    por el servidor (no por el cliente)."""
    items = _leer_items(sesion)
    pct = _porcentaje(items)
    # Penalización real por ayudas: -5% por pista, tope -30%
    penal = min((sesion.ayudas or 0) * 5, 30)
    pct_final = max(0, pct - penal)
    sesion.estado = estado
    sesion.fecha_fin = _ahora()
    tiempo_seg = int((_aware(sesion.fecha_fin) - _aware(sesion.fecha_inicio)).total_seconds())

    base = "Completado vía terminal" if estado == "completada" else "Tiempo agotado"
    if penal:
        respuesta = (f"{base}. Checklist: {pct}% — Penalización por {sesion.ayudas} ayuda(s): -{penal}% "
                     f"→ Resultado: {pct_final}%. Tiempo: {tiempo_seg}s.")
    else:
        respuesta = f"{base}. Resultado: {pct_final}%. Tiempo: {tiempo_seg}s. Sin ayudas."

    entrega = bd.query(EntregaEjercicioDocente).filter(
        EntregaEjercicioDocente.ejercicio_id == sesion.ejercicio_id,
        EntregaEjercicioDocente.usuario_id == sesion.usuario_id,
    ).first()
    if entrega:
        # No sobrescribir una entrega ya evaluada por el docente
        if entrega.estado != "evaluado":
            entrega.respuesta = respuesta
            entrega.estado = "entregado"
            entrega.ayudas_pedidas = sesion.ayudas
    else:
        bd.add(EntregaEjercicioDocente(
            ejercicio_id=sesion.ejercicio_id,
            usuario_id=sesion.usuario_id,
            respuesta=respuesta,
            estado="entregado",
            ayudas_pedidas=sesion.ayudas,
        ))
    bd.commit()


# ── Ataque en tiempo real (materialización perezosa de fases) ─────

def _eventos_fase(bd: Session, sesion: SesionEjercicio, ejercicio: EjercicioDocente, fase: dict):
    """Crea los eventos reales de una fase del ataque en el laboratorio
    del usuario. La intensidad escala con el orden de la fase."""
    ips = ips_maliciosas(sesion)
    ip = random.choice(ips) if ips else sesion.ip_atacante
    uid = sesion.usuario_id
    orden = fase.get("orden", 1)
    es_defensa = (ejercicio.tipo == "defensa") if ejercicio else True

    if orden == 1:
        if es_defensa:
            for i in range(1, 5):
                bd.add(Evento(tipo_evento="Fuerza Bruta", ip_origen=ip, usuario_id=uid,
                              descripcion=f"Oleada 2: intento fallido #{i} — el atacante cambió de diccionario"))
        else:
            for p in ["8080", "3306", "5432", "6379"]:
                bd.add(Evento(tipo_evento="Escaneo de Puertos", ip_origen=ip, usuario_id=uid,
                              descripcion=f"Sonda profunda en puerto {p} desde {ip}"))
    elif orden == 2:
        for i in range(1, 6):
            bd.add(Evento(tipo_evento="Fuerza Bruta" if es_defensa else "Escaneo de Puertos",
                          ip_origen=ip, usuario_id=uid,
                          descripcion=f"Escalada: ráfaga automatizada #{i} desde {ip} (velocidad x3)"))
        bd.add(Alerta(titulo="Escalada del ataque en curso", severidad="Alta", usuario_id=uid,
                      descripcion=f"La actividad desde {ip} se intensifica — sin contención aplicada"))
    else:
        bd.add(Evento(tipo_evento="Intrusión", ip_origen=ip, usuario_id=uid,
                      descripcion=f"CRÍTICO: acceso parcial conseguido desde {ip} — proceso sospechoso nc -lvp 4444"))
        bd.add(Alerta(titulo="Posible intrusión — acceso parcial detectado", severidad="Crítica", usuario_id=uid,
                      descripcion=f"El atacante {ip} logró avanzar. Contención inmediata requerida."))


def materializar_fases(bd: Session, sesion: SesionEjercicio) -> bool:
    """Dispara las fases del ataque cuyo tiempo ya pasó (generación
    perezosa: se ejecuta en cada request del usuario). Si el atacante ya
    fue bloqueado, las fases se neutralizan en vez de impactar."""
    if sesion.estado != "activa":
        return False
    try:
        fases = json.loads(sesion.fases or "[]")
    except Exception:
        return False
    if not fases:
        return False

    transcurrido = (_ahora() - _aware(sesion.fecha_inicio)).total_seconds()
    ejercicio = bd.query(EjercicioDocente).filter(EjercicioDocente.id == sesion.ejercicio_id).first()
    # En multi-vector el ataque solo se contiene bloqueando a TODOS los atacantes
    bloqueado = _atacantes_bloqueados(bd, sesion)

    cambio = False
    for fase in fases:
        if fase.get("estado") != "pendiente" or fase.get("en_seg", 0) > transcurrido:
            continue
        if bloqueado:
            fase["estado"] = "neutralizada"
            for ip_mal in ips_maliciosas(sesion):
                bd.add(Evento(tipo_evento="Firewall DROP", ip_origen=ip_mal,
                              usuario_id=sesion.usuario_id,
                              descripcion=f"Tráfico de {ip_mal} descartado por regla DROP — ataque contenido"))
        else:
            fase["estado"] = "impactada"
            _eventos_fase(bd, sesion, ejercicio, fase)
        cambio = True

    if cambio:
        sesion.fases = json.dumps(fases)
        bd.commit()
    return cambio


def materializar_fases_usuario(bd: Session, usuario_id: int):
    """Punto de entrada liviano para los endpoints: materializa las fases
    de la sesión activa del usuario, si existe."""
    sesion = obtener_sesion_activa(bd, usuario_id)
    if sesion:
        materializar_fases(bd, sesion)


def verificar_expiracion(bd: Session, sesion: SesionEjercicio) -> bool:
    """Si la sesión venció, la finaliza (lazy). Devuelve True si expiró."""
    if sesion.estado != "activa":
        return sesion.estado == "expirada"
    if _ahora() > _aware(sesion.fecha_limite):
        finalizar_sesion(bd, sesion, "expirada")
        return True
    return False


def sesion_a_dict(bd: Session, sesion: SesionEjercicio) -> dict:
    items_estado = _leer_items(sesion)
    items_db = bd.query(ItemEjercicioDocente).filter(
        ItemEjercicioDocente.ejercicio_id == sesion.ejercicio_id
    ).order_by(ItemEjercicioDocente.orden).all()
    restante = 0
    if sesion.estado == "activa":
        restante = max(0, int((_aware(sesion.fecha_limite) - _ahora()).total_seconds()))
    try:
        fases = json.loads(sesion.fases or "[]")
    except Exception:
        fases = []
    pct = _porcentaje(items_estado)
    penal = min((sesion.ayudas or 0) * 5, 30)
    return {
        "id": sesion.id,
        "ejercicio_id": sesion.ejercicio_id,
        "estado": sesion.estado,
        "porcentaje": pct,
        "penalizacion": penal,
        "porcentaje_final": max(0, pct - penal),
        "restante_seg": restante,
        "ayudas": sesion.ayudas,
        "fases": [{"orden": f.get("orden"), "en_seg": f.get("en_seg"), "estado": f.get("estado")} for f in fases],
        "items": [
            {"id": it.id, "descripcion": it.descripcion, "orden": it.orden,
             "completado": items_estado.get(it.id, False)}
            for it in items_db
        ],
    }


def evaluar_comando_en_sesion(bd: Session, usuario_id: int, comando: str, salida: str) -> dict | None:
    """Hook llamado por las terminales tras procesar cada comando.
    Marca items cumplidos, detecta expiración y completa la sesión si
    corresponde. Devuelve el estado de la sesión para el frontend."""
    sesion = obtener_sesion_activa(bd, usuario_id)
    if not sesion:
        return None

    if verificar_expiracion(bd, sesion):
        return sesion_a_dict(bd, sesion)

    # Ataque en tiempo real: disparar las fases cuyo tiempo ya pasó
    materializar_fases(bd, sesion)

    items_estado = _leer_items(sesion)
    items_db = bd.query(ItemEjercicioDocente).filter(
        ItemEjercicioDocente.ejercicio_id == sesion.ejercicio_id
    ).all()

    # Cada comando marca a lo más UN item (el primero pendiente, por orden):
    # cada paso del ejercicio exige una acción distinta del estudiante.
    cambio = False
    for it in sorted(items_db, key=lambda x: (x.orden or 0, x.id)):
        if items_estado.get(it.id):
            continue
        if not item_cumplido(it.descripcion, comando, salida):
            continue
        # Validación contra el escenario: el paso solo cuenta si el
        # estudiante apuntó a la(s) IP(s) atacante(s) reales
        ips_mal = ips_maliciosas(sesion)
        if ips_mal:
            desc = (it.descripcion or "").lower()
            if any(k in desc for k in KW_ITEM_BLOQUEO):
                # por efecto: TODAS las IPs maliciosas deben quedar bloqueadas
                if not _atacantes_bloqueados(bd, sesion):
                    continue
            elif any(k in desc for k in KW_ITEM_IP):
                # por objetivo: el comando debe apuntar a alguna IP maliciosa
                if not any(ip in (comando or "") for ip in ips_mal):
                    continue
        items_estado[it.id] = True
        cambio = True
        break

    if cambio:
        sesion.items_estado = json.dumps({str(k): v for k, v in items_estado.items()})
        bd.commit()
        if items_estado and all(items_estado.values()):
            finalizar_sesion(bd, sesion, "completada")

    return sesion_a_dict(bd, sesion)
