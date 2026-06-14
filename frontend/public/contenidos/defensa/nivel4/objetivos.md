# Nivel 4 — Objetivos de aprendizaje

## 1. Objetivo general

Desarrollar la capacidad de analizar el tráfico de red y el estado de los puertos del sistema para detectar actividad sospechosa desde una perspectiva de red, complementando el análisis de logs del sistema.

---

## 2. Objetivos específicos

### 2.1. Captura y análisis de tráfico con tcpdump
- Usar `tcpdump` con filtros básicos para capturar tráfico de una IP específica.
- Identificar tipos de tráfico inusuales (escaneos, paquetes malformados, protocolos inesperados).
- Relacionar el tráfico capturado con los eventos de log analizados en niveles anteriores.

### 2.2. Reconocimiento defensivo con nmap
- Usar `nmap` para escanear la propia red y obtener la perspectiva del atacante.
- Identificar puertos abiertos y servicios activos.
- Detectar servicios inesperados que podrían indicar una puerta trasera o compromiso.

### 2.3. Análisis de puertos en escucha con netstat
- Usar `netstat -tulpn` para listar todos los servicios que escuchan en puertos del sistema.
- Relacionar cada puerto abierto con el proceso que lo controla.
- Detectar servicios que no deberían estar activos.

### 2.4. Análisis del log de acceso web
- Usar `tail -N /var/log/nginx/access.log` para revisar accesos web con mayor profundidad.
- Identificar patrones de acceso anómalos (barridos de URLs, peticiones a rutas sensibles).
- Correlacionar las IPs del log de Nginx con las IPs identificadas en análisis anteriores.

### 2.5. Integrar el análisis de red con el análisis de logs
- Combinar evidencia de múltiples fuentes (logs del sistema + tráfico de red) para construir una imagen más completa del incidente.

---

## 3. Competencias desarrolladas

- Uso de herramientas de análisis de red de nivel profesional (tcpdump, nmap).
- Visión integrada del sistema (logs internos + tráfico externo).
- Capacidad de detectar servicios no autorizados activos en el sistema.
