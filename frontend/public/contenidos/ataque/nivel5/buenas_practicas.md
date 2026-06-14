# Nivel 5 — Buenas prácticas en post-explotación

## 1. Estabilizar antes de explorar

El primer instinto tras obtener acceso puede ser explorar agresivamente el entorno. La práctica profesional indica lo contrario: primero estabilizar el acceso, luego explorar metódicamente.

**Práctica concreta:** antes de ejecutar cualquier comando de mapeo, confirma que el acceso es estable y comprende sus límites.

## 2. Mapear antes de actuar

El mapeo del entorno interno siempre precede a cualquier acción ofensiva adicional. Actuar sin mapeo produce intervenciones desinformadas que pueden tener consecuencias impredecibles.

**Práctica concreta:** ejecuta `show sessions`, `show hosts` y `show traffic` como bloque inicial antes de cualquier otra acción.

## 3. Cuantificar el radio de explosión explícitamente

El radio de explosión es el hallazgo más importante de la post-explotación. Debes poder afirmar con evidencia: "desde este compromiso inicial, un atacante podría acceder a N sistemas adicionales con X nivel de privilegio".

**Práctica concreta:** al finalizar el mapeo, calcula explícitamente el número de hosts accesibles y el tipo de acceso potencial a cada uno.

## 4. Evaluar la detección como hallazgo independiente

La capacidad del entorno para detectar post-explotación es un hallazgo de seguridad por sí mismo. Un entorno que no detecta post-explotación tiene una brecha defensiva crítica, independientemente de si la explotación inicial fue detectada.

**Práctica concreta:** ejecuta `show alerts` después de cada grupo de acciones y documenta qué fue detectado y qué no.

## 5. Aplicar el principio de mínimo impacto

La post-explotación debe producir el máximo conocimiento con el mínimo impacto sobre el sistema. Esto significa:

- Leer datos sin modificarlos.
- Evaluar posibilidades sin ejecutarlas todas.
- Documentar qué sería posible, no necesariamente hacerlo todo.

**Práctica concreta:** antes de ejecutar una acción de post-explotación, pregúntate si es necesaria para el análisis o si es suficiente con documentar que sería posible.

## 6. Documentar impacto en términos de negocio, no solo técnicos

Un buen reporte de post-explotación traduce los hallazgos técnicos al impacto de negocio: qué datos de clientes serían accesibles, qué operaciones se interrumpirían, qué consecuencias legales o regulatorias tendría el compromiso.

**Práctica concreta:** al redactar el reporte, para cada hallazgo técnico agrega una línea de impacto de negocio: "esto significa que...".
