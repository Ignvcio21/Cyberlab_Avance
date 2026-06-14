# Nivel 2 — Objetivos de aprendizaje

## 1. Objetivo general

Desarrollar la capacidad de buscar y filtrar eventos específicos en los logs del sistema usando herramientas de línea de comandos, con el fin de identificar indicadores de actividad sospechosa de forma eficiente.

---

## 2. Objetivos específicos

### 2.1. Dominar el uso de grep para análisis de logs
- Usar `grep failed /var/log/auth.log` para identificar intentos de autenticación fallidos.
- Usar `grep scan /var/log/syslog` para identificar eventos de escaneo de red.
- Usar `grep -i crit /var/log/syslog` para encontrar alertas críticas del sistema.
- Usar `grep <término> /var/log/auth.log` para buscar patrones específicos en el log de autenticación.

### 2.2. Usar tail para monitorización de logs
- Usar `tail -N /var/log/syslog` para ver las últimas N entradas del log del sistema.
- Usar `tail -f /var/log/syslog` para seguir el log en tiempo real durante un incidente activo.
- Usar `tail -N /var/log/nginx/access.log` para revisar los accesos web más recientes.

### 2.3. Interpretar los resultados de las búsquedas
- Distinguir entre eventos de autenticación legítima y fallida.
- Identificar patrones de frecuencia que indican fuerza bruta (múltiples fallos consecutivos).
- Reconocer eventos de escaneo de red en el syslog.
- Evaluar la severidad de las alertas críticas encontradas.

### 2.4. Combinar múltiples comandos para un análisis completo
- Usar más de un comando de búsqueda para construir una visión completa de la actividad sospechosa.
- Relacionar eventos de diferentes archivos de log para correlacionar la actividad.

---

## 3. Competencias desarrolladas al completar el nivel

- Uso eficiente de herramientas de búsqueda en archivos de texto grandes.
- Capacidad de identificar indicadores básicos de ataque en logs del sistema.
- Hábito de búsqueda dirigida en lugar de lectura completa de logs.

---

## 4. Relación con niveles posteriores

- El Nivel 3 usa los mismos comandos para detectar intrusiones activas con mayor profundidad.
- El Nivel 5 correlaciona los hallazgos de búsqueda en logs con decisiones de bloqueo de IPs.
- El Nivel 7 integra la búsqueda en logs como parte de la cadena completa de análisis y respuesta.
