# Nivel 4 — Criterio de evaluación

## 1. Descripción del nivel

El Nivel 4 evalúa la capacidad del estudiante para analizar el tráfico de red y el estado de los puertos del sistema, correlacionar esta evidencia con los logs del sistema y detectar servicios no autorizados que podrían indicar un compromiso activo.

---

## 2. Criterios de evaluación

### 2.1. Inventario de servicios (20%)
- Ejecutó `netstat -tulpn` e identificó los servicios activos.
- Detectó o descartó la presencia de servicios no autorizados.
- Relacionó cada puerto con su proceso correspondiente.

### 2.2. Verificación con nmap (20%)
- Ejecutó `nmap` para obtener la perspectiva externa del servidor.
- Comparó los resultados de nmap con el inventario de netstat.
- Identificó discrepancias o servicios inesperadamente expuestos.

### 2.3. Análisis de tráfico con tcpdump (25%)
- Ejecutó `tcpdump` con filtro apropiado para la IP sospechosa.
- Identificó el tipo de tráfico capturado (escaneo SYN, conexiones SSH, etc.).
- Relacionó el tráfico de red con la evidencia de logs.

### 2.4. Análisis del log de acceso web (15%)
- Revisó el log de Nginx con suficiente profundidad (tail -50 o más).
- Identificó peticiones a rutas sensibles o patrones de exploración.
- Detectó o descartó acceso exitoso a recursos protegidos.

### 2.5. Integración de evidencias (20%)
- Correlacionó la IP sospechosa entre tcpdump, nmap, netstat y logs del sistema.
- Construyó una imagen integrada del incidente que combina perspectivas de red y sistema.
- Puede describir el estado del compromiso (intento vs. compromiso activo con evidencia).

---

## 3. Indicadores de desempeño destacado

- Detectó un servicio no autorizado activo y lo documentó con proceso, PID y puerto.
- Correlacionó explícitamente la IP del atacante entre cuatro fuentes de evidencia distintas.
- Identificó si hay tráfico saliente sospechoso desde el servidor.

## 4. Indicadores de desempeño insuficiente

- No ejecutó `netstat -tulpn` o ignoró servicios en escucha.
- No usó filtro en tcpdump y no pudo analizar el tráfico relevante.
- No correlacionó la evidencia de red con la evidencia de logs.

---

## 5. Nota mínima de aprobación

Se requiere ejecutar correctamente los cuatro comandos principales (netstat -tulpn, nmap, tcpdump, tail nginx), identificar al menos un indicador de actividad sospechosa en la red y correlacionarlo con evidencia de logs para aprobar el nivel.
