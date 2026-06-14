# Nivel 4 — Errores frecuentes en explotación

## 1. Error 1 — Explotar sin analizar todas las vulnerabilidades

**Descripción:** el analista ejecuta una técnica de explotación sobre la primera vulnerabilidad visible en `show vulnerabilities` sin revisar las demás entradas.

**Por qué ocurre:** la urgencia por "hacer algo" en la explotación lleva a actuar antes de analizar el panorama completo.

**Consecuencias:**
- Se puede perder la vulnerabilidad de mayor impacto o más fácilmente explotable.
- El análisis queda incompleto aunque técnicamente se haya ejecutado una técnica.
- En una evaluación real, este error puede resultar en un informe que no refleja el riesgo real del sistema.

**Corrección:** ejecutar `show vulnerabilities`, leer todas las entradas y tomar decisiones de priorización antes de seleccionar cualquier técnica.

---

## 2. Error 2 — Explotar sin verificar el resultado

**Descripción:** el analista aplica una técnica y asume que fue exitosa sin ejecutar `show events` para verificar la evidencia.

**Por qué ocurre:** el analista interpreta la ausencia de error como éxito.

**Consecuencias:**
- El hallazgo no tiene evidencia verificable.
- En el reporte, el hallazgo queda sin soporte técnico suficiente.
- Es posible que la técnica no haya funcionado y el analista no lo sepa.

**Corrección:** siempre ejecutar `show events` (y opcionalmente `show alerts`) inmediatamente después de cualquier técnica de explotación.

---

## 3. Error 3 — Generar el reporte antes de completar el análisis

**Descripción:** el analista ejecuta `export report` antes de haber verificado los resultados de la explotación o antes de haber completado todos los pasos del procedimiento.

**Por qué ocurre:** el reporte se percibe como el "último paso" y se anticipa antes de que el análisis esté terminado.

**Consecuencias:**
- El reporte queda sin la evidencia de los pasos ejecutados posteriormente.
- El análisis formal queda incompleto.

**Corrección:** `export report` debe ser el último comando de la sesión, ejecutado únicamente después de que todos los pasos de identificación, ejecución, verificación y revisión estén completos.

---

## 4. Error 4 — Seleccionar técnica sin considerar el contexto del entorno

**Descripción:** el analista selecciona una técnica de explotación basándose solo en la severidad de la vulnerabilidad, sin verificar si las condiciones del entorno la hacen aplicable.

**Por qué ocurre:** se asume que toda vulnerabilidad de alta severidad es explotable en cualquier entorno.

**Consecuencias:**
- La técnica falla porque las condiciones no están cumplidas.
- Se pierde tiempo en técnicas inviables en vez de en las que sí son aplicables.

**Corrección:** antes de seleccionar la técnica, verificar con `resolve host` y `trace ip` las condiciones de conectividad y contexto del objetivo. Una vulnerabilidad alta con condiciones no cumplidas tiene menor prioridad operacional que una media con condiciones cumplidas.

---

## 5. Error 5 — Escalar la intervención más allá del alcance

**Descripción:** el analista, al obtener acceso inicial, ejecuta acciones adicionales no requeridas por el ejercicio (modificar datos, instalar herramientas, moverse a otros sistemas).

**Por qué ocurre:** el acceso obtenido genera motivación para explorar más allá del objetivo definido.

**Consecuencias:**
- En un entorno real, esto puede causar daño no autorizado al sistema.
- En el laboratorio, genera ruido en los registros que dificulta la evaluación del análisis.
- Transgresión ética y potencialmente legal en contextos reales.

**Corrección:** definir claramente el objetivo de la sesión antes de comenzar. Una vez que el objetivo está cumplido y verificado, detener la explotación y proceder a la documentación.

---

## 6. Error 6 — No relacionar la vulnerabilidad con los hallazgos previos

**Descripción:** el analista identifica y explota una vulnerabilidad de forma aislada, sin relacionarla con la información de reconocimiento y enumeración de sesiones anteriores.

**Por qué ocurre:** cada sesión se trata como independiente en vez de como parte de un análisis acumulativo.

**Consecuencias:**
- El reporte no contextualiza el hallazgo dentro de la superficie de ataque completa.
- La recomendación de remediación es menos precisa porque no considera el ecosistema del sistema analizado.

**Corrección:** antes de ejecutar cualquier técnica, revisar la información acumulada en fases previas. La explotación debe responder a un análisis progresivo, no a observaciones aisladas.

---

## 7. Error 7 — No documentar el procedimiento durante la sesión

**Descripción:** el analista ejecuta todos los pasos correctamente pero no mantiene ningún registro del procedimiento durante la sesión, confiando en la memoria para reconstruirlo en el reporte.

**Por qué ocurre:** la concentración en la ejecución técnica desplaza la atención sobre la documentación paralela.

**Consecuencias:**
- El reporte final queda con información imprecisa o incompleta.
- Los comandos exactos utilizados no quedan registrados.
- La reproducibilidad del análisis queda comprometida.

**Corrección:** utilizar `history` periódicamente durante la sesión para revisar el flujo ejecutado. El reporte final debe construirse sobre evidencia real, no sobre recuerdos aproximados.
