# Nivel 2 — Evidencia en búsqueda de logs

## 1. Qué constituye evidencia en el Nivel 2

En el Nivel 2, la evidencia es el conjunto de resultados de las búsquedas en logs que demuestran la existencia de actividad sospechosa. A diferencia del Nivel 1 (donde la evidencia era el estado baseline), aquí la evidencia documenta un comportamiento anómalo específico.

## 2. Tipos de evidencia del Nivel 2

### 2.1. Evidencia de autenticación fallida
- Número total de intentos fallidos encontrados con `grep failed /var/log/auth.log`.
- IP(s) de origen de los intentos.
- Rango temporal de los intentos (¿cuándo empezaron? ¿cuánto duraron?).
- Usuarios objetivo de los intentos (root, admin, nombres específicos).

### 2.2. Evidencia de reconocimiento (escaneo)
- Presencia o ausencia de eventos de escaneo en el syslog.
- IP de origen del escaneo y si coincide con la IP de los fallos de auth.
- Secuencia temporal: ¿el escaneo ocurrió antes que los intentos de brute-force?

### 2.3. Evidencia de alertas críticas
- Tipo y contenido de las alertas de nivel CRIT encontradas.
- Servicio que generó la alerta (kernel, IDS, integridad de archivos).
- Momento en que ocurrió la alerta en relación con el resto de la actividad.

### 2.4. Evidencia de actividad web
- Peticiones HTTP a rutas sensibles desde IPs sospechosas.
- Códigos de respuesta (403 indica que el sistema tuvo alguna protección; 200 indica acceso exitoso).

## 3. Organizar la evidencia por IP de origen

En el Nivel 2, la forma más clara de organizar la evidencia es por IP de origen:

**IP: 192.168.1.100**
- Escaneo de puertos detectado: 03:15:00
- 52 intentos de autenticación fallida vía SSH: 03:21:07 - 03:22:30
- Peticiones HTTP a /admin y /.env: 03:23:00
- Alerta crítica de múltiples fallos de autenticación: 03:22:00

Esta organización hace evidente el patrón del ataque: reconocimiento → brute-force → acceso web.

## 4. La correlación temporal como evidencia

La secuencia temporal de los eventos no es solo contexto: es evidencia en sí misma. Un ataque coordinado sigue una progresión lógica (reconocimiento → ataque → explotación). La correlación temporal permite establecer la narrativa del incidente.
