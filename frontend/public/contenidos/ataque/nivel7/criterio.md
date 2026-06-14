# Nivel 7 — Criterio de evaluación

## 1. Descripción del nivel

El Nivel 7 es la operación completa de pentest. Evalúa la capacidad del estudiante para planificar, ejecutar y documentar una operación de seguridad ofensiva de principio a fin, con autonomía total y criterio profesional. Es el nivel de integración final de la trayectoria de CyberLab.

---

## 2. Criterios de evaluación

### 2.1. Planificación y estructura de la operación (15%)
- Evidencia de planificación antes de la primera acción técnica.
- El orden de las fases fue coherente y justificable.
- El estudiante no ejecutó comandos sin propósito identificable.

### 2.2. Reconocimiento panorámico (15%)
- Ejecutó los cuatro comandos de reconocimiento panorámico al inicio.
- Identificó correctamente los vectores activos y los activos en riesgo.
- Usó la información del reconocimiento para guiar el análisis siguiente.

### 2.3. Análisis y caracterización de vectores (20%)
- Caracterizó cada vector con evidencia suficiente (`resolve host`, `trace ip`, análisis de sesiones y eventos).
- Discriminó correctamente entre IPs maliciosas y tráfico legítimo.
- Formuló y contrastó hipótesis de correlación entre vectores.

### 2.4. Contención y verificación (15%)
- Bloqueó todos los vectores maliciosos confirmados.
- El orden de bloqueo fue coherente con la severidad.
- Verificó la efectividad de la contención post-bloqueo.

### 2.5. Calidad del reporte técnico (20%)
- El reporte tiene estructura profesional (resumen ejecutivo, hallazgos, impacto, recomendaciones).
- Cada hallazgo tiene evidencia, severidad, impacto y recomendación de remediación.
- Los hallazgos están organizados por relevancia para el cliente, no cronológicamente.

### 2.6. Resumen ejecutivo (15%)
- El resumen es comprensible para un público no técnico.
- Comunica el riesgo en términos de impacto de negocio, no solo técnicos.
- No incluye jerga técnica innecesaria.

---

## 3. Indicadores de desempeño destacado

- La operación muestra una planificación explícita y el plan se adapta ante hallazgos inesperados.
- El reporte distingue entre hallazgos de diferente severidad con clasificación explícita y justificada.
- Las recomendaciones de remediación son específicas e implementables.
- El resumen ejecutivo podría ser entregado directamente a un cliente real.
- El estudiante identificó y documentó qué investigó fuera de alcance sin haberlo analizado.

## 4. Indicadores de desempeño insuficiente

- La operación no tuvo reconocimiento panorámico inicial.
- El estudiante no completó el análisis de todos los vectores activos.
- El reporte es una descripción cronológica de comandos sin análisis de impacto.
- No hay recomendaciones de remediación en el reporte.
- El estudiante bloqueó IPs sin evidencia suficiente (falsos positivos).
- No verificó la contención después del bloqueo.

---

## 4. Nota mínima de aprobación

Se requiere completar correctamente los ítems 2.2, 2.3, 2.4 y producir un reporte con al menos estructura básica (hallazgos + evidencia + recomendaciones) para aprobar el nivel. Los ítems 2.1 y 2.6 (planificación y resumen ejecutivo) son necesarios para nota máxima.

---

## 5. Observación final

El Nivel 7 no tiene una solución única. Diferentes estudiantes pueden conducir la operación en diferentes órdenes y llegar al mismo resultado correcto. El criterio evalúa la coherencia y calidad del proceso, no la adherencia a una secuencia específica de pasos. Esto refleja la realidad de la práctica profesional: hay múltiples caminos válidos a un buen pentest.
