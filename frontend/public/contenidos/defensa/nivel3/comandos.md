# Nivel 3 — Comandos de detección de intrusiones

## 1. `lastb -n 20`
Muestra los últimos 20 intentos de login fallidos registrados en el sistema.

**Uso:**
```
lastb -n 20
```

**Salida típica:**
```
root    ssh:notty    192.168.1.100    Sun Jun 14 03:21:07
admin   ssh:notty    192.168.1.100    Sun Jun 14 03:21:09
root    ssh:notty    192.168.1.100    Sun Jun 14 03:21:11
user    ssh:notty    192.168.1.100    Sun Jun 14 03:21:13
```

**Qué analizar:** ¿Siempre la misma IP? ¿Usuarios genéricos (root, admin)? ¿Timestamps muy próximos (ataque automatizado)?

---

## 2. `netstat -an`
Muestra todas las conexiones de red activas en formato numérico.

**Uso:**
```
netstat -an
```

**Salida típica:**
```
Proto Recv-Q Send-Q Local Address      Foreign Address    State
tcp        0      0 0.0.0.0:22         0.0.0.0:*          LISTEN
tcp        0      0 192.168.1.1:22     192.168.1.50:54321 ESTABLISHED
tcp        0      0 192.168.1.1:22     192.168.1.100:49123 SYN_RECV
```

**Qué analizar:** conexiones `ESTABLISHED` desde IPs sospechosas (¿hay sesiones SSH activas del atacante?), muchas conexiones en `SYN_RECV` desde una IP (posible escaneo SYN).

---

## 3. `top -bn1`
Muestra una instantánea del uso de recursos por proceso.

**Uso:**
```
top -bn1
```

**Salida típica:**
```
PID   USER     %CPU %MEM COMMAND
1234  root     95.0  2.1 python3 /tmp/.x
5678  www-data  1.2  0.4 nginx: worker process
9012  soc-anal  0.3  0.1 bash
```

**Qué analizar:** ¿algún proceso con uso de CPU muy alto? ¿Procesos con nombres sospechosos o corriendo desde `/tmp`? ¿Procesos de root que no deberían estar ahí?

---

## 4. `grep failed /var/log/auth.log` (del Nivel 2, ahora en contexto de detección)
En el Nivel 3, se usa no solo para encontrar eventos sino para cuantificar el ataque.

**Uso para cuantificar:**
```
grep failed /var/log/auth.log
```

Contar las líneas para estimar la magnitud del brute-force. La secuencia de timestamps permite estimar la velocidad del ataque.

---

## 5. `grep -i crit /var/log/syslog`
Busca alertas críticas que el sistema puede haber generado en respuesta al ataque.

**Uso:**
```
grep -i crit /var/log/syslog
```

---

## 6. `cat /var/log/auth.log`
Lectura completa del log de autenticación para contexto adicional.

**Uso:**
```
cat /var/log/auth.log
```

---

## 7. Secuencia recomendada para el Nivel 3

```
lastb -n 20                     → historial de logins fallidos
grep failed /var/log/auth.log   → cuantificar el brute-force
grep scan /var/log/syslog       → detectar escaneo previo
netstat -an                     → conexiones activas
top -bn1                        → procesos del sistema
grep -i crit /var/log/syslog    → alertas críticas
```
