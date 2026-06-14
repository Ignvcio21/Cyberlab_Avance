# Nivel 3 — Buenas prácticas en enumeración

## 1. Planificar antes de ejecutar

Antes de usar cualquier comando de enumeración, define qué información necesitas obtener. Una sesión de enumeración profesional comienza con una pregunta: ¿qué quiero saber sobre este entorno que no sé todavía?

Esta pregunta orienta la selección de comandos y evita la exploración desordenada.

**Práctica concreta:** antes de abrir la terminal, revisa mentalmente (o en papel) qué información tienes del reconocimiento previo y qué vacíos de conocimiento necesitas cubrir con la enumeración.

---

## 2. Interpretar antes de continuar

Cada comando de enumeración produce una salida que debe interpretarse antes de ejecutar el siguiente. La interpretación no es opcional: es la etapa donde la información se convierte en conocimiento técnico utilizable.

**Práctica concreta:** después de cada comando, hazte tres preguntas: ¿qué muestra esta salida?, ¿qué significa técnicamente?, ¿cómo se relaciona con lo que ya sé del entorno?

---

## 3. Construir un modelo técnico progresivo

La enumeración profesional no produce una lista de hallazgos aislados, sino un modelo técnico del entorno que crece con cada observación. Cada nuevo dato debe integrarse en ese modelo.

**Práctica concreta:** mientras enumeras, construye mentalmente una imagen del entorno: qué hosts existen, qué servicios corren en cada uno, qué tecnologías usan, qué relaciones tienen entre sí.

---

## 4. Correlacionar siempre

Un hallazgo individual tiene valor limitado. Un hallazgo correlacionado con otros tiene valor multiplicado. La correlación revela patrones que no son visibles en datos aislados.

**Práctica concreta:** después de enumerar servicios individuales, dedica tiempo explícito a correlacionarlos: ¿qué servicios están en el mismo host?, ¿hay tecnologías relacionadas entre diferentes hosts?, ¿qué patrón de infraestructura emerge?

---

## 5. Priorizar con criterio técnico

No todos los hallazgos merecen la misma atención. La priorización debe basarse en criterios técnicos: accesibilidad, exposición, tecnologías potencialmente vulnerables, servicios administrativos visibles.

**Práctica concreta:** al finalizar la enumeración, identifica los tres hallazgos más relevantes desde una perspectiva ofensiva y justifica por qué merecen prioridad.

---

## 6. Validar antes de concluir

Toda conclusión técnica debe estar respaldada por evidencia observable. Antes de documentar un hallazgo, verifica que la evidencia lo sustenta.

**Práctica concreta:** para cada tecnología identificada o servicio clasificado, confirma que hay al menos un dato observable (banner, respuesta, comportamiento) que respalda la conclusión. Si no hay evidencia, la conclusión es una hipótesis, no un hallazgo.

---

## 7. Usar `history` para mantener trazabilidad

El historial de comandos permite revisar el flujo de trabajo y verificar que el procedimiento es coherente antes de documentar.

**Práctica concreta:** ejecuta `history` antes de generar el reporte para confirmar que los comandos ejecutados reflejan un procedimiento ordenado y completo.

---

## 8. Documentar con precisión técnica

La documentación de enumeración debe incluir no solo qué se encontró, sino cómo se identificó y qué evidencia lo respalda. Un reporte de enumeración de calidad describe hallazgos con suficiente detalle para que otro analista pueda verificarlos independientemente.

**Práctica concreta:** al generar `export report`, el documento debe poder responder: ¿qué servicios existen?, ¿qué tecnologías fueron identificadas?, ¿qué evidencia respalda cada hallazgo?, ¿cuál es la priorización ofensiva?

---

## 9. Tratar el tráfico y las sesiones como fuentes de evidencia complementaria

`show traffic` y `show sessions` proporcionan una dimensión de análisis diferente a `show services`: el comportamiento del entorno en tiempo real, no solo su configuración estática.

**Práctica concreta:** incluye siempre estos comandos en tu ciclo de enumeración. Los patrones de tráfico y sesiones activas frecuentemente revelan información que no es visible en el inventario de servicios.
