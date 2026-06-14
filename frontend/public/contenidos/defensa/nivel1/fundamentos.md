# Nivel 1 — Fundamentos de logs y monitorización

## 1. Qué es un log y por qué existe

Un log es un registro persistente de eventos que ocurren en un sistema. El sistema operativo, los servicios, las aplicaciones y el hardware escriben en archivos de log de forma continua. Cada entrada describe un evento: cuándo ocurrió, qué componente lo generó y qué pasó.

Los logs existen porque los sistemas son complejos: miles de eventos ocurren por segundo y ningún operador humano puede verlos todos en tiempo real. Los logs permiten revisar lo que ocurrió, detectar anomalías y reconstruir incidentes después del hecho.

## 2. La jerarquía de logs en Linux

### 2.1. El diario del sistema (journald)
`systemd-journald` centraliza los logs de todos los servicios del sistema. Se accede con `journalctl`. Permite búsquedas potentes y filtrado por servicio sin necesidad de conocer el nombre del archivo de log.

### 2.2. Los archivos de log clásicos
- `/var/log/syslog` — registro general. Recibe eventos de kernel, networking, cron y la mayoría de servicios.
- `/var/log/auth.log` — registro de autenticación. Recibe eventos de SSH, sudo, PAM, intentos de login.
- `/var/log/nginx/access.log` — accesos al servidor web, uno por petición HTTP recibida.

### 2.3. Prioridad de los mensajes de log

Los mensajes de log tienen niveles de prioridad estándar (de mayor a menor severidad):

- `EMERG` / `ALERT` / `CRIT`: el sistema o un servicio crítico está fallando.
- `ERR`: error que requiere atención pero no es crítico.
- `WARNING`: situación anómala que podría escalar.
- `NOTICE`: evento normal pero significativo.
- `INFO`: información de operación normal.
- `DEBUG`: información detallada para diagnóstico.

En análisis de seguridad, los niveles `ERR`, `WARNING` y `NOTICE` son los más relevantes.

## 3. El servicio systemd y su relación con la seguridad

`systemd` gestiona los servicios del sistema (SSH, firewall, servidores web). `systemctl status` muestra el estado de todos los servicios activos.

Desde una perspectiva de seguridad, el estado de los servicios es información crítica:
- ¿Están activos los servicios que deberían estar activos?
- ¿Hay servicios inesperados corriendo?
- ¿Cuándo fue el último reinicio del sistema?

Un reinicio inesperado a las 3 de la madrugada puede ser un indicador de compromiso.

## 4. El usuario analista

El comando `whoami` muestra el usuario que ejecuta los comandos en la sesión actual. En CyberLab, el analista opera como `soc-analyst`, un usuario con permisos suficientes para leer logs y ejecutar comandos de análisis.

Este modelo de privilegios mínimos es una buena práctica: el analista puede ver y analizar, pero las acciones que modifican el sistema (como bloquear IPs) requieren privilegios adicionales que solo se usan cuando la evidencia lo justifica.

## 5. Lectura de logs: el formato básico

Una entrada de log típica en `/var/log/syslog` tiene este formato:

```
Jun 14 03:21:07 servidor sshd[1234]: Failed password for root from 192.168.1.100 port 22 ssh2
```

- `Jun 14 03:21:07` — timestamp del evento.
- `servidor` — nombre del host.
- `sshd[1234]` — servicio que generó el evento (SSH daemon, proceso 1234).
- `Failed password for root from 192.168.1.100 port 22 ssh2` — descripción del evento.

Saber leer este formato es la habilidad más básica del analista defensivo.
