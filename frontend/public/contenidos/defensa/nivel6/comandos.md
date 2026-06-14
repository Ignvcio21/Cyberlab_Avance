# Nivel 6 — Comandos en el análisis multi-vector

## 1. Todos los comandos anteriores disponibles

En el Nivel 6, todos los comandos de los niveles 1 al 5 están disponibles. El foco no es en comandos nuevos sino en cómo aplicarlos para gestionar múltiples vectores simultáneos.

---

## 2. Comandos de triage (para identificar todos los vectores)

```
journalctl -n 50               → eventos recientes del sistema
cat /var/log/syslog            → log general del sistema
grep failed /var/log/auth.log  → intentos de autenticación fallida por IP
grep scan /var/log/syslog      → escaneos detectados por IP
grep -i crit /var/log/syslog   → alertas críticas del sistema
netstat -an                    → conexiones activas (múltiples IPs sospechosas)
```

La salida de estos comandos en multi-vector mostrará múltiples IPs. Identificar y listar todas antes de continuar.

---

## 3. Comandos de caracterización por vector

Para cada IP identificada en el triage:

```
grep <ip> /var/log/auth.log         → toda la actividad de esa IP en auth.log
tail -100 /var/log/nginx/access.log → verificar acceso web de la IP
lastb -n 20                         → historial de intentos fallidos
top -bn1                            → procesos anómalos
```

---

## 4. Comandos de respuesta múltiple

Bloquear cada IP maliciosa confirmada:

```
iptables -A INPUT -s <ip-1> -j DROP
iptables -L INPUT -n                  → verificar primer bloqueo

iptables -A INPUT -s <ip-2> -j DROP
iptables -L INPUT -n                  → verificar segundo bloqueo
```

---

## 5. Comandos de verificación de contención completa

```
iptables -L INPUT -n    → verificar que todas las IPs están bloqueadas
iptables -L             → estado completo del firewall
tail -f /var/log/syslog → confirmar que cesó la actividad de todas las IPs
netstat -an             → confirmar que no hay conexiones activas de las IPs bloqueadas
```

---

## 6. Secuencia completa del Nivel 6

```
[TRIAGE]
journalctl -n 50
grep failed /var/log/auth.log
grep scan /var/log/syslog
netstat -an
top -bn1

[CARACTERIZACIÓN POR VECTOR]
grep <ip-1> /var/log/auth.log
grep <ip-2> /var/log/syslog
tail -100 /var/log/nginx/access.log

[RESPUESTA PRIORIZADA]
iptables -A INPUT -s <ip-principal> -j DROP
iptables -L INPUT -n
iptables -A INPUT -s <ip-secundaria> -j DROP
iptables -L INPUT -n

[VERIFICACIÓN COMPLETA]
tail -f /var/log/syslog
netstat -an
iptables -L
```
