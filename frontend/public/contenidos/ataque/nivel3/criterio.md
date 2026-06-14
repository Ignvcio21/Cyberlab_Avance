# Nivel 3 — Criterio de evaluación

## 1. Qué se evalúa en el Nivel 3

El Nivel 3 evalúa la capacidad del estudiante para ejecutar un proceso completo de enumeración ofensiva con criterio metodológico: identificar servicios y tecnologías expuestas, correlacionar hallazgos, priorizar desde una perspectiva ofensiva y documentar el análisis con evidencia.

La evaluación pondera tanto la completitud técnica (¿se ejecutaron los comandos correctos?) como la coherencia metodológica (¿el procedimiento refleja comprensión del ciclo de enumeración?).

---

## 2. Criterios técnicos

### 2.1. Identificación de hosts y servicios
- `show hosts` ejecutado e interpretado.
- `show services` ejecutado con análisis de tecnologías visibles.
- Los servicios identificados fueron relacionados con los hosts correspondientes.

### 2.2. Análisis de comportamiento del entorno
- `show traffic` ejecutado y correlacionado con servicios identificados.
- `show sessions` revisado para identificar conexiones activas.
- `show failed logins` revisado para detectar actividad de autenticación.

### 2.3. Contexto del objetivo
- `resolve host` ejecutado para el objetivo principal.
- `trace ip` ejecutado para analizar conectividad y topología.
- La información obtenida fue integrada en el análisis de superficie de ataque.

### 2.4. Correlación y priorización
- Los hallazgos individuales fueron correlacionados para construir una visión de conjunto.
- Se identificaron los servicios/tecnologías de mayor relevancia ofensiva.
- La priorización tiene justificación técnica basada en evidencia observable.

### 2.5. Documentación
- `history` revisado antes del cierre.
- `export report` ejecutado al finalizar el ciclo completo.
- El reporte refleja hallazgos correlacionados, no solo listados individuales.

---

## 3. Niveles de desempeño

### Desempeño mínimo aprobatorio
- `show services` y `show hosts` ejecutados.
- Al menos una correlación entre servicios identificada.
- `export report` ejecutado al cierre.

### Desempeño satisfactorio
- Todos los criterios técnicos completados.
- `show traffic`, `show sessions` y `show failed logins` incluidos en el ciclo.
- Priorización ofensiva documentable con justificación técnica.
- Procedimiento coherente y sin pasos contradictorios.

### Desempeño destacado
- Todos los criterios satisfactorios cumplidos.
- Correlación profunda entre múltiples servicios con interpretación tecnológica precisa.
- Fingerprinting tecnológico con evidencia observable explícita para cada tecnología identificada.
- Capacidad de explicar oralmente qué revela cada hallazgo y por qué tiene relevancia ofensiva.
- Reporte que incluye priorización justificada y relación con posibles vectores de fases posteriores.

---

## 4. Criterio de coherencia metodológica

La coherencia metodológica se evalúa verificando que el procedimiento ejecutado refleje comprensión del ciclo de enumeración:

- observación → interpretación → correlación → priorización → documentación.

Un procedimiento incoherente típico incluye: exportar el reporte antes de correlacionar, ejecutar técnicas de explotación antes de completar la enumeración, o documentar tecnologías sin evidencia observable que las respalde.

---

## 5. Autoevaluación previa a la entrega

- [ ] ¿Ejecutaste `show hosts` y analizaste cuántos objetivos hay en el entorno?
- [ ] ¿Ejecutaste `show services` e interpretaste cada servicio listado?
- [ ] ¿Revisaste `show traffic` y correlacionaste con los servicios?
- [ ] ¿Revisaste `show sessions` y `show failed logins`?
- [ ] ¿Ejecutaste `resolve host` y `trace ip` para el objetivo principal?
- [ ] ¿Realizaste una fase explícita de correlación entre hallazgos?
- [ ] ¿Identificaste y justificaste la priorización ofensiva?
- [ ] ¿El reporte (`export report`) refleja ese análisis completo?
