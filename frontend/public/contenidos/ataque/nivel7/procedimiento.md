# Nivel 7 — Procedimiento de operación completa

## 1. Antes de comenzar: definir la operación

A diferencia de los niveles anteriores, el Nivel 7 no tiene un punto de entrada evidente. El estudiante debe definir su propio punto de entrada basándose en el contexto del ejercicio.

Antes de ejecutar cualquier comando, responde:

- ¿Cuál es el objetivo principal de esta operación?
- ¿Qué constituiría un resultado exitoso?
- ¿Cuál es mi primer paso y por qué?

---

## 2. Paso 1 — Reconocimiento panorámico

```
show hosts
show events
show alerts
show traffic
```

Lee cada resultado y construye un mapa mental del entorno:
- ¿Cuántos hosts están activos?
- ¿Hay alertas activas? ¿De qué tipo y de qué origen?
- ¿Cuántos vectores distintos parece haber?

No analices en profundidad todavía. Completa primero el panorama.

---

## 3. Paso 2 — Análisis dirigido por evidencia

Basándote en el reconocimiento panorámico, ejecuta los comandos que la evidencia indique:

Si hay IPs sospechosas → `resolve host`, `trace ip`  
Si hay sesiones activas anómalas → `show sessions`  
Si hay alertas sin IP clara → `show events` para más contexto

El orden de este paso lo decide la evidencia, no una receta.

---

## 4. Paso 3 — Hipótesis del incidente

Con el análisis hecho, formula una hipótesis:

> "El incidente consiste en [X vectores] que atacan [objetivo/s]. El vector principal parece ser [IP/técnica] porque [evidencia]. Los vectores están [coordinados/son independientes] porque [evidencia de correlación o ausencia de ella]."

Esta hipótesis guía las acciones de respuesta. Si la hipótesis es incorrecta, la verificación post-respuesta lo revelará.

---

## 5. Paso 4 — Contención ordenada

Bloquea los vectores maliciosos en orden de severidad:

```
block ip <ip-principal>
show blocked
```

Verifica antes de continuar. Luego:

```
block ip <ip-secundaria>   (si existe)
show blocked
```

---

## 6. Paso 5 — Verificación de completitud

```
show alerts
show events
show sessions
```

Evalúa:
- ¿Cesó toda la actividad maliciosa?
- ¿Hay nuevas alertas o eventos que sugieran vectores adicionales?
- ¿El sistema quedó en un estado más seguro que al inicio?

Si hay actividad residual, vuelve al Paso 2 y analiza la nueva evidencia.

---

## 7. Paso 6 — Documentación y cierre

```
history
export report
```

Revisa el historial para confirmar que la secuencia de acciones es coherente y no tiene pasos redundantes o errores.

El reporte del Nivel 7 debe incluir:

1. Resumen ejecutivo (en lenguaje no técnico)
2. Alcance operacional
3. Metodología aplicada
4. Hallazgos técnicos (por vector, con evidencia)
5. Impacto estimado
6. Acciones tomadas
7. Recomendaciones de remediación
8. Estado final del sistema

---

## 8. Checkpoint de completitud

Antes de cerrar la sesión, verifica:

- [ ] Reconocimiento panorámico completo (hosts, events, alerts, traffic).
- [ ] Cada IP sospechosa fue caracterizada con evidencia.
- [ ] Hipótesis de incidente formulada y contrastada con evidencia.
- [ ] Todos los vectores maliciosos identificados y bloqueados.
- [ ] Verificación post-bloqueo realizada.
- [ ] Actividad residual investigada si existió.
- [ ] Reporte generado con estructura profesional.
- [ ] Historia revisada para coherencia.
