# Nivel 3 — Evidencia de detección de intrusiones

## 1. La evidencia de un ataque de fuerza bruta

Un ataque de fuerza bruta SSH bien documentado tiene evidencia en al menos tres fuentes:

**En `lastb`:**
```
root    ssh:notty    192.168.1.100    Sun Jun 14 03:21:07
admin   ssh:notty    192.168.1.100    Sun Jun 14 03:21:09
```

**En `grep failed /var/log/auth.log`:**
```
Jun 14 03:21:07 servidor sshd[1234]: Failed password for root from 192.168.1.100 port 22 ssh2
(... 47 líneas más ...)
```

**En alertas críticas del syslog:**
```
Jun 14 03:22:00 servidor [CRIT] Multiple authentication failures from 192.168.1.100
```

La convergencia de evidencia en tres fuentes independientes hace el caso sólido.

## 2. La evidencia de un escaneo coordinado con el brute-force

Si el escaneo precedió al brute-force, la evidencia lo muestra claramente:

**Escaneo (primer evento):**
```
Jun 14 03:15:00 servidor iptables: port scan detected from 192.168.1.100
```

**Brute-force (eventos posteriores):**
```
Jun 14 03:21:07 servidor sshd[1234]: Failed password for root from 192.168.1.100 port 22 ssh2
```

La diferencia de 6 minutos entre el escaneo y el inicio del brute-force es consistente con el tiempo que le llevaría a un atacante analizar los resultados del escaneo y preparar el ataque dirigido al puerto 22 (SSH).

## 3. La evidencia de conexiones activas

Si `netstat -an` muestra:
```
tcp  0  0  192.168.1.1:22  192.168.1.100:49123  ESTABLISHED
```

Esta línea es evidencia de que hay una sesión SSH activa desde la IP del atacante. Combinada con la evidencia del brute-force, indica que el atacante posiblemente obtuvo acceso exitoso.

## 4. La evidencia negativa

Si `top -bn1` no muestra procesos anómalos y `netstat -an` no muestra conexiones activas del atacante, esto también es evidencia: el brute-force falló y el sistema no fue comprometido. Esta conclusión también tiene valor en un informe de incidente.

## 5. Organización de la evidencia del Nivel 3

La evidencia del Nivel 3 se organiza en una narrativa cronológica:

1. [Timestamp] — Escaneo de puertos desde IP [X] detectado.
2. [Timestamp] — Inicio del ataque de fuerza bruta SSH desde IP [X].
3. [Timestamp] — N intentos fallidos con usuarios root, admin, user.
4. [Timestamp] — Alerta crítica generada por el sistema.
5. Estado actual: [conexiones activas / sin conexiones activas].
