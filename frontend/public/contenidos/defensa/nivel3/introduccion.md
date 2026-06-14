# Nivel 3 — Detección de intrusiones

## 1. Del análisis de logs a la detección de ataques

En los niveles anteriores, el analista aprendió a leer logs y a buscar en ellos. El Nivel 3 introduce el siguiente paso: usar esas habilidades para detectar ataques activos de manera más sistemática.

La detección de intrusiones es el proceso de identificar actividad maliciosa en un sistema o red a partir de la evidencia disponible. A diferencia del análisis forense (que ocurre después del incidente), la detección ocurre durante o poco después del ataque, cuando todavía es posible contenerlo.

## 2. Los dos tipos de ataques más comunes en el Nivel 3

### 2.1. Ataque de fuerza bruta SSH
El atacante intenta autenticarse en el servidor SSH probando combinaciones de usuario y contraseña de forma automatizada. Puede generar decenas o cientos de intentos por minuto.

**Señales en los logs:**
- Muchas líneas `Failed password` en `/var/log/auth.log` desde la misma IP.
- Intentos consecutivos con diferentes usuarios (root, admin, user).
- El comando `lastb` muestra el historial de intentos fallidos.

### 2.2. Escaneo de puertos
El atacante explora qué puertos tiene abiertos el servidor para identificar servicios disponibles. Esto es típicamente el primer paso de un reconocimiento antes de un ataque más dirigido.

**Señales en los logs:**
- Eventos de tipo `scan` o `port scan` en el syslog.
- Múltiples conexiones en un período corto desde una IP a distintos puertos.
- Alertas de nivel CRIT relacionadas con actividad de escaneo.

## 3. Las herramientas del Nivel 3

El Nivel 3 introduce comandos adicionales a los del Nivel 2:

- `lastb -n 20` — muestra el historial de intentos de login fallidos del sistema. Es una vista más directa que buscar en auth.log.
- `netstat -an` — muestra todas las conexiones de red activas y puertos en escucha. Útil para ver conexiones sospechosas activas.
- `top -bn1` — muestra los procesos del sistema con su uso de CPU y memoria. Procesos anómalos con alto uso de recursos pueden indicar actividad maliciosa.

## 4. La diferencia entre indicador y prueba

Un indicador de compromiso (IoC) es una señal que sugiere que un sistema puede estar siendo atacado o ha sido comprometido. Un indicador no es una prueba definitiva; puede haber explicaciones legítimas.

La diferencia entre un analista junior y uno senior está en saber cuándo los indicadores son suficientemente fuertes para justificar una acción de respuesta. En el Nivel 3, los escenarios están calibrados para que los indicadores sean claros y la conclusión evidente.

## 5. Del análisis a la detección

El Nivel 3 no solo busca evidencia de ataques pasados: busca detectar ataques que pueden estar en curso. Esto requiere mayor urgencia y mayor rigor: cada minuto de detección tardía es un minuto más que el atacante tiene para operar.
