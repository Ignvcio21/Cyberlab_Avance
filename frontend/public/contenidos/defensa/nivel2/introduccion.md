# Nivel 2 — Búsqueda y filtrado en logs

## 1. El problema de la escala

Un servidor en producción puede generar miles de entradas de log por hora. Leer el log completo con `cat` como en el Nivel 1 es útil para familiarizarse con el formato, pero no es viable para detectar amenazas en tiempo real.

El Nivel 2 introduce la habilidad clave que hace escalable el análisis de logs: **buscar y filtrar**. En vez de leer todo el contenido, el analista busca patrones específicos que indiquen actividad sospechosa.

## 2. grep como herramienta de análisis

`grep` es una herramienta de búsqueda de texto que filtra líneas de un archivo que coinciden con un patrón. En análisis de logs, `grep` permite ir directamente a los eventos relevantes sin leer todo el archivo.

Por ejemplo, en un archivo de log con 10.000 líneas, ejecutar:
```
grep failed /var/log/auth.log
```
devuelve únicamente las líneas que contienen la palabra "failed", que en el contexto de `/var/log/auth.log` corresponden a intentos de autenticación fallidos.

## 3. La relevancia de los patrones de búsqueda

Elegir el patrón correcto de búsqueda es tan importante como ejecutar el comando. Algunos patrones clave para análisis de seguridad son:

- `failed` en `/var/log/auth.log` → intentos de login fallidos (posible fuerza bruta).
- `scan` en `/var/log/syslog` → eventos de escaneo de puertos.
- `crit` (insensible a mayúsculas) en `/var/log/syslog` → alertas críticas del sistema.

El analista experimenta en los niveles iniciales y va refinando sus patrones de búsqueda con la práctica.

## 4. tail como herramienta de monitorización en tiempo real

`tail` muestra las últimas líneas de un archivo. En el contexto de logs, permite ver los eventos más recientes sin leer el archivo completo.

```
tail -50 /var/log/syslog
```
muestra las últimas 50 líneas del log.

```
tail -f /var/log/syslog
```
muestra las últimas líneas y sigue actualizándose en tiempo real a medida que el log crece. Esta variante es especialmente útil cuando se sospecha que un ataque está en curso.

## 5. La diferencia entre Nivel 1 y Nivel 2

En el Nivel 1, el analista lee los logs para entender el estado del sistema.
En el Nivel 2, el analista busca en los logs para encontrar evidencia de actividad sospechosa.

Este cambio de postura —de lector a investigador— es el paso conceptual fundamental del Nivel 2.
