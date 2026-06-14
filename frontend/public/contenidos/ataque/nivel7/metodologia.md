# Nivel 7 — Metodología del pentest completo

## 1. Diferencia metodológica del Nivel 7

En los niveles anteriores, la metodología era lineal: el ejercicio guiaba implícitamente al estudiante hacia los comandos necesarios. En el Nivel 7, no hay guía implícita. El estudiante decide la metodología y la ejecuta.

Esto requiere un cambio de postura: de seguidor de instrucciones a diseñador de la operación.

---

## 2. Fase 0 — Planificación antes de ejecutar

Antes de ejecutar el primer comando, el estudiante debe definir:

**Alcance operacional:**
- ¿Qué hosts están en alcance en este ejercicio?
- ¿Cuáles son los objetivos de la operación (qué debo encontrar)?

**Plan de fases:**
- ¿Qué haré primero? ¿Reconocimiento, revisión de alertas activas, o tráfico?
- Si encuentro múltiples vectores activos, ¿cómo los priorizaré?

**Criterio de completitud:**
- ¿Cuándo consideraré que la operación está completa?
- ¿Qué evidencia mínima necesito para el reporte final?

---

## 3. Fase 1 — Reconocimiento inicial

Comenzar con una visión panorámica del entorno:

```
show hosts        → inventario de hosts y servicios
show events       → actividad registrada
show alerts       → alertas activas
show traffic      → flujos de tráfico en curso
```

El objetivo no es analizar en profundidad todavía, sino mapear el estado del entorno y determinar por dónde empezar.

---

## 4. Fase 2 — Análisis dirigido

Con el mapa inicial, dirigir el análisis hacia los elementos más relevantes:

```
resolve host      → para IPs con actividad sospechosa
trace ip          → para analizar rutas de vectores específicos
show sessions     → para ver conexiones activas por vector
```

Esta fase puede revelar múltiples vectores activos (como en Nivel 6) o revelar un único vector complejo que requiere análisis en profundidad.

---

## 5. Fase 3 — Ejecución de respuesta

Con el análisis completo, ejecutar acciones de respuesta en orden de prioridad:

```
block ip <ip>     → para contener vectores maliciosos confirmados
show blocked      → verificar aplicación del bloqueo
```

Verificar después de cada acción que el resultado es el esperado.

---

## 6. Fase 4 — Verificación de completitud

```
show alerts       → ¿hay alertas sin resolver?
show events       → ¿hay eventos activos de IPs bloqueadas?
show sessions     → ¿hay sesiones activas de vectores maliciosos?
```

Esta verificación determina si la operación está completa o si hay trabajo pendiente.

---

## 7. Fase 5 — Documentación y cierre

```
history           → revisar la secuencia completa de acciones
export report     → generar el reporte del pentest
```

El reporte del Nivel 7 debe tener la estructura de un reporte de pentest profesional:

1. **Resumen ejecutivo** — para un público no técnico, en 3-5 oraciones.
2. **Alcance** — qué sistemas y vectores fueron evaluados.
3. **Metodología** — cómo se condujo la operación.
4. **Hallazgos** — qué vulnerabilidades o ataques se encontraron, con evidencia.
5. **Impacto** — qué daño podría haber causado cada hallazgo.
6. **Recomendaciones** — qué cambios remedian cada hallazgo.
7. **Conclusión** — estado del sistema al finalizar la operación.

---

## 8. Adaptación del plan

Un plan de pentest no es rígido. Si en la Fase 2 se descubren 3 vectores activos en vez de los 2 esperados, el plan debe adaptarse. Si un análisis no produce resultados, no hay que seguir ejecutando el mismo comando: hay que cambiar de enfoque.

La capacidad de adaptar el plan es la diferencia entre un analista que ejecuta pasos y un analista que piensa.

---

## 9. Límites de la operación

No ejecutar acciones fuera del alcance definido, aunque sea técnicamente posible. No repetir acciones que ya produjeron resultado. No generar evidencia que no tenga relación con los objetivos de la operación.

Eficiencia y disciplina son indicadores de profesionalismo igual que la capacidad técnica.
