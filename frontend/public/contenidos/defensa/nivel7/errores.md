# Nivel 7 — Errores frecuentes en la operación completa de SOC

## 1. Error 1 — No planificar antes de ejecutar

**Descripción:** el estudiante abre la sesión y ejecuta el primer comando que recuerda, sin definir el orden de las fases ni el criterio de completitud.

**Consecuencias:** la operación se vuelve reactiva y desorganizada. El historial de comandos no refleja un proceso coherente. El reporte resultante no tiene estructura clara.

**Corrección:** antes del primer comando, definir el plan: qué fases seguiré, en qué orden y cuándo consideraré la operación completa.

---

## 2. Error 2 — Pasar a contención sin terminar el análisis

**Descripción:** el estudiante bloquea la primera IP maliciosa que encuentra sin completar el análisis de todos los vectores.

**Consecuencias:** bloquea un vector pero puede perder otro. La operación queda incompleta y el reporte no refleja el incidente completo.

**Corrección:** completar el triage y el análisis de todos los vectores antes de ejecutar el primer bloqueo. La excepción es si hay acceso activo crítico: en ese caso, la contención inmediata tiene prioridad.

---

## 3. Error 3 — Generar el reporte sin completar el análisis

**Descripción:** el estudiante ejecuta `export-report` antes de haber completado el análisis y la respuesta.

**Consecuencias:** el reporte es incompleto y no refleja el estado real del incidente. Vectores no detectados no aparecen en el reporte.

**Corrección:** `export-report` es el último paso de la operación. Se ejecuta cuando el análisis está completo, todos los vectores están contenidos y la verificación está hecha.

---

## 4. Error 4 — Reporte sin recomendaciones de remediación

**Descripción:** el reporte documenta el incidente pero no incluye qué hacer para evitarlo en el futuro.

**Consecuencias:** el cliente sabe qué pasó pero no qué cambiar. La mitad del valor del reporte está ausente.

**Corrección:** siempre incluir al menos una recomendación de remediación para cada tipo de ataque encontrado. Para brute-force: fail2ban + autenticación con clave. Para acceso web: WAF + revisión de permisos. Para backdoors: auditoría de integridad del sistema.

---

## 5. Error 5 — Reporte sin resumen ejecutivo comprensible

**Descripción:** el reporte es técnicamente correcto pero no puede ser entendido por alguien sin conocimientos de seguridad.

**Consecuencias:** el cliente que contrata el SOC no puede entender qué ocurrió ni qué riesgo representó. La comunicación falla.

**Corrección:** el resumen ejecutivo debe describir el incidente en términos de impacto de negocio, no de comandos técnicos. "Se detectó y bloqueó un intento de acceso no autorizado que habría comprometido la confidencialidad de los datos del servidor" es un resumen ejecutivo; "85 intentos fallidos de brute-force SSH desde 192.168.1.100" es un resumen técnico.

---

## 6. Error 6 — No verificar el estado post-respuesta del sistema

**Descripción:** el estudiante bloquea las IPs y considera el incidente resuelto sin verificar si hay compromisos residuales.

**Consecuencias:** puede haber un backdoor activo, un proceso malicioso en ejecución o credenciales comprometidas. El incidente no está realmente resuelto.

**Corrección:** después de los bloqueos, siempre ejecutar `top -bn1`, `netstat -tulpn` e `iptables -L` para verificar el estado completo del sistema. Documentar explícitamente si se descartaron indicadores de compromiso residual.
