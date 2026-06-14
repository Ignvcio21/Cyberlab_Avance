# Nivel 7 — Comandos: síntesis operacional defensiva

## 1. Inventario completo de comandos disponibles

En el Nivel 7, todos los comandos de los niveles anteriores están disponibles. Esta sección los organiza por rol operacional.

---

## 2. Comandos de inspección y triage

| Comando | Rol |
|---|---|
| `whoami` | Identificar el contexto del analista |
| `systemctl status` | Estado de servicios del sistema |
| `journalctl -n N` | Eventos recientes del diario del sistema |
| `cat /var/log/syslog` | Log general completo |

---

## 3. Comandos de análisis de logs

| Comando | Rol |
|---|---|
| `grep failed /var/log/auth.log` | Detectar brute-force SSH |
| `grep scan /var/log/syslog` | Detectar escaneos de red |
| `grep -i crit /var/log/syslog` | Alertas críticas |
| `grep <ip> /var/log/auth.log` | Actividad de una IP específica |
| `grep "Invalid user" /var/log/auth.log` | Intentos con usuarios inexistentes |
| `cat /var/log/auth.log` | Log de autenticación completo |
| `tail -N /var/log/syslog` | Eventos recientes del sistema |
| `tail -f /var/log/syslog` | Seguimiento en tiempo real |
| `tail -N /var/log/nginx/access.log` | Accesos web recientes |
| `lastb -n 20` | Historial de logins fallidos |

---

## 4. Comandos de análisis de red y sistema

| Comando | Rol |
|---|---|
| `netstat -an` | Todas las conexiones activas |
| `netstat -tulpn` | Servicios en escucha con procesos |
| `top -bn1` | Instantánea de procesos y recursos |
| `tcpdump host <ip>` | Captura de tráfico de una IP |
| `tcpdump port <N>` | Captura de tráfico de un puerto |
| `nmap <ip>` | Escaneo de puertos (perspectiva externa) |

---

## 5. Comandos de respuesta

| Comando | Rol |
|---|---|
| `iptables -A INPUT -s <ip> -j DROP` | Bloquear una IP |
| `iptables -D INPUT -s <ip> -j DROP` | Desbloquear una IP |
| `iptables -L INPUT -n` | Verificar reglas de entrada |
| `iptables -L` | Estado completo del firewall |

---

## 6. Comando de documentación

| Comando | Rol |
|---|---|
| `export-report` | Generar reporte formal del incidente |

---

## 7. Secuencia típica de una operación completa

```
[TRIAGE]
systemctl status → journalctl -n 50 → grep failed → grep scan → netstat -an → top -bn1

[ANÁLISIS]
lastb -n 20 → grep <ip> /var/log/auth.log → tcpdump host <ip> → netstat -tulpn

[RESPUESTA]
iptables -A INPUT -s <ip1> -j DROP → iptables -L INPUT -n
iptables -A INPUT -s <ip2> -j DROP → iptables -L INPUT -n  (si hay segundo vector)

[VERIFICACIÓN]
tail -f /var/log/syslog → netstat -an → iptables -L

[DOCUMENTACIÓN]
export-report
```
