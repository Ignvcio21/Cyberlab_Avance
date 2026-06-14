# Nivel 5 — Errores frecuentes en post-explotación

## 1. Error 1 — Actuar agresivamente inmediatamente tras el acceso

**Descripción:** ejecutar múltiples comandos de post-explotación de forma rápida sin estabilizar primero el acceso ni evaluar el entorno.

**Consecuencias:** detección temprana, pérdida del acceso, daño no intencionado al sistema.

**Corrección:** el primer paso siempre es mapear el entorno y estabilizar el acceso antes de ejecutar cualquier acción ofensiva adicional.

---

## 2. Error 2 — No evaluar el radio de explosión

**Descripción:** el analista se limita al sistema comprometido sin explorar qué otros sistemas son accesibles desde ahí.

**Consecuencias:** el reporte subestima significativamente el impacto real del compromiso.

**Corrección:** ejecutar `show hosts` y `show sessions` para mapear el entorno accesible. El radio de explosión es uno de los hallazgos más importantes del Nivel 5.

---

## 3. Error 3 — No verificar si las acciones fueron detectadas

**Descripción:** el analista completa la post-explotación sin revisar `show alerts` para evaluar la respuesta defensiva del entorno.

**Consecuencias:** el reporte no incluye información sobre la capacidad de detección, perdiendo un hallazgo relevante.

**Corrección:** `show alerts` debe ejecutarse después de las acciones principales de post-explotación. La ausencia de alertas es un hallazgo tan importante como su presencia.

---

## 4. Error 4 — Escalar más allá del alcance autorizado

**Descripción:** el analista, con acceso amplio, ejecuta acciones no requeridas por el ejercicio: modificar datos, crear usuarios, instalar herramientas persistentes.

**Consecuencias:** en un contexto real, esto constituye un daño no autorizado al sistema del cliente. En el laboratorio, genera ruido que contamina la evaluación.

**Corrección:** mantener las acciones dentro del alcance definido. La post-explotación evalúa qué sería posible, no necesariamente realiza todo lo posible.

---

## 5. Error 5 — Documentar impacto sin evidencia específica

**Descripción:** el reporte afirma "se obtuvo acceso a datos sensibles" sin especificar qué datos, desde qué acceso y con qué evidencia.

**Consecuencias:** el cliente no puede entender el riesgo real. El hallazgo pierde credibilidad.

**Corrección:** cada afirmación de impacto debe ir acompañada de evidencia específica y observable.

---

## 6. Error 6 — No analizar el tráfico interno

**Descripción:** el analista usa `show hosts` y `show sessions` pero omite `show traffic`.

**Consecuencias:** se pierde información sobre comunicaciones internas, protocolos inseguros y relaciones entre sistemas.

**Corrección:** `show traffic` es parte obligatoria del mapeo interno en el Nivel 5. Complementa la información estática de hosts con el comportamiento dinámico de la red.
