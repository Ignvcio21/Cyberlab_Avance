# Nivel 1 — Criterio de aprobación (rúbrica y criterios medibles)

## Propósito de esta sección
El criterio de aprobación define **qué se considera logro** en el Nivel 1 desde una perspectiva universitaria. No se evalúa únicamente “llegar a un resultado”, sino demostrar **método**, **evidencia** y **comunicación técnica**. Esta sección se presenta como una rúbrica: criterios verificables, evidencias mínimas y ejemplos de cumplimiento.

> **Regla evaluativa:** un resultado sin evidencia es una afirmación; un resultado con evidencia y verificación es un hallazgo.

---

## A) Condiciones de aprobación (requisitos obligatorios)

### A.1 Lectura completa del contenido del nivel (progreso teórico)
**Requisito:** 100% de lectura en el Nivel 1.  
**Cómo se verifica:** el sistema marca cada pestaña como “Vista” al llegar al final del contenido.  
**Interpretación académica:** se asegura exposición mínima al material teórico (conceptos, metodología, buenas prácticas y criterio).

**No cumple cuando:**
- el progreso queda bajo 100%,
- o el estudiante no puede explicar conceptos básicos (pentesting, alcance, evidencia, verificación).

---

### A.2 Ejecución práctica con método (flujo de trabajo)
**Requisito:** demostrar un flujo coherente de trabajo, alineado con metodología universitaria:
1) señal/indicador (detección),
2) evidencia primaria (análisis),
3) decisión de contención (respuesta),
4) verificación posterior (confirmación),
5) registro/reporte (documentación).

**Cómo se verifica:**
- historial de terminal,
- checklist del escenario,
- consistencia entre evidencia consultada y acción aplicada.

**No cumple cuando:**
- se bloquea sin revisar evidencia,
- se omite verificación,
- o se “adivina” el resultado sin justificar.

---

### A.3 Escenario práctico completado al 100% dentro del tiempo
**Requisito:** completar el checklist del escenario al 100% dentro del tiempo definido.  
**Observación:** errores intermedios no invalidan el logro si son corregidos y se completa el objetivo final.

**Cómo se verifica:**
- progreso del escenario (porcentaje),
- estado “resuelto” y checklist completo,
- registro de acciones correctas en terminal.

**No cumple cuando:**
- el tiempo termina sin completar checklist,
- o se completa por “ensayo y error” sin poder explicar el procedimiento.

---

### A.4 Evidencia mínima obligatoria (para sustentación académica)
Para que el ejercicio sea evaluable y defendible, el estudiante debe poder mostrar evidencia mínima:

- **Señal:** evidencia de alerta (o indicación equivalente).
- **Evidencia primaria:** eventos/logs que confirmen patrón y origen.
- **Acción:** comando/acción defensiva aplicada.
- **Verificación:** evidencia de estado posterior que confirme el cambio.
- **Cierre:** reporte o síntesis final (aunque sea breve).

**No cumple cuando:**
- existen conclusiones sin salidas/registro,
- o no se puede reconstruir la secuencia del procedimiento.

---

## B) Rúbrica (tabla de evaluación por criterios)

| Criterio | Nivel insuficiente | Nivel competente | Nivel destacado |
|---|---|---|---|
| Conceptos base (pentesting, alcance, evidencia) | definiciones vagas o incompletas | define y diferencia correctamente | define, diferencia y ejemplifica con precisión |
| Metodología por fases | acciones sin orden | sigue secuencia señal → evidencia → acción → verificación | explica el porqué del orden y reconoce falsos positivos |
| Interpretación de evidencia | no describe patrón/origen | identifica origen y patrón con claridad | interpreta y prioriza con criterio técnico |
| Contención y proporcionalidad | bloquea sin justificación | aplica contención con evidencia | justifica, menciona impacto y alternativas (defensa en profundidad) |
| Verificación | no verifica | verifica explícitamente | verifica y documenta como evidencia de resultado |
| Documentación | sin estructura | reporte mínimo completo | reporte claro, reproducible y con mitigaciones |

---

## C) Ejemplos evaluativos (aprobado vs no aprobado)

### Ejemplo 1 — Aprobado (respuesta defendible)
**Descripción técnica (modelo):**
- “Se revisó una señal inicial (alerta) que indicó actividad anómala.”
- “Se consultó evidencia primaria (eventos) y se identificó patrón repetitivo desde la IP X.”
- “Se aplicó contención bloqueando la IP X debido a la evidencia observada.”
- “Se verificó el resultado consultando el estado posterior, confirmando que X quedó bloqueada.”
- “Se generó reporte y se recomienda defensa en profundidad (rate limiting/MFA) como mejora.”

**Por qué aprueba:**
- hay orden metodológico,
- evidencia y verificación están presentes,
- existe capacidad de explicación técnica.

---

### Ejemplo 2 — No aprobado (resultado sin método)
**Descripción típica:**
- “Vi una alerta y bloqueé una IP para que se resolviera.”

**Problemas:**
- no hay evidencia primaria citada,
- no se demuestra patrón ni origen,
- no hay verificación,
- no se puede auditar ni defender.

**Conclusión evaluativa:** insuficiente, aunque el escenario se “complete” por casualidad.

---

### Ejemplo 3 — No aprobado (falta de verificación)
**Descripción típica:**
- “Bloqueé la IP, así que ya está.”

**Problema:**
- no se confirma el cambio de estado,
- no existe evidencia de resultado.

**Conclusión evaluativa:** procedimiento incompleto.

---

## D) Criterios de comunicación en evaluación oral
El estudiante debe ser capaz de explicar el trabajo de forma breve (30–60 segundos) usando estructura formal:

1) **Señal:** qué se observó y por qué importaba.
2) **Evidencia:** qué eventos confirmaron patrón y origen.
3) **Decisión:** qué medida se aplicó y su justificación.
4) **Verificación:** cómo se confirmó el resultado.
5) **Cierre:** qué se documentó y qué se recomienda.

El uso de lenguaje subjetivo (“parecía ataque”) disminuye evaluación, porque no aporta evidencia.

---

## E) Checklist final (auto-control antes de “entregar”)
- [ ] Lectura Nivel 1 completada al 100%.
- [ ] Puedo definir pentesting y explicar alcance.
- [ ] Puedo describir la secuencia señal → evidencia → contención → verificación.
- [ ] Puedo identificar la IP origen y el patrón en eventos.
- [ ] Apliqué contención coherente (no al azar).
- [ ] Verifiqué explícitamente el estado posterior.
- [ ] Puedo mostrar evidencia mínima (salidas/capturas).
- [ ] Generé reporte y puedo explicar su contenido.
- [ ] Puedo mencionar al menos 2 mejoras reales (defensa en profundidad).

---

## Mini-evaluación (control de logro)
1) ¿Qué condiciones mínimas hacen que un ejercicio sea “defendible” en universidad?  
2) ¿Por qué la verificación es obligatoria aunque el bloqueo “parezca” funcionar?  
3) ¿Qué evidencia mínima debe aparecer en un hallazgo formal?  
4) ¿Qué diferencia hay entre completar un checklist y demostrar método?  
5) Redacte una explicación de 5 líneas siguiendo: señal → evidencia → patrón → decisión → verificación.