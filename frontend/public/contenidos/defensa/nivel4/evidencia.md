# Nivel 4 — Evidencia de análisis de red

## 1. La evidencia de red vs. la evidencia de logs

La evidencia de red captura lo que ocurre en la capa de comunicaciones, independientemente de lo que el sistema registre en sus logs. Combinada con la evidencia de logs, produce una imagen mucho más completa y difícil de refutar.

## 2. Tipos de evidencia del Nivel 4

### 2.1. Evidencia de puertos y servicios
- Listado de servicios activos de `netstat -tulpn`: qué puertos están en escucha y qué procesos los controlan.
- Resultados de `nmap`: confirmación de la exposición desde la perspectiva de la red.
- Servicios anómalos detectados: proceso y puerto inesperados.

### 2.2. Evidencia de tráfico de red
- Capturas de `tcpdump`: tipos de tráfico, IPs involucradas, puertos objetivo.
- Tráfico saliente inesperado: si el servidor está enviando datos a IPs externas sin razón aparente.
- Patrones de escaneo: secuencia de paquetes SYN a múltiples puertos en tiempo breve.

### 2.3. Evidencia de acceso web
- Entradas del log de Nginx mostrando barridos de URL, peticiones a rutas sensibles y códigos de respuesta.
- Peticiones POST a páginas de autenticación web.
- Cualquier código 200 en rutas que deberían devolver 403.

### 2.4. Evidencia combinada (red + logs)
La convergencia de evidencia es la más valiosa:
- La misma IP aparece en: captura tcpdump + grep failed auth.log + tail nginx/access.log.
- Esto documenta que el atacante usó múltiples vectores (web + SSH + escaneo) desde la misma fuente.

## 3. Estructura de la evidencia del Nivel 4

```
[Evidencia de red]
- Puerto 4444 abierto con proceso nc (netstat -tulpn)
- Escaneo SYN activo desde 192.168.1.100 (tcpdump)
- Puerto 4444 visible externamente (nmap)

[Evidencia de acceso web]
- 47 peticiones a rutas sensibles desde 192.168.1.100 (nginx access.log)
- 1 petición POST exitosa a /wp-login.php con código 200

[Correlación]
- La misma IP 192.168.1.100 es origen del escaneo, brute-force SSH y exploración web.
- El proceso nc en puerto 4444 puede ser una shell reversa establecida tras acceso exitoso.
```

## 4. La evidencia de servicios anómalos como indicador de compromiso

Un proceso `nc` en escucha en un puerto arbitrario, un proceso con nombre inusual corriendo desde `/tmp`, o un puerto 4444/1337/8888 abierto son indicadores de compromiso de alta confiabilidad. Este tipo de evidencia eleva la clasificación del incidente de "intento de ataque" a "compromiso activo".
