# Nivel 1 — Evidencia en la inspección inicial

## 1. Qué constituye evidencia en el Nivel 1

En el Nivel 1, la evidencia no es la de un incidente activo. Es la evidencia del estado del sistema: lo que los comandos de inspección revelaron sobre el baseline del entorno.

Aunque el Nivel 1 no requiere responder a ningún ataque, el hábito de documentar lo observado es esencial para todos los niveles posteriores.

## 2. Tipos de evidencia generados en el Nivel 1

### 2.1. Estado de usuario y permisos
La salida de `whoami` documenta quién realizó el análisis y bajo qué contexto de permisos. Esto es relevante para establecer la trazabilidad del trabajo del analista.

### 2.2. Estado de los servicios
La salida de `systemctl status` documenta:
- Qué servicios estaban activos al momento del análisis.
- Si había servicios fallidos o inactivos.
- Cuándo fue el último inicio del sistema.

Este dato establece el baseline de servicios que puede usarse como referencia para detectar cambios futuros.

### 2.3. Eventos del diario
Los eventos de `journalctl` documentan la actividad del sistema en el período observado. Incluso si no hay anomalías, el registro de la actividad normal es valioso.

### 2.4. Contenido del log general
La salida de `cat /var/log/syslog` documenta el estado del sistema desde la perspectiva del log general. Complementa el diario con información de servicios que no necesariamente escriben a journald.

## 3. La diferencia entre datos y evidencia

Datos son los resultados crudos de los comandos. Evidencia es la interpretación de esos datos en el contexto del análisis.

> "El sistema muestra 0 servicios en estado `failed`" es un dato.
> "El estado de servicios es normal, sin indicadores de servicios comprometidos o caídos" es evidencia.

El analista defensivo transforma datos en evidencia mediante la interpretación. El Nivel 1 desarrolla la base para esta transformación.

## 4. Documentar el baseline

Al completar el Nivel 1, el estudiante debería ser capaz de resumir el estado del sistema en términos como:

- Estado de servicios: normal / anomalía detectada (cuál).
- Actividad en logs: sin eventos anómalos / eventos anómalos detectados (cuáles).
- Último reinicio del sistema: fecha y hora.

Este resumen es el punto de partida para análisis más profundos en niveles superiores.
