# Nivel 1 — Introducción a la monitorización de sistemas

## 1. El rol del analista de seguridad defensiva

La ciberseguridad tiene dos caras complementarias: quienes atacan los sistemas para encontrar vulnerabilidades y quienes los defienden para detectar y responder ante amenazas reales. El analista de seguridad defensiva opera en esta segunda línea: su herramienta principal no son los exploits, sino los registros del sistema.

Un sistema bajo ataque deja rastros. Cada intento de conexión, cada autenticación fallida, cada proceso anómalo genera un registro. El analista defensivo sabe dónde buscar esos registros, cómo interpretarlos y qué hacer con lo que encuentra.

## 2. Los logs como evidencia del estado del sistema

Un log (registro del sistema) es un archivo de texto que el sistema operativo, las aplicaciones y los servicios de red escriben de forma continua. Contienen entradas con timestamp, origen y descripción de cada evento relevante.

Los principales archivos de log en un sistema Linux son:

- `/var/log/syslog`: registro general del sistema, incluye eventos de kernel, servicios y aplicaciones.
- `/var/log/auth.log`: registro de eventos de autenticación, accesos SSH, intentos de login.
- `/var/log/nginx/access.log`: accesos al servidor web, incluye IPs de origen.

Estos archivos son el punto de partida de cualquier análisis defensivo.

## 3. Por qué los logs importan en seguridad

Sin logs, un sistema comprometido puede estar bajo ataque durante semanas sin que nadie lo detecte. Con logs bien analizados, un ataque puede detectarse en minutos y contenerse antes de que cause daño significativo.

Los logs permiten:

- **Detectar anomalías:** un número inusual de intentos de login fallidos puede indicar un ataque de fuerza bruta.
- **Correlacionar eventos:** múltiples eventos de distintas fuentes pueden revelar un ataque coordinado que ningún evento individual haría visible.
- **Reconstruir incidentes:** después de un compromiso, los logs permiten entender qué ocurrió, cuándo y desde dónde.
- **Auditar el sistema:** los logs permiten verificar que las políticas de acceso se respetan.

## 4. El entorno de laboratorio del Nivel 1

En CyberLab, el entorno de defensa simula una estación de trabajo de un analista SOC (Security Operations Center). El analista tiene acceso a los logs del sistema, a herramientas de análisis y a la capacidad de bloquear IPs maliciosas.

En el Nivel 1, el objetivo es familiarizarse con el entorno: dónde están los logs, cómo se ven, qué información contienen. Los comandos disponibles son simples pero fundamentales para todos los niveles posteriores.

## 5. La postura defensiva

A diferencia de la postura ofensiva, donde el objetivo es explotar vulnerabilidades, la postura defensiva tiene como objetivo mantener la integridad, disponibilidad y confidencialidad del sistema. Esto implica:

- Monitorizar continuamente: no solo cuando hay una alerta.
- Documentar todo: las acciones tomadas y la evidencia que las justificó.
- Responder con proporcionalidad: no toda anomalía requiere una respuesta de emergencia.
- Aprender del incidente: cada evento analizado mejora la capacidad de detectar el siguiente.

El Nivel 1 establece las bases conceptuales y prácticas para desarrollar esta postura a lo largo de los 7 niveles.
