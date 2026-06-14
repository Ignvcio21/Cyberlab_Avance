# Nivel 6 — Errores frecuentes en análisis multi-vector

## 1. Error 1 — Tratar el escenario como si fuera de vector único

**Descripción:** el estudiante identifica el primer vector visible y lo analiza y bloquea como si fuera el único, ignorando el segundo.

**Consecuencias:** la contención es incompleta. El segundo vector sigue activo y el incidente no está resuelto, aunque el reporte podría dar la impresión de que sí.

**Corrección:** el triage inicial debe siempre determinar cuántos vectores están activos antes de responder a ninguno.

---

## 2. Error 2 — Bloquear IPs legítimas por error

**Descripción:** en un entorno con tráfico mixto, el estudiante bloquea una IP de tráfico legítimo pensando que es un vector malicioso.

**Consecuencias:** en un entorno real, esto cortaría acceso a usuarios o servicios legítimos.

**Corrección:** antes de cualquier bloqueo, caracterizar la IP con `resolve host` y confirmar que la evidencia de actividad maliciosa es suficiente.

---

## 3. Error 3 — Analizar los vectores sin correlacionarlos

**Descripción:** el estudiante analiza cada vector de forma completamente independiente y no busca relaciones entre ellos.

**Consecuencias:** el reporte describe dos incidentes separados cuando en realidad son parte de un incidente coordinado. El cliente no entiende la naturaleza real del ataque.

**Corrección:** después de analizar cada vector individualmente, dedicar tiempo explícito a buscar relaciones: mismo objetivo, coordinación temporal, técnicas complementarias.

---

## 4. Error 4 — No verificar la contención post-bloqueo

**Descripción:** después de bloquear ambas IPs, el estudiante no verifica si la actividad maliciosa cesó.

**Consecuencias:** puede quedar un vector activo no identificado, o el bloqueo puede no haberse aplicado correctamente.

**Corrección:** siempre ejecutar `show alerts` y `show events` después del bloqueo para confirmar que la actividad maliciosa cesó.

---

## 5. Error 5 — Reaccionar al primer vector sin completar el triage

**Descripción:** al ver la primera alerta relevante, el estudiante actúa inmediatamente sin completar el triage del escenario completo.

**Consecuencias:** la respuesta prematura al primer vector puede ser exactamente lo que el segundo vector necesita: que el analista esté ocupado con el primero mientras el segundo opera sin detección.

**Corrección:** siempre completar el triage antes de responder. El triage es rápido (tres comandos) y el costo de omitirlo es mucho mayor que el costo de ejecutarlo.

---

## 6. Error 6 — Reportar impactos por vector sin calcular el impacto combinado

**Descripción:** el reporte describe el impacto de cada vector por separado pero no evalúa el impacto combinado del incidente multi-vector.

**Consecuencias:** el cliente no comprende que el riesgo real es mayor que la suma de los vectores individuales, especialmente si están coordinados.

**Corrección:** incluir siempre una sección de "impacto combinado" en el reporte de incidentes multi-vector.
