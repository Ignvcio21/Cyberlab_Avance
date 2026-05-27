
---

## Archivo: `criterio.md`

```md
# Nivel 2 — Criterio de aprobación

## 1. Propósito de la evaluación

El criterio de aprobación del Nivel 2 busca evaluar no solamente si el estudiante logra completar el escenario, sino también si demuestra comprensión metodológica frente a actividades de reconocimiento ofensivo y escaneo de puertos.

Dentro del laboratorio CyberLab, el resultado final debe estar acompañado por:
- evidencia,
- interpretación,
- justificación técnica,
- y verificación posterior.

Desde una perspectiva académica, completar un escenario sin metodología no constituye aprendizaje suficiente. Por ello, la evaluación considera tanto la ejecución práctica como la capacidad de explicar técnicamente las decisiones adoptadas durante el procedimiento.

---

## 2. Requisitos mínimos de aprobación

Para aprobar correctamente el Nivel 2, el estudiante debe cumplir con las siguientes condiciones:

### 2.1 Lectura completa del contenido teórico
El progreso del nivel debe encontrarse al 100%.

Esto incluye:
- introducción,
- objetivos,
- fundamentos,
- metodología,
- comandos,
- evidencia,
- procedimiento,
- errores,
- criterio,
- y buenas prácticas.

La finalidad de este requisito es asegurar exposición mínima al contenido técnico y metodológico del nivel.

---

### 2.2 Comprensión del reconocimiento ofensivo

El estudiante debe demostrar comprensión básica de:
- reconocimiento activo,
- escaneo de puertos,
- análisis de servicios,
- patrones de enumeración,
- y relación entre eventos y alertas.

La evaluación considera insuficiente una explicación basada únicamente en “había una alerta”.

---

### 2.3 Aplicación correcta del flujo metodológico

El procedimiento debe seguir una secuencia coherente:

1) detección,  
2) análisis de evidencia,  
3) interpretación del patrón,  
4) acción de contención,  
5) verificación posterior.

El laboratorio evalúa especialmente:
- coherencia del orden,
- relación entre evidencia y acción,
- y justificación técnica.

---

### 2.4 Interpretación de eventos

El estudiante debe ser capaz de:
- identificar la IP origen,
- reconocer repetición,
- interpretar múltiples conexiones,
- y explicar por qué el comportamiento observado corresponde a reconocimiento ofensivo.

No basta con ejecutar comandos; debe existir interpretación técnica defendible.

---

### 2.5 Contención correctamente justificada

La acción defensiva aplicada debe:
- corresponder al origen identificado,
- basarse en evidencia,
- y ejecutarse utilizando sintaxis correcta.

El bloqueo de una IP incorrecta o sin justificación metodológica se considera error importante dentro del nivel.

---

### 2.6 Verificación posterior obligatoria

Después de aplicar contención, el estudiante debe confirmar el cambio de estado mediante evidencia posterior.

El procedimiento se considera incompleto cuando:
- no existe validación,
- o se asume que la acción funcionó sin comprobación.

---

## 3. Evidencia mínima requerida

Para que el escenario sea considerado defendible académicamente, debe existir evidencia mínima asociada al procedimiento:

- alerta revisada,
- eventos analizados,
- identificación de IP origen,
- interpretación del patrón,
- acción aplicada,
- y verificación posterior.

La ausencia de alguno de estos elementos debilita la calidad metodológica del ejercicio.

---

## 4. Escenario aprobado vs escenario incompleto

### Ejemplo de respuesta aprobada

> “Se revisó una alerta relacionada con posible escaneo de puertos. Posteriormente se analizaron eventos asociados a múltiples conexiones desde una misma IP hacia distintos servicios del sistema. El patrón observado era consistente con reconocimiento ofensivo, por lo que se aplicó contención bloqueando la IP identificada. Finalmente se verificó el cambio de estado mediante la consulta de IPs bloqueadas.”

### Por qué aprueba
- existe orden metodológico;
- se utiliza evidencia;
- se interpreta el patrón;
- hay contención;
- y existe verificación posterior.

---

### Ejemplo de respuesta insuficiente

> “Vi una alerta y bloqueé una IP.”

### Problemas
- no hay evidencia técnica;
- no se explica el patrón;
- no existe verificación;
- no se demuestra comprensión metodológica.

---

## 5. Criterios de calidad técnica

La evaluación considera de mejor calidad aquellos procedimientos donde:
- existe interpretación clara,
- la explicación utiliza terminología técnica,
- se diferencia alerta de evidencia,
- se interpreta comportamiento repetitivo,
- y la respuesta puede ser defendida oralmente.

---

## 6. Evaluación oral

Durante una explicación oral, el estudiante debe ser capaz de describir:

1) qué se detectó,  
2) qué evidencia lo confirmó,  
3) cuál fue el patrón observado,  
4) qué acción se aplicó,  
5) y cómo se verificó el resultado.

Las respuestas vagas o subjetivas disminuyen la calidad evaluativa.

---

## 7. Checklist de autoevaluación

Antes de considerar completado el nivel, el estudiante debería poder responder afirmativamente:

- [ ] Revisé alertas antes de actuar.
- [ ] Analicé eventos y no solo una señal inicial.
- [ ] Identifiqué correctamente la IP origen.
- [ ] Comprendí el patrón observado.
- [ ] Apliqué una contención coherente.
- [ ] Verifiqué el resultado posterior.
- [ ] Puedo explicar técnicamente el procedimiento.
- [ ] Puedo relacionar comandos con metodología.

---

## 8. Síntesis

El Nivel 2 se considera correctamente aprobado cuando el estudiante demuestra capacidad para analizar actividades de reconocimiento ofensivo utilizando evidencia, interpretación y metodología coherente.

El objetivo principal del nivel no consiste únicamente en completar un checklist, sino en desarrollar criterio técnico frente a patrones de enumeración y escaneo de puertos dentro de un entorno controlado.