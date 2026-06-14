# Nivel 7 — Metodología de la operación completa de SOC

## 1. El analista como responsable autónomo

En el Nivel 7, no hay instrucciones paso a paso. El analista decide el orden de análisis, la profundidad de cada investigación y el momento de pasar de análisis a respuesta. Esta autonomía es la diferencia principal respecto a los niveles anteriores.

## 2. Fase 0 — Planificación inicial

Antes de ejecutar el primer comando, definir mentalmente:

- ¿Cuál es el objetivo de esta operación? (determinar el estado de seguridad del sistema y responder si hay amenazas activas)
- ¿Qué constituye una operación completa? (triage + análisis + contención + verificación + reporte)
- ¿En qué orden haré las fases?

## 3. Fase 1 — Detección: triage panorámico

```
systemctl status
journalctl -n 50
grep failed /var/log/auth.log
grep scan /var/log/syslog
grep -i crit /var/log/syslog
netstat -an
top -bn1
```

Objetivo: mapa completo del estado del sistema. Cuántos vectores activos, tipos, severidad.

## 4. Fase 2 — Análisis profundo por vector

Para cada vector identificado:

```
lastb -n 20                              → historial de intentos fallidos
grep <ip> /var/log/auth.log              → actividad de una IP específica
tcpdump host <ip>                        → tráfico de la IP sospechosa
tail -100 /var/log/nginx/access.log      → acceso web
netstat -tulpn                           → servicios en escucha
```

Construir la hipótesis de cada vector: tipo, fase, acceso obtenido, impacto.

## 5. Fase 3 — Correlación inter-vector

¿Los vectores son parte de un ataque coordinado? ¿Hay un vector principal y uno de distracción?

Formular la narrativa del incidente como hipótesis: "El incidente consiste en [X vectores] que [descripción]. Se inició con [primer evento] y escaló a [estado actual]."

## 6. Fase 4 — Contención

```
iptables -A INPUT -s <ip1> -j DROP
iptables -L INPUT -n
iptables -A INPUT -s <ip2> -j DROP    (si hay más de un vector)
iptables -L INPUT -n
```

En orden de severidad (acceso activo primero).

## 7. Fase 5 — Verificación de contención completa

```
tail -f /var/log/syslog
netstat -an
grep failed /var/log/auth.log
iptables -L
```

¿Cesó toda la actividad maliciosa? ¿Hay indicadores de compromiso residual?

## 8. Fase 6 — Reporte formal

```
export-report
```

El reporte debe incluir:
1. Resumen ejecutivo (para público no técnico).
2. Descripción técnica del incidente (vectores, evidencia, cronología).
3. Acciones de respuesta tomadas.
4. Estado del sistema al finalizar.
5. Recomendaciones de remediación.

## 9. Cuándo la operación está completa

La operación está completa cuando:
- Todos los vectores fueron identificados y caracterizados.
- Todos los vectores maliciosos fueron bloqueados y verificados.
- Se confirmó el cese de actividad maliciosa.
- Se identificaron y documentaron indicadores de compromiso residual.
- El reporte fue generado con la información completa.
