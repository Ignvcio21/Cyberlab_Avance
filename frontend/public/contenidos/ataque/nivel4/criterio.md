# Nivel 4 — Criterio de evaluación

## 1. Qué se evalúa en el Nivel 4

El Nivel 4 evalúa la capacidad del estudiante para completar un ciclo completo de explotación dentro del entorno simulado: identificar vulnerabilidades, seleccionar técnica con criterio, ejecutar de forma controlada, verificar con evidencia y documentar el hallazgo.

La evaluación no se limita al resultado técnico (si la explotación fue exitosa), sino que pondera la coherencia del procedimiento completo.

## 2. Criterios técnicos

### 2.1. Identificación de vulnerabilidades
- Se ejecutó `show vulnerabilities` y se analizó la salida completa.
- Se seleccionó la vulnerabilidad con criterio de priorización (no aleatoriamente).
- La selección considera severidad, accesibilidad y explotabilidad real en el entorno.

### 2.2. Contexto previo a la explotación
- Se ejecutó `resolve host` para contextualizar el objetivo.
- Se ejecutó `trace ip` para analizar conectividad y topología.
- La información obtenida fue considerada en la selección de técnica.

### 2.3. Ejecución de la explotación
- La técnica seleccionada es coherente con la vulnerabilidad identificada.
- Se ejecutó una acción a la vez, con revisión entre pasos.
- No se escaló la intervención más allá del alcance del ejercicio.

### 2.4. Verificación con evidencia
- Se ejecutó `show events` después de la explotación para verificar actividad registrada.
- Se ejecutó `show alerts` para evaluar la capacidad de detección del sistema.
- La evidencia obtenida es coherente con la técnica aplicada.

### 2.5. Documentación
- Se ejecutó `history` para revisar el flujo antes del cierre.
- Se ejecutó `export report` como cierre formal, con el procedimiento completo ya ejecutado.
- El reporte contiene evidencia suficiente del hallazgo.

## 3. Ponderación del procedimiento

| Etapa | Peso relativo | Indicadores |
|---|---|---|
| Identificación | Alto | `show vulnerabilities` ejecutado y decisión de priorización justificable |
| Contexto | Medio | `resolve host` y `trace ip` ejecutados antes de la explotación |
| Ejecución | Alto | Técnica coherente con la vulnerabilidad, ejecutada con control |
| Verificación | Alto | `show events` y `show alerts` ejecutados y revisados |
| Documentación | Alto | `export report` ejecutado al final, con procedimiento completo |

## 4. Nivel de desempeño esperado

### Desempeño mínimo aprobatorio
- Se ejecutó `show vulnerabilities` y se aplicó al menos una técnica de explotación.
- Se verificó el resultado con `show events`.
- Se generó el reporte con `export report`.

### Desempeño satisfactorio
- Todos los criterios técnicos completados.
- Selección de vulnerabilidad con criterio de priorización documentable.
- Verificación de detección mediante `show alerts`.
- Procedimiento coherente y sin pasos contradictorios.

### Desempeño destacado
- Todos los criterios satisfactorios cumplidos.
- Análisis de múltiples vulnerabilidades con justificación de la priorización.
- Evidencia de resultado clara y reproducible.
- Reporte que incluye descripción de la técnica, evidencia, impacto y recomendación de remediación.
- Capacidad de explicar oralmente cada decisión tomada durante el procedimiento.

## 5. Criterio de coherencia metodológica

El criterio de coherencia evalúa si el procedimiento ejecutado refleja comprensión del ciclo de explotación o si fue una ejecución mecánica de comandos. Se considera coherente un procedimiento donde:

- Las decisiones tienen justificación técnica basada en la evidencia disponible.
- El orden de los comandos refleja la secuencia lógica del ciclo metodológico.
- No hay acciones contradictorias (por ejemplo, verificar antes de ejecutar, o exportar antes de verificar).

Un procedimiento técnicamente completo pero metodológicamente incoherente obtiene una evaluación menor que uno con algún paso incompleto pero metodológicamente justificado.

## 6. Autoevaluación previa a la entrega

Antes de generar el reporte final, verifica:

- [ ] ¿Analizaste todas las vulnerabilidades antes de seleccionar una?
- [ ] ¿Ejecutaste `resolve host` y `trace ip` antes de la explotación?
- [ ] ¿Verificaste el resultado con `show events`?
- [ ] ¿Revisaste si el sistema generó alertas con `show alerts`?
- [ ] ¿Revisaste el flujo completo con `history`?
- [ ] ¿El reporte (`export report`) refleja un procedimiento completo?

Si algún ítem no está cumplido, complétalo antes de cerrar la sesión.
