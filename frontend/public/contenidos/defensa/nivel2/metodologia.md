# Nivel 2 — Metodología de búsqueda en logs

## 1. Principio: buscar antes de leer

El análisis de logs eficiente parte de hipótesis específicas: "sospecho que hubo intentos de fuerza bruta" o "quiero ver si hay escaneos de puertos registrados". Con esta hipótesis, el analista elige el patrón de búsqueda adecuado y ejecuta `grep`.

Leer los logs completos sin una hipótesis de búsqueda es una práctica ineficiente que no escala.

## 2. Secuencia metodológica del Nivel 2

### Etapa 1 — Inspección inicial (del Nivel 1)
Antes de buscar, completar la inspección panorámica:
```
systemctl status
journalctl -n 50
```
Esto establece el contexto para las búsquedas siguientes.

### Etapa 2 — Búsqueda de autenticación fallida
```
grep failed /var/log/auth.log
```
¿Cuántos resultados hay? ¿De cuántas IPs distintas? ¿En qué período de tiempo?

### Etapa 3 — Búsqueda de escaneos
```
grep scan /var/log/syslog
```
¿Hay registros de escaneo? ¿Coincide el origen con las IPs de los fallos de autenticación?

### Etapa 4 — Búsqueda de alertas críticas
```
grep -i crit /var/log/syslog
```
¿Qué alertas críticas han sido registradas? ¿Cuándo? ¿Relacionadas con las búsquedas anteriores?

### Etapa 5 — Revisión de actividad reciente
```
tail -50 /var/log/syslog
tail -20 /var/log/nginx/access.log
```
¿La actividad más reciente es consistente con los patrones encontrados? ¿Hay algo nuevo que las búsquedas anteriores no mostraron?

### Etapa 6 — Seguimiento en tiempo real (si el ataque está activo)
```
tail -f /var/log/syslog
```
Si se detecta actividad en curso, seguir el log en tiempo real permite verificar si el ataque está activo en el momento del análisis.

## 3. Correlación entre búsquedas

Ninguna búsqueda individual cuenta la historia completa. La correlación es el proceso de relacionar los hallazgos de múltiples búsquedas:

- Si `grep failed /var/log/auth.log` muestra 50 fallos desde la IP `192.168.1.100` y `grep scan /var/log/syslog` muestra escaneos desde la misma IP, ambos eventos son parte del mismo ataque (reconocimiento + fuerza bruta).

La correlación manual de búsquedas es la habilidad central del Nivel 2.

## 4. Documentar los hallazgos

Al completar el Nivel 2, el analista debe ser capaz de describir:

- Qué búsquedas realizó y en qué archivos.
- Cuántos resultados encontró para cada búsqueda.
- Qué conclusiones preliminares puede extraer de los resultados.
- Qué haría a continuación basándose en lo encontrado.
