# Nivel 6 — Errores frecuentes en análisis multi-vector defensivo

## 1. Error 1 — Tratar el escenario como si fuera de vector único

**Descripción:** el estudiante ve el primer vector visible (el más ruidoso, generalmente un brute-force) y actúa sobre él sin verificar si hay más vectores activos.

**Consecuencias:** bloquea el vector de distracción mientras el vector real (más silencioso) sigue operando sin ser detectado.

**Corrección:** completar siempre el triage panorámico antes de actuar. Identificar el número total de vectores antes de responder a ninguno.

---

## 2. Error 2 — Bloquear en el orden equivocado

**Descripción:** el estudiante bloquea primero el vector más visible en vez del más peligroso.

**Consecuencias:** mientras bloquea el brute-force (que tiene muchas alertas pero no logró acceso), el vector de compromiso activo (con menos alertas pero acceso confirmado) sigue operando.

**Corrección:** priorizar el bloqueo según la fase del ataque, no según el número de alertas. Acceso activo = máxima prioridad.

---

## 3. Error 3 — No verificar que todos los vectores fueron bloqueados

**Descripción:** el estudiante bloquea una IP y da el incidente por resuelto sin verificar si quedan otros vectores activos.

**Consecuencias:** el segundo vector sigue activo y el estudiante no lo detecta porque ya no está buscando.

**Corrección:** después de bloquear cada vector, verificar explícitamente si hay actividad residual de otros vectores en los logs y en netstat.

---

## 4. Error 4 — No analizar la correlación entre vectores

**Descripción:** el estudiante analiza cada vector por separado pero no busca si están coordinados.

**Consecuencias:** el reporte describe dos incidentes independientes cuando en realidad son parte de un ataque coordinado. El cliente no comprende la sofisticación real del atacante.

**Corrección:** después de caracterizar cada vector, analizar explícitamente si la coordinación temporal, las técnicas complementarias o los objetivos compartidos sugieren que son parte del mismo ataque.

---

## 5. Error 5 — No investigar los procesos anómalos activos

**Descripción:** el estudiante bloquea todas las IPs pero no verifica si algún vector dejó un proceso malicioso activo en el sistema.

**Consecuencias:** el acceso externo está bloqueado, pero el backdoor instalado por el atacante sigue activo y podría usarse para reconectar desde una IP diferente.

**Corrección:** después de los bloqueos, siempre ejecutar `top -bn1` y `netstat -tulpn` para verificar si hay procesos o puertos anómalos que puedan indicar un backdoor persistente.
