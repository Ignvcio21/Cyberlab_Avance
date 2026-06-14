# Nivel 7 — Evidencia en un pentest completo

## 1. La evidencia como producto del pentest

En un pentest, la evidencia no es un accesorio del trabajo técnico: es el producto central. Sin evidencia documentada, los hallazgos son afirmaciones no verificables. Un cliente no puede remediar una vulnerabilidad que no puede reproducir o verificar.

En el Nivel 7, la calidad de la evidencia es evaluada con el mismo peso que la calidad técnica de la operación.

---

## 2. Tipos de evidencia en un pentest completo

### 2.1. Evidencia de reconocimiento
- Inventario de hosts y servicios descubiertos.
- Eventos y alertas identificados al inicio de la operación.
- Estado del tráfico de red en el momento del triage.

Esta evidencia establece el baseline: qué existía y estaba ocurriendo antes de la intervención.

### 2.2. Evidencia de identificación de vectores
- Resultados de `resolve host` para cada IP analizada.
- Resultados de `trace ip` para correlacionar vectores.
- Análisis de sesiones activas por vector.

Esta evidencia justifica por qué se clasificó cada IP como maliciosa o legítima.

### 2.3. Evidencia de correlación
- Secuencia temporal de eventos de cada vector.
- Objetivos de cada vector (hosts atacados, servicios explotados).
- Relación entre vectores: si comparten infraestructura, técnicas o timing.

Esta evidencia permite concluir si el incidente fue coordinado o coincidente, y cuál era el vector principal.

### 2.4. Evidencia de contención
- Registro de bloqueos aplicados (`show blocked`).
- Verificación de que la actividad cesó post-bloqueo.
- Si hubo actividad residual, documentar qué reveló y cómo se resolvió.

### 2.5. Evidencia de impacto
- ¿Qué servicios estaban expuestos a cada vector?
- ¿Qué daño podría haber causado si no se detectaba y respondía?
- Clasificación de severidad por vector (crítico, alto, medio, bajo).

---

## 3. Organización de la evidencia en el reporte

El reporte del Nivel 7 debe organizar la evidencia de forma que un técnico que no participó en la operación pueda reproducir cada hallazgo:

```
Hallazgo #1: [nombre descriptivo]
  - Severidad: [Crítico / Alto / Medio / Bajo]
  - Vector: [IP / técnica]
  - Evidencia: [qué comando lo reveló y qué mostró]
  - Impacto: [qué daño podría causar]
  - Recomendación: [cómo remediar]
```

Esta estructura para cada hallazgo hace el reporte accionable.

---

## 4. Evidencia ausente: qué hacer cuando no se encontró nada

Si una línea de investigación no produjo hallazgos, documentarlo también tiene valor. "Se analizaron todos los hosts del inventario y solo el Host X mostró actividad anómala" es una conclusión válida y completa el panorama del incidente.

Un reporte que solo documenta los positivos puede generar preguntas sobre qué más se investigó. Incluir los negativos relevantes demuestra exhaustividad.

---

## 5. Cadena de custodia conceptual

Aunque en el laboratorio no hay cadena de custodia real, el estudiante debe desarrollar el hábito de registrar:

- Cuándo se ejecutó cada comando (el historial lo captura).
- Qué se encontró con cada comando.
- Cómo se llegó de la evidencia a la conclusión.

Esta trazabilidad es fundamental en pentests reales donde la evidencia puede ser usada en procesos legales o auditorías.
