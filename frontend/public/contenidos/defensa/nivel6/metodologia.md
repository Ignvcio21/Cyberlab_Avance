# Nivel 6 — Metodología de análisis multi-vector defensivo

## 1. Principio central: triage antes de responder

En un escenario multi-vector, la respuesta al primer vector visible sin completar el triage puede ser exactamente lo que el segundo vector necesita. El principio central del Nivel 6 es: completar el triage antes de responder a ningún vector.

## 2. Secuencia metodológica del Nivel 6

### Etapa 1 — Triage panorámico

```
journalctl -n 50
cat /var/log/syslog
grep failed /var/log/auth.log
grep scan /var/log/syslog
grep -i crit /var/log/syslog
netstat -an
```

Objetivo: obtener una visión completa antes de actuar. ¿Cuántas IPs distintas generan actividad sospechosa? ¿Qué tipo de actividad genera cada una?

### Etapa 2 — Separación y caracterización de vectores

Para cada IP identificada en el triage:
- Tipo de actividad (brute-force, escaneo, acceso web, proceso anómalo).
- Fase del ataque (reconocimiento, explotación, post-explotación).
- Severidad (acceso activo = crítico; brute-force sin éxito = alto; escaneo = medio).

### Etapa 3 — Correlación inter-vector

¿Los vectores son parte del mismo ataque o son independientes?

```
tail -50 /var/log/syslog    → ver la secuencia temporal completa
netstat -an                 → ver si hay conexiones activas de múltiples IPs
top -bn1                    → ver si hay procesos anómalos
```

### Etapa 4 — Respuesta priorizada

Bloquear en orden de severidad:

```
iptables -A INPUT -s <ip-vector-principal> -j DROP
iptables -L INPUT -n        → verificar primer bloqueo

iptables -A INPUT -s <ip-vector-secundario> -j DROP
iptables -L INPUT -n        → verificar segundo bloqueo
```

### Etapa 5 — Verificación de contención completa

```
grep failed /var/log/auth.log   → ¿siguen los intentos de brute-force?
netstat -an                     → ¿hay conexiones activas de las IPs bloqueadas?
tail -f /var/log/syslog         → ¿hay nuevos eventos de las IPs bloqueadas?
```

### Etapa 6 — Revisión del estado completo del firewall

```
iptables -L
```

¿Están todas las IPs maliciosas bloqueadas? ¿El estado del firewall es el esperado?

## 3. Cómo evitar quedar atrapado en un vector

La tentación en multi-vector es profundizar demasiado en el primer vector antes de identificar los demás. Para evitarlo: limitar el tiempo de triage inicial (tres o cuatro comandos), identificar todos los vectores, y solo entonces decidir cuál analizar primero.

## 4. Documentar cada vector por separado

El reporte de un incidente multi-vector debe describir cada vector de forma independiente antes de la correlación. Mezclar la evidencia de múltiples vectores en una sola descripción produce un reporte confuso.
