# Nivel 6 — Criterio de evaluación

## 1. Descripción del nivel

El Nivel 6 evalúa la capacidad del estudiante para analizar escenarios de ataque coordinado con múltiples vectores simultáneos. La habilidad central no es el dominio de comandos individuales (ya demostrada en niveles anteriores), sino la capacidad de mantener una visión sistémica del incidente y correlacionar información de múltiples fuentes antes de actuar.

---

## 2. Criterios de evaluación

### 2.1. Triage inicial (20%)
- El estudiante ejecutó los comandos de triage al inicio de la sesión.
- Identificó correctamente la presencia de múltiples vectores activos.
- No inició acciones de respuesta antes de completar el triage.

### 2.2. Caracterización de vectores (20%)
- Ejecutó `resolve host` para cada IP sospechosa identificada.
- Usó la información de reputación y DNS para discriminar entre IPs maliciosas y tráfico legítimo.
- No bloqueó IPs sin evidencia suficiente.

### 2.3. Correlación entre vectores (20%)
- Identificó la relación (o independencia) entre los vectores.
- Determinó cuál era el vector principal y cuál el secundario o distractor.
- La narrativa del análisis refleja comprensión del incidente como un todo, no como dos eventos separados.

### 2.4. Respuesta y contención (20%)
- Bloqueó todas las IPs maliciosas confirmadas.
- El orden de bloqueo fue coherente con la prioridad de severidad.
- Verificó el estado de bloqueo con `show blocked`.
- No bloqueó IPs de tráfico legítimo.

### 2.5. Verificación post-respuesta (10%)
- Ejecutó comandos de verificación después del bloqueo.
- Confirmó que la actividad maliciosa cesó.
- Identificó si hubo actividad residual o vectores adicionales.

### 2.6. Documentación del incidente (10%)
- El reporte incluye análisis de cada vector por separado.
- El reporte incluye correlación inter-vector.
- El reporte incluye evaluación de impacto combinado.
- El reporte es claro y podría ser entendido por un tercero sin haber visto la sesión.

---

## 3. Indicadores de desempeño destacado

- Identificó correctamente si los vectores estaban coordinados o eran independientes, con justificación basada en evidencia.
- El reporte tiene una estructura clara que separa vectores y correlación.
- Bloqueó primero el vector más peligroso con justificación explícita.
- Ejecutó verificación post-bloqueo y encontró o descartó actividad residual.

## 4. Indicadores de desempeño insuficiente

- Trató el escenario como si fuera de vector único y no identificó el segundo vector.
- Bloqueó una IP de tráfico legítimo.
- Actuó sobre el primer vector antes de completar el triage.
- El reporte no menciona la correlación entre vectores.
- No ejecutó verificación post-bloqueo.

---

## 5. Nota mínima de aprobación

Se requiere completar correctamente los ítems 2.1, 2.2, 2.4 y al menos uno de los ítems de reporte para aprobar el nivel. La correlación inter-vector (2.3) es necesaria para obtener nota máxima.
