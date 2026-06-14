# Nivel 1 — Errores frecuentes en la inspección inicial

## 1. Error 1 — Saltarse la inspección inicial y buscar directamente un problema

**Descripción:** el estudiante ejecuta comandos de búsqueda específica (como `grep failed /var/log/auth.log`) antes de haber completado la inspección panorámica del sistema.

**Consecuencias:** puede encontrar un hallazgo específico y perder de vista el contexto del sistema. Lo que parece un incidente aislado podría ser parte de un patrón más amplio que solo la inspección panorámica revelaría.

**Corrección:** completar siempre la secuencia básica (whoami, systemctl status, journalctl, cat /var/log/syslog) antes de profundizar en búsquedas específicas.

---

## 2. Error 2 — No leer la salida de los comandos

**Descripción:** el estudiante ejecuta el comando pero no lee la salida con atención. Solo verifica que el comando corrió sin error y avanza.

**Consecuencias:** puede pasar por alto información importante que estaba disponible. En un análisis real, este tipo de distracción puede costar horas de investigación posterior.

**Corrección:** antes de ejecutar el siguiente comando, leer y procesar la salida del anterior. Si la salida es larga, identificar al menos los campos clave: timestamp, origen, mensaje.

---

## 3. Error 3 — Interpretar todo lo desconocido como anómalo

**Descripción:** el estudiante ve un mensaje de log que no reconoce y lo marca como sospechoso sin investigar si es comportamiento normal del sistema.

**Consecuencias:** produce falsos positivos que consumen tiempo y atención innecesarios.

**Corrección:** en el Nivel 1, ante algo desconocido, la primera pregunta es "¿es esto normal para este sistema?". Los mensajes de nivel `INFO` son casi siempre operación normal. Solo `ERR`, `CRIT` y `WARNING` ameritan atención inmediata.

---

## 4. Error 4 — Ejecutar los comandos sin un propósito definido

**Descripción:** el estudiante ejecuta los comandos en cualquier orden o repite comandos ya ejecutados sin razón.

**Consecuencias:** la sesión se convierte en una lista de comandos sin estructura analítica. El historial de comandos no refleja un proceso de análisis coherente.

**Corrección:** cada comando debe responder a una pregunta específica. Antes de ejecutarlo, definir qué se busca saber con él.

---

## 5. Error 5 — No registrar el estado del sistema al inicio

**Descripción:** el estudiante no toma nota del estado del sistema al comienzo del análisis (servicios activos, fecha de último reinicio, nivel de actividad en logs).

**Consecuencias:** al final del análisis, no puede comparar el estado actual con el estado inicial para determinar si algo cambió durante la sesión.

**Corrección:** al completar la inspección inicial, formular mentalmente o por escrito una descripción del estado baseline: "el sistema tiene X servicios activos, Y eventos en el log, último reinicio hace Z horas."
