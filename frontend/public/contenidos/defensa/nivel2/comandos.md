# Nivel 2 — Comandos de búsqueda y filtrado

## 1. `grep failed /var/log/auth.log`
Busca líneas con "failed" en el log de autenticación, que corresponden a intentos de login fallidos.

**Uso:**
```
grep failed /var/log/auth.log
```

**Salida típica:**
```
Jun 14 03:21:07 servidor sshd[1234]: Failed password for root from 192.168.1.100 port 22 ssh2
Jun 14 03:21:09 servidor sshd[1235]: Failed password for admin from 192.168.1.100 port 22 ssh2
Jun 14 03:21:11 servidor sshd[1236]: Failed password for root from 192.168.1.100 port 22 ssh2
```

**Qué analizar:** frecuencia (muchos intentos en poco tiempo = fuerza bruta), IP de origen (siempre la misma = atacante único), usuarios probados (root, admin = intentos genéricos).

---

## 2. `grep scan /var/log/syslog`
Busca eventos de escaneo de red registrados en el syslog.

**Uso:**
```
grep scan /var/log/syslog
```

**Salida típica:**
```
Jun 14 03:15:00 servidor iptables: port scan detected from 192.168.1.100
Jun 14 03:15:02 servidor snort: portscan ALERT from 192.168.1.100
```

**Qué analizar:** IP de origen, número de eventos, tiempo (¿ocurrió antes que los fallos de autenticación?).

---

## 3. `grep -i crit /var/log/syslog`
Busca alertas de nivel CRIT en el syslog (insensible a mayúsculas).

**Uso:**
```
grep -i crit /var/log/syslog
```

**Salida típica:**
```
Jun 14 03:22:00 servidor kernel: [CRIT] Multiple authentication failures from 192.168.1.100
Jun 14 03:22:05 servidor aide: [CRIT] File integrity check failed: /etc/passwd modified
```

**Qué analizar:** tipo de alerta crítica, servicio que la generó, momento en que ocurrió.

---

## 4. `grep <término> /var/log/auth.log`
Búsqueda flexible en el log de autenticación con cualquier patrón.

**Ejemplos de uso:**
```
grep 192.168.1.100 /var/log/auth.log    → ver toda la actividad de una IP específica
grep "Invalid user" /var/log/auth.log   → intentos con usuarios inexistentes
grep "Accepted" /var/log/auth.log       → autenticaciones exitosas
```

---

## 5. `tail -N /var/log/syslog`
Muestra las últimas N líneas del syslog.

**Uso:**
```
tail -50 /var/log/syslog
tail -100 /var/log/syslog
```

**Para qué sirve:** ver la actividad más reciente sin leer el archivo completo.

---

## 6. `tail -f /var/log/syslog`
Sigue el syslog en tiempo real.

**Uso:**
```
tail -f /var/log/syslog
```

**Para qué sirve:** monitorizar la actividad del sistema durante un incidente activo. Ver nuevos eventos a medida que ocurren.

---

## 7. `tail -N /var/log/nginx/access.log`
Muestra las últimas N líneas del log de acceso de Nginx.

**Uso:**
```
tail -20 /var/log/nginx/access.log
tail -50 /var/log/nginx/access.log
```

**Salida típica:**
```
192.168.1.100 - - [14/Jun/2026:03:20:00 +0000] "GET /admin HTTP/1.1" 403 287
192.168.1.100 - - [14/Jun/2026:03:20:01 +0000] "GET /wp-admin HTTP/1.1" 404 162
192.168.1.100 - - [14/Jun/2026:03:20:02 +0000] "GET /.env HTTP/1.1" 404 162
```

**Qué analizar:** IP de origen, URLs solicitadas (¿intentando acceder a rutas sensibles?), códigos de respuesta.

---

## 8. Orden recomendado para el Nivel 2

```
grep failed /var/log/auth.log       → detectar fallos de autenticación
grep scan /var/log/syslog           → detectar escaneos de red
grep -i crit /var/log/syslog        → revisar alertas críticas
tail -50 /var/log/syslog            → actividad reciente del sistema
tail -20 /var/log/nginx/access.log  → actividad web reciente
tail -f /var/log/syslog             → seguimiento en tiempo real si hay incidente activo
```
