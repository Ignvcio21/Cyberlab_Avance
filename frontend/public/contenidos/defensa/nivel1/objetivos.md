# Nivel 1 — Objetivos de aprendizaje

## 1. Objetivo general

Familiarizarse con el entorno de análisis defensivo, los archivos de log del sistema Linux y los comandos básicos de monitorización, desarrollando la capacidad de obtener una visión inicial del estado del sistema.

---

## 2. Objetivos específicos

### 2.1. Conocer el entorno de trabajo
- Identificar el perfil del usuario analista en el sistema.
- Comprender qué rol tiene el analista SOC en el equipo de seguridad.
- Orientarse dentro del entorno de terminal de CyberLab.

### 2.2. Entender la estructura de logs en Linux
- Conocer la función de `/var/log/syslog` como registro general del sistema.
- Conocer la función de `/var/log/auth.log` como registro de autenticación.
- Entender qué información contiene cada tipo de log y por qué es relevante para seguridad.

### 2.3. Ejecutar comandos básicos de inspección
- Usar `whoami` para identificar el usuario activo y sus permisos.
- Usar `systemctl status` para verificar el estado de los servicios del sistema.
- Usar `journalctl` para acceder al registro centralizado del sistema.
- Usar `cat /var/log/syslog` para leer el log general del sistema.

### 2.4. Interpretar la salida de los comandos
- Distinguir entre una entrada de log normal y una potencialmente anómala.
- Identificar los campos básicos de una entrada de log: timestamp, servicio, mensaje.
- Relacionar el estado de los servicios con la seguridad del sistema.

---

## 3. Competencias desarrolladas al completar el nivel

Al finalizar el Nivel 1, el estudiante habrá demostrado:

- Capacidad de orientarse en un entorno de terminal Linux básico.
- Comprensión de la función de los logs como fuente de evidencia defensiva.
- Habilidad para ejecutar comandos básicos de monitorización y leer su salida.
- Disposición para interpretar el estado del sistema desde una perspectiva de seguridad.

---

## 4. Relación con niveles posteriores

Las habilidades del Nivel 1 son la base de todos los niveles siguientes:

- El Nivel 2 agrega búsqueda y filtrado en los mismos logs.
- El Nivel 3 introduce análisis de intrusiones sobre los mismos archivos.
- Los Niveles 4-7 añaden captura de tráfico, bloqueo de IPs y reporte, siempre partiendo de los mismos comandos de inspección base.

Dominar los comandos del Nivel 1 no es opcional: son el vocabulario fundamental del analista defensivo.
