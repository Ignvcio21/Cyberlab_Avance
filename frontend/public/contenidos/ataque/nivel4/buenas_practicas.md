# Nivel 4 — Buenas prácticas en explotación

## 1. Planificar antes de ejecutar

La explotación efectiva comienza antes del primer comando ofensivo. Un analista profesional revisa toda la información disponible antes de seleccionar una técnica:

- Información de reconocimiento y enumeración de fases previas.
- Lista completa de vulnerabilidades identificadas.
- Contexto técnico del objetivo (conectividad, topología, controles activos).

La planificación reduce el número de intentos fallidos, minimiza el impacto sobre el sistema analizado y produce un análisis más coherente y documentable.

**Práctica concreta:** antes de ejecutar `show vulnerabilities`, ten claro qué información esperas obtener y cómo la usarás para tomar decisiones.

## 2. Una acción a la vez, con verificación inmediata

En explotación, la velocidad no es una virtud en sí misma. Ejecutar múltiples técnicas en sucesión rápida sin verificar resultados intermedios genera:

- Ambigüedad sobre cuál técnica produjo qué resultado.
- Dificultad para documentar el procedimiento con precisión.
- Riesgo de causar efectos no deseados en el sistema.

**Práctica concreta:** después de cada técnica de explotación, ejecuta `show events` para verificar la evidencia antes de continuar con el siguiente paso.

## 3. Separar hallazgos técnicos de hallazgos documentados

Un hallazgo técnico es lo que encontraste durante el análisis. Un hallazgo documentado es lo que puede verificarse por un tercero a partir de tu reporte. Solo los hallazgos documentados tienen valor en una evaluación profesional.

Esta distinción implica que la calidad del análisis técnico no es suficiente si no va acompañada de documentación equivalente.

**Práctica concreta:** no cierres la sesión hasta que el reporte generado por `export report` incluya evidencia suficiente de cada hallazgo relevante.

## 4. Priorizar por explotabilidad real, no solo por severidad

La severidad documentada en una base de datos (CVE, CVSS) refleja el impacto máximo teórico de una vulnerabilidad en condiciones ideales. La explotabilidad real depende de las condiciones específicas del entorno analizado.

En la práctica, una vulnerabilidad de severidad alta puede ser inaccesible desde la posición del atacante, mientras que una de severidad media puede explotarse directamente sin restricciones.

**Práctica concreta:** al analizar la salida de `show vulnerabilities`, evalúa no solo la severidad sino la accesibilidad real: ¿el servicio es directamente alcanzable?, ¿están las condiciones cumplidas en este entorno?

## 5. Registrar el procedimiento, no solo el resultado

En una evaluación profesional, el procedimiento es tan importante como el resultado. Un analista que puede demostrar cómo llegó a un hallazgo tiene un valor diferencial sobre uno que solo puede mostrar la conclusión.

**Práctica concreta:** utiliza `history` para revisar el flujo de comandos antes de generar el reporte. Asegúrate de que el procedimiento ejecutado es coherente, ordenado y reproducible.

## 6. Considerar la detección como parte del análisis

En explotación profesional, es relevante saber no solo si la técnica funcionó, sino si fue detectada. Los sistemas con capacidad de detección activa pueden responder a la explotación bloqueando al atacante, generando alertas o activando contramedidas.

**Práctica concreta:** ejecuta `show alerts` después de cualquier técnica de explotación. Si el sistema generó alertas, documenta qué fue detectado y con qué severidad — es un hallazgo adicional sobre la capacidad defensiva del objetivo.

## 7. No escalar sin criterio

El acceso obtenido en una explotación puede dar visibilidad sobre otros sistemas, datos adicionales u oportunidades de movimiento lateral. En un contexto real, actuar sobre esas oportunidades sin autorización explícita es ilegal.

**Práctica concreta:** mantén el análisis dentro del alcance definido para el ejercicio. Una vez que el objetivo de explotación está cumplido y documentado, cierra la sesión con `export report` en lugar de explorar más allá del alcance.

## 8. Tratar la documentación como parte del análisis, no como un trámite final

El error más frecuente en analistas en formación es percibir el reporte como un "paso burocrático" al final del análisis. En realidad, la documentación es la materialización del valor del análisis: sin reporte, el trabajo técnico no existe para el cliente.

**Práctica concreta:** piensa en el reporte desde el inicio de la sesión. Mientras ejecutas, considera cómo describiras cada acción y qué evidencia incluirás para cada hallazgo.

## 9. Mantener trazabilidad completa

En una evaluación de seguridad profesional, el analista debe ser capaz de responder en cualquier momento:

- ¿Qué hiciste?
- ¿En qué orden?
- ¿Qué evidencia obtuviste?
- ¿Qué impacto tuvo?

La trazabilidad completa de la sesión (comandos ejecutados, salidas obtenidas, decisiones tomadas) es el estándar mínimo de calidad en explotación profesional.

**Práctica concreta:** en CyberLab, el sistema registra automáticamente tu actividad. Complementa ese registro ejecutando periódicamente `history` y revisando los eventos generados.
