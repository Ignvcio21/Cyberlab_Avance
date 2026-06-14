# Nivel 7 — Fundamentos del ciclo completo de respuesta a incidentes

## 1. El estándar de respuesta a incidentes

El NIST SP 800-61 (Computer Security Incident Handling Guide) es el marco de referencia más usado para la gestión de incidentes de seguridad. Define el ciclo en cuatro fases que el Nivel 7 implementa en la práctica.

## 2. Fase 1: Preparación

La preparación incluye tener las herramientas, los procedimientos y los permisos necesarios antes de que ocurra el incidente. En CyberLab, esta fase está implícita: las herramientas ya están instaladas, el analista ya tiene los permisos y los procedimientos son los aprendidos en los niveles anteriores.

En la práctica real, la preparación incluye: definir un plan de respuesta, establecer quién toma qué decisiones, tener los contactos de escalación, y asegurar que los logs están siendo recopilados correctamente.

## 3. Fase 2: Detección y análisis

La detección requiere monitorización continua (automatizada o manual) para identificar cuando algo anómalo ocurre. El análisis convierte los datos brutos en comprensión del incidente.

**Herramientas en el Nivel 7:**
- `journalctl`, `grep`, `tail` para análisis de logs.
- `netstat`, `tcpdump` para análisis de red.
- `top`, `netstat -tulpn` para estado del sistema.

**Preguntas que el análisis debe responder:**
- ¿Qué tipo de incidente es?
- ¿Cuándo comenzó?
- ¿Cuántos vectores hay?
- ¿Hay acceso activo del atacante?

## 4. Fase 3: Contención, erradicación y recuperación

**Contención:** detener que el incidente se extienda o profundice. En el Nivel 7, la contención principal es el bloqueo de IPs con iptables.

**Erradicación:** eliminar los elementos maliciosos del sistema: procesos maliciosos, backdoors, cuentas comprometidas. En el nivel 7 del laboratorio, esto se evidencia identificando procesos anómalos.

**Recuperación:** restaurar el sistema a un estado seguro y verificar que funciona correctamente.

## 5. Fase 4: Actividades post-incidente y `export-report`

El `export-report` es el mecanismo del Nivel 7 para documentar el ciclo completo. Genera un reporte estructurado que refleja:

- El análisis realizado.
- Los vectores detectados y la evidencia.
- Las acciones de respuesta tomadas.
- El estado del sistema al finalizar.

El reporte de incidente tiene valor para el cliente (entender qué pasó), para el equipo (aprender del incidente) y para auditorías futuras (demostrar que se respondió correctamente).

## 6. La integración de todas las habilidades

El Nivel 7 no exige memorizar comandos: exige saber cuándo usar cada uno. Un analista que sabe usar `grep` pero no sabe cuándo usarlo no es competente. La competencia es la combinación de habilidad técnica + criterio analítico + capacidad de documentación.
