# Nivel 1 — Comandos de inspección básica

## 1. `whoami`
Muestra el nombre del usuario activo, UID, GID y grupos.

**Uso:**
```
whoami
```

**Salida típica:**
```
soc-analyst [uid=1000(soc-analyst) gid=1000 groups=1000,sudo]
```

**Para qué sirve:** confirmar identidad y permisos antes de comenzar cualquier operación.

---

## 2. `systemctl status`
Muestra el estado general de los servicios del sistema gestionados por systemd.

**Uso:**
```
systemctl status
```

**Salida típica:**
```
● servidor
    State: running
   Failed: 0 units
    Since: Sat 2026-06-14 08:00:00 UTC; 4h ago
   CGroup: /
           ├─sshd.service (active)
           ├─nginx.service (active)
           └─firewalld.service (active)
```

**Para qué sirve:** obtener visibilidad del estado de servicios críticos. Identificar servicios caídos o inesperadamente activos.

---

## 3. `journalctl`
Accede al diario del sistema que centraliza logs de todos los servicios de systemd.

**Uso básico:**
```
journalctl
```

**Uso con límite de entradas:**
```
journalctl -n 50
```

**Salida típica:**
```
Jun 14 08:21:07 servidor sshd[1234]: Accepted publickey for soc-analyst
Jun 14 08:22:15 servidor nginx[5678]: 192.168.1.50 - GET /index.html 200
Jun 14 08:23:00 servidor kernel: iptables: chain INPUT policy ACCEPT
```

**Para qué sirve:** inspección cronológica de eventos del sistema antes de usar herramientas de búsqueda más específicas.

---

## 4. `cat /var/log/syslog`
Lee el contenido del log general del sistema.

**Uso:**
```
cat /var/log/syslog
```

**Para qué sirve:** acceso directo al log general en texto plano. Muestra un resumen de la actividad más reciente del sistema.

---

## 5. `ayuda` / `help`
Muestra la lista de comandos disponibles en el entorno de defensa.

**Uso:**
```
ayuda
```

---

## 6. Orden recomendado para el Nivel 1

```
whoami              → verificar identidad
systemctl status    → verificar estado de servicios
journalctl          → inspección del diario del sistema
cat /var/log/syslog → leer log general
```
