# Nivel 2 — Fundamentos de búsqueda y filtrado en logs

## 1. grep: la herramienta fundamental del análisis de logs

`grep` (Global Regular Expression Print) es una utilidad de Unix que busca líneas en un archivo que coincidan con un patrón de texto. Su simplicidad es su fortaleza: puede analizar archivos de millones de líneas en segundos.

### Sintaxis básica:
```
grep <patrón> <archivo>
```

### Opciones relevantes para análisis de seguridad:
- `-i` — insensible a mayúsculas (`-i crit` encuentra "CRIT", "Crit" y "crit").
- `-n` — muestra el número de línea de cada coincidencia.
- `-c` — muestra solo el número de líneas que coinciden (útil para volumetría).
- `-A N` — muestra N líneas después de cada coincidencia (contexto posterior).
- `-B N` — muestra N líneas antes de cada coincidencia (contexto anterior).

## 2. Los patrones de búsqueda clave en seguridad

### 2.1. Autenticación fallida
```
grep failed /var/log/auth.log
```
Cada línea con "failed" en `/var/log/auth.log` representa un intento de autenticación que falló. En condiciones normales, puede haber algunos al día. Decenas o cientos en un período corto indican un ataque de fuerza bruta.

### 2.2. Escaneo de puertos
```
grep scan /var/log/syslog
```
Los motores de detección de intrusiones y el firewall registran eventos de escaneo en el syslog. La presencia de estos eventos indica que alguien está intentando mapear los servicios del servidor.

### 2.3. Alertas críticas
```
grep -i crit /var/log/syslog
```
Mensajes con nivel `CRIT` indican condiciones críticas en el sistema. En contexto de seguridad, pueden indicar servicios comprometidos o condiciones de sistema que un atacante está aprovechando.

## 3. tail: monitorización reciente y en tiempo real

### `tail -N <archivo>`
Muestra las últimas N líneas de un archivo. Útil para inspeccionar la actividad más reciente sin leer el archivo completo.

```
tail -50 /var/log/syslog
tail -20 /var/log/nginx/access.log
```

### `tail -f <archivo>`
Sigue el archivo en tiempo real: muestra las últimas líneas y continúa actualizándose a medida que se añaden nuevas entradas. Fundamental durante incidentes activos.

```
tail -f /var/log/syslog
```

## 4. El log de acceso de Nginx

`/var/log/nginx/access.log` registra cada petición HTTP recibida por el servidor web. Una entrada típica incluye:
- IP de origen.
- Método HTTP (GET, POST, etc.).
- URL solicitada.
- Código de respuesta (200, 404, 403, etc.).
- Bytes transferidos.

Desde una perspectiva de seguridad, este log permite detectar:
- Barridos de URLs (peticiones a muchas rutas diferentes desde una misma IP).
- Ataques de fuerza bruta contra formularios web (muchas peticiones POST).
- Exploración de directorios (peticiones a `/admin`, `/.git`, `/config`).

## 5. La diferencia entre frecuencia y anomalía

Una sola autenticación fallida no es una amenaza. Cien autenticaciones fallidas en dos minutos desde la misma IP, sí. El análisis de logs requiere desarrollar sensibilidad para la diferencia entre frecuencia normal y frecuencia anómala.

En los niveles iniciales, el entorno de laboratorio está calibrado para mostrar patrones claramente anómalos. Con la práctica, el analista aprende a detectar anomalías más sutiles.
