# Nivel 2 — Buenas prácticas de búsqueda en logs

## 1. Formular una hipótesis antes de buscar

Antes de ejecutar `grep`, pregúntate: ¿qué estoy buscando y por qué? Una búsqueda sin hipótesis puede encontrar cosas por azar, pero no construye una comprensión sistemática del incidente.

Ejemplo: "Sospecho que hay un ataque de fuerza bruta porque el sistema tiene alertas activas" → busco con `grep failed /var/log/auth.log`.

## 2. Buscar en múltiples fuentes de log

Ningún archivo de log cuenta la historia completa. `/var/log/auth.log` muestra la autenticación; `/var/log/syslog` muestra el sistema y la red; `/var/log/nginx/access.log` muestra el acceso web. Un análisis completo revisa los tres.

## 3. Anotar la IP de origen de cada hallazgo

La IP de origen es el dato más valioso de cualquier log de seguridad: es la dirección del atacante. Anota la IP de cada hallazgo y verifica si aparece en otros logs. Una IP que aparece en escaneos, fallos de auth y acceso web es un atacante activo muy bien documentado.

## 4. Leer al menos las primeras y últimas líneas de cada resultado

En búsquedas con muchos resultados, lee al menos las primeras y últimas líneas. Las primeras indican cuándo empezó la actividad; las últimas, cuándo terminó o si está en curso.

## 5. Usar `grep -i` para búsquedas insensibles a mayúsculas

Las palabras clave en logs no siempre tienen el mismo capitalizado. `CRIT`, `Crit` y `crit` pueden aparecer dependiendo del servicio que escribió el log. Usar `-i` evita perder resultados por diferencias de capitalización.

## 6. Correlacionar antes de concluir

Antes de concluir que hay un ataque de fuerza bruta, verifica que los fallos de autenticación son realmente de la misma IP y en un período corto. Antes de concluir que hay un escaneo coordinado con el brute-force, verifica que la IP del escaneo coincide con la del brute-force.

La correlación distingue el análisis riguroso del superficial.

## 7. `tail -f` es para incidentes activos

No uses `tail -f` como herramienta de análisis histórico. Está diseñado para monitorización en tiempo real. Si el ataque ocurrió hace una hora, `tail -f` no te mostrará nada útil. Usa `grep` y `tail -N` para el análisis histórico, y reserva `tail -f` para cuando los timestamps te indiquen que la actividad es actual.
