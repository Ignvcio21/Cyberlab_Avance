# Nivel 2 — Errores frecuentes en búsqueda de logs

## 1. Error 1 — Usar un único comando de búsqueda y concluir

**Descripción:** el estudiante ejecuta `grep failed /var/log/auth.log`, ve resultados, y concluye que sabe todo lo que necesita saber.

**Consecuencias:** pierde el contexto más amplio del incidente. Los fallos de autenticación pueden ser solo parte de un ataque que incluye escaneos, acceso web y otras actividades.

**Corrección:** ejecutar la secuencia completa de búsquedas antes de sacar conclusiones. Cada búsqueda aporta una dimensión distinta del análisis.

---

## 2. Error 2 — Ignorar la correlación temporal

**Descripción:** el estudiante ve eventos en distintas búsquedas pero no los relaciona temporalmente.

**Consecuencias:** no puede establecer la narrativa del ataque (qué ocurrió primero, qué habilitó qué). Sin narrativa temporal, el análisis es una lista de eventos sin contexto.

**Corrección:** para cada hallazgo, anotar el timestamp y luego ordenar todos los eventos cronológicamente para ver el patrón completo.

---

## 3. Error 3 — No distinguir entre frecuencia normal y anómala

**Descripción:** el estudiante ve 3 fallos de autenticación y los trata como un ataque de fuerza bruta. O ve 200 fallos y no identifica el patrón como anómalo.

**Consecuencias:** produce falsos positivos en el primer caso o falla en detectar un ataque real en el segundo.

**Corrección:** en el laboratorio, los patrones de ataque son deliberadamente claros (muchos intentos en poco tiempo, siempre desde la misma IP). En producción, el umbral de alerta suele ser configurable. La clave es comparar con el baseline: ¿es esta frecuencia inusual para este sistema?

---

## 4. Error 4 — No correlacionar logs de diferentes archivos

**Descripción:** el estudiante analiza solo `/var/log/auth.log` y no revisa `/var/log/syslog` ni el log de Nginx.

**Consecuencias:** pierde evidencia de escaneos, alertas críticas o actividad web que podría contextualizar o ampliar los hallazgos en auth.log.

**Corrección:** un análisis completo siempre revisa múltiples fuentes de log. La evidencia más completa surge de la correlación entre fuentes.

---

## 5. Error 5 — Usar `tail -f` antes de buscar en el historial

**Descripción:** el estudiante usa `tail -f` para seguir el log en tiempo real antes de haber buscado en el historial de eventos.

**Consecuencias:** puede ver actividad reciente pero no tiene contexto de qué ocurrió antes. Si el ataque ya terminó, `tail -f` no mostrará nada útil.

**Corrección:** buscar primero en el historial con `grep` y `tail -N`. Usar `tail -f` solo si se confirma que hay actividad en curso (timestamps muy recientes en los resultados de grep).
