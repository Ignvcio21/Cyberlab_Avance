# Nivel 4 — Metodología de análisis de red

## 1. El análisis de red como complemento del análisis de logs

La metodología del Nivel 4 integra el análisis de red con el análisis de logs establecido en niveles anteriores. La secuencia combina ambas perspectivas para construir una imagen más completa del estado de seguridad del sistema.

## 2. Secuencia metodológica del Nivel 4

### Etapa 1 — Inventario de servicios expuestos
```
netstat -tulpn
```
¿Qué puertos están en escucha? ¿Qué procesos los controlan? ¿Hay algún servicio inesperado?

### Etapa 2 — Verificación del inventario con nmap
```
nmap <ip-propia>
```
Confirmar desde la perspectiva del atacante qué servicios son visibles. ¿Coincide con lo que muestra `netstat -tulpn`? Si hay discrepancias, investigar.

### Etapa 3 — Análisis del tráfico de red
```
tcpdump -i eth0 -n host <ip-sospechosa>
```
Si hay una IP sospechosa identificada en los logs, capturar su tráfico. ¿Qué protocolos usa? ¿A qué puertos intenta conectar? ¿Hay tráfico saliente inesperado?

### Etapa 4 — Análisis del log de acceso web
```
tail -50 /var/log/nginx/access.log
```
¿Hay barridos de URL desde una IP? ¿Intentos de acceso a rutas sensibles? ¿La IP coincide con la identificada en los logs de auth?

### Etapa 5 — Correlación con el análisis de logs del sistema
```
grep failed /var/log/auth.log
grep scan /var/log/syslog
```
¿La evidencia de red es consistente con la evidencia de logs? Una IP que aparece en escaneos, brute-force, acceso web y captura de tráfico está bien documentada como atacante.

## 3. Integración de perspectivas

El análisis integrado del Nivel 4 produce una imagen en dos dimensiones:

**Perspectiva interna (logs del sistema):**
- Qué registró el servidor sobre la actividad.
- Intentos de autenticación, alertas del sistema, eventos del kernel.

**Perspectiva de red (análisis de tráfico):**
- Qué tráfico llegó y salió del servidor.
- Qué puertos están expuestos y quién los está usando.

La combinación de ambas perspectivas es más difícil de evadir que cualquiera por separado.

## 4. Prioridades de análisis en el Nivel 4

Si hay evidencia de múltiples tipos de actividad simultánea:

1. Primero: verificar si hay servicios no autorizados activos (`netstat -tulpn` y `top -bn1`). Esto indica un compromiso activo.
2. Segundo: analizar el tráfico de la IP sospechosa con `tcpdump`.
3. Tercero: verificar qué servicios son visibles desde el exterior con `nmap`.
4. Cuarto: correlacionar con los logs del sistema para completar la imagen.
