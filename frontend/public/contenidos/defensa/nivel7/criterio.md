# Nivel 7 — Criterio de evaluación

## 1. Descripción del nivel

El Nivel 7 es la operación completa de SOC. Evalúa la capacidad del estudiante para planificar y ejecutar de forma autónoma un ciclo completo de respuesta a incidentes, desde el triage inicial hasta la entrega del reporte formal, con criterio profesional en todas las fases.

---

## 2. Criterios de evaluación

### 2.1. Planificación y estructura de la operación (10%)
- La operación muestra un orden lógico de fases.
- El estudiante no actuó sobre ningún vector antes de completar el triage.
- El plan se adaptó ante hallazgos inesperados de forma coherente.

### 2.2. Triage y detección completa (20%)
- Ejecutó los comandos de triage panorámico al inicio.
- Identificó correctamente todos los vectores activos (incluidos los de menor ruido).
- No pasó a análisis profundo de un vector antes de haber identificado los demás.

### 2.3. Análisis y caracterización (20%)
- Caracterizó cada vector con evidencia de múltiples fuentes.
- Determinó para cada vector: tipo, fase, acceso obtenido, severidad.
- Correlacionó los vectores con evidencia explícita.

### 2.4. Contención y verificación (20%)
- Bloqueó todos los vectores maliciosos identificados en orden de prioridad.
- Verificó cada bloqueo con `iptables -L INPUT -n`.
- Confirmó el cese de actividad maliciosa post-bloqueo.
- Verificó el estado post-respuesta del sistema (procesos, servicios, conexiones).

### 2.5. Reporte formal (30%)
- Generó el reporte con `export-report`.
- El reporte incluye resumen ejecutivo comprensible por público no técnico.
- El reporte incluye análisis técnico con evidencia para cada vector.
- El reporte incluye acciones de respuesta tomadas con justificación.
- El reporte incluye estado final del sistema.
- El reporte incluye al menos una recomendación de remediación específica y accionable.

---

## 3. Indicadores de desempeño destacado

- La operación muestra planificación explícita y adaptación ante hallazgos inesperados.
- El reporte del incidente podría entregarse directamente a un cliente real.
- Las recomendaciones de remediación son específicas, técnicamente correctas y priorizadas.
- El estudiante identificó y documentó indicadores de compromiso residual post-bloqueo.
- La correlación inter-vector está justificada con evidencia concreta.

## 4. Indicadores de desempeño insuficiente

- No completó el triage antes de actuar.
- No generó el reporte con `export-report`.
- El reporte carece de resumen ejecutivo o no tiene recomendaciones.
- No verificó la contención después de los bloqueos.
- No analizó el estado del sistema post-respuesta.

---

## 5. Nota mínima de aprobación

Se requiere completar el ciclo completo: triage + análisis de todos los vectores + contención verificada + reporte generado con resumen ejecutivo y al menos una recomendación para aprobar el nivel. Los criterios de excelencia (correlación, recomendaciones específicas, análisis post-respuesta) determinan la nota máxima.

---

## 6. Observación final

El Nivel 7 no tiene una única secuencia de pasos correcta. Diferentes analistas pueden llevar la operación en distintos órdenes y producir análisis igualmente válidos. El criterio evalúa la completitud, el rigor analítico y la calidad del reporte, no la adherencia a una secuencia específica.
