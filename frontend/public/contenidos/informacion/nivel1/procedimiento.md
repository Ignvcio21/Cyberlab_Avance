# Nivel 1 — Procedimiento práctico guiado (manual de laboratorio)

## Objetivo operativo (qué se debe lograr)
Ejecutar un flujo de trabajo básico de pentesting/seguridad defensiva en un entorno controlado, siguiendo una secuencia verificable: **preparación → observación → análisis → decisión → verificación → registro**. El objetivo del procedimiento no es “terminar rápido”, sino **demostrar criterio**, evidenciar pasos y justificar decisiones.

---

## Paso 0 — Preparación (antes de ejecutar cualquier acción)
### 0.1 Definir el alcance del ejercicio (aunque sea laboratorio)
Incluso en laboratorio se debe declarar alcance de manera explícita. A nivel universitario, esto se escribe en una frase:

- **Alcance del ejercicio:** “Se trabajará sobre el escenario simulado del laboratorio, consultando alertas y eventos internos, y aplicando contención mediante bloqueo de IP en la plataforma”.

### 0.2 Regla de evidencia mínima
Se debe definir qué se considerará evidencia suficiente para sustentar una conclusión:

- Evidencia mínima: **captura o salida** de “alertas”, **captura o salida** de “eventos”, y **verificación** del bloqueo aplicado.

> **Nota académica:** sin evidencia mínima, el trabajo se vuelve no verificable y pierde valor evaluativo.

---

## Paso 1 — Reconocimiento inicial (lectura del contexto del caso)
### 1.1 Leer el escenario (qué está ocurriendo)
Antes de ejecutar comandos, se debe comprender qué se está simulando. En incidentes reales esto equivale a leer el “ticket” o el “alert summary”.

**Qué se debe identificar aquí:**
- tipo de actividad sospechosa (ej. intentos repetidos, escaneo),
- qué se espera observar como evidencia,
- cuál sería una contención razonable según el caso.

**Producto de este paso:**
- una frase de hipótesis:  
  “Se sospecha actividad anómala asociada a X; se confirmará con evidencia en eventos y se aplicará contención si procede”.

---

## Paso 2 — Detección (consulta de señales)
### 2.1 Consultar alertas
Se debe ejecutar una consulta equivalente a “alertas”. En un entorno real esto sería revisar SIEM/SOC.

**Qué se debe extraer:**
- título/descripcion de la alerta,
- severidad (si existe),
- por qué se considera relevante.

**Cómo se redacta (modelo de redacción):**
- “Se detectó una alerta que indica comportamiento anómalo asociado a _____. Esta señal se considera relevante porque sugiere repetición o abuso y requiere validación con evidencia”.

✅ **Checklist del paso 2**
- [ ] Se revisó la señal/alerta principal.  
- [ ] Se identificó qué se debe confirmar con evidencia.  

---

## Paso 3 — Análisis (evidencia primaria)
### 3.1 Consultar eventos
Este paso corresponde a revisar evidencia primaria (logs). En un pentest, sería equivalente a revisar resultados de enumeración/escaneo; en defensa, revisar registros de actividad.

**Qué se debe extraer de eventos:**
- IP de origen (actor),
- repetición/frecuencia (patrón),
- coherencia temporal (muchos eventos en poco tiempo),
- consistencia con hipótesis planteada.

**Cómo se redacta (modelo):**
- “Los eventos evidencian múltiples registros desde la IP ____ en un periodo reducido, lo que configura un patrón repetitivo consistente con ____”.

✅ **Checklist del paso 3**
- [ ] Se identificó la IP origen.  
- [ ] Se describió el patrón (frecuencia/repetición).  
- [ ] Se confirmó o rechazó la hipótesis inicial.  

---

## Paso 4 — Decisión (contención proporcional)
### 4.1 Decidir si corresponde contención
En seguridad profesional, no toda señal justifica bloqueo inmediato (posibles falsos positivos). En laboratorio se asume coherencia con el caso, pero el estudiante debe demostrar criterio:

**Criterios para justificar contención (mínimo):**
- patrón repetitivo confirmado,
- origen claro,
- riesgo razonable asociado al caso simulado.

### 4.2 Ejecutar contención (bloqueo)
Se aplica el bloqueo a la IP origen identificada en eventos.

**Redacción modelo:**
- “Se aplica contención mediante bloqueo de IP, dado que la evidencia muestra un patrón anómalo consistente con ____ y el origen está identificado”.

✅ **Checklist del paso 4**
- [ ] Se bloqueó exactamente la IP identificada como origen.  
- [ ] La contención se justifica con evidencia.  

---

## Paso 5 — Verificación (evidencia de resultado)
### 5.1 Confirmar que la medida quedó aplicada
En incidentes reales, este paso es obligatorio: sin verificación, no se puede afirmar que la respuesta fue efectiva.

**Qué se debe verificar:**
- que la IP bloqueada aparece en el listado/estado correspondiente,
- que el sistema refleja el cambio.

**Redacción modelo:**
- “Se verifica la contención consultando el estado posterior, confirmando que la IP ____ figura como bloqueada”.

✅ **Checklist del paso 5**
- [ ] Se verificó el estado posterior de contención.  
- [ ] La verificación se puede mostrar como evidencia (captura o salida).  

---

## Paso 6 — Cierre (registro y reporte)
### 6.1 Generar reporte y narración técnica
El cierre correcto exige dejar un registro resumido del proceso. A nivel universitario, el reporte debe permitir que un tercero entienda:
- qué ocurrió,
- qué evidencia lo sustenta,
- qué se hizo,
- y cómo se comprobó.

**Estructura mínima (modelo):**
- **Hallazgo:** “Patrón anómalo consistente con ____.”
- **Evidencia:** “Alertas + eventos (IP origen, repetición).”
- **Acción:** “Bloqueo de IP ____.”
- **Verificación:** “Confirmación en estado/listado posterior.”
- **Recomendación (si corresponde):** “Medidas complementarias: rate limiting, MFA, bloqueo progresivo…”

✅ **Checklist del paso 6**
- [ ] Se generó reporte.  
- [ ] Se puede explicar el caso en 60 segundos con evidencia.  

---

## Bifurcaciones (qué hacer si algo no calza)

### Caso A: No hay alertas
- Interpretación: podría no haberse disparado la regla o no hay actividad.
- Acción: consultar eventos directamente y verificar si existe evidencia.
- Conclusión: si no hay evidencia, no se justifica contención.

### Caso B: Hay alertas, pero eventos no muestran patrón
- Interpretación: posible falso positivo o umbral mal calibrado.
- Acción: no bloquear; documentar inconsistencia y recomendar ajuste de umbrales.
- Conclusión académica: demostrar criterio y proporcionalidad.

### Caso C: Se bloqueó una IP equivocada
- Acción inmediata: revertir el bloqueo, y aplicar bloqueo correcto.
- Evidencia: documentar corrección y verificación posterior.

---

## Errores que bajan nota (universidad)
- Bloquear sin consultar eventos.
- No poder explicar por qué la IP bloqueada corresponde al origen.
- Omitir verificación.
- Confundir alerta con evidencia.
- Conclusiones sin respaldo (texto sin evidencia).

---

## Mini-evaluación (para comprobar dominio)
1) ¿Cuál es la diferencia entre “señal” y “evidencia primaria”?  
2) ¿Qué elementos mínimos describen un patrón anómalo en eventos?  
3) ¿Qué justifica un bloqueo de IP desde el punto de vista metodológico?  
4) ¿Por qué la verificación es obligatoria y qué evidencia genera?  
5) Redacte el cierre del caso en 5 líneas usando: hallazgo, evidencia, acción y verificación.