# Nivel 4 — Fundamentos de análisis de red

## 1. tcpdump: captura de paquetes en Linux

`tcpdump` captura y muestra los paquetes de red que pasan por una interfaz de red. Es la herramienta de referencia para análisis de tráfico en entornos Linux sin GUI.

### Sintaxis básica:
```
tcpdump [opciones] [filtro]
```

### Opciones más usadas:
- `-i <interfaz>` — especifica la interfaz de red (eth0, lo, any).
- `-n` — no resuelve nombres DNS (más rápido, evita contaminación del análisis).
- `-c N` — captura solo N paquetes y termina.
- `host <ip>` — filtra tráfico de/hacia una IP específica.
- `port <N>` — filtra tráfico de un puerto específico.

### Ejemplo en contexto defensivo:
```
tcpdump -i eth0 -n host 192.168.1.100
```
Captura todo el tráfico hacia o desde la IP sospechosa 192.168.1.100.

### Tipos de tráfico sospechoso en tcpdump:
- **SYN flood:** muchos paquetes SYN sin SYN-ACK de respuesta (puede indicar escaneo).
- **Paquetes a múltiples puertos en secuencia rápida:** escaneo de puertos activo.
- **Tráfico a puertos inusuales:** conexiones a puertos que no deberían estar activos.

## 2. nmap: inventario de puertos y servicios

`nmap` (Network Mapper) es la herramienta estándar de escaneo de red. Aunque se usa frecuentemente en ofensiva, el analista defensivo la usa para:

### Escaneo básico de puertos:
```
nmap <ip-objetivo>
```

### Escaneo de servicios con versiones:
```
nmap -sV <ip-objetivo>
```

### Qué muestra nmap:
- Puerto y su estado (open / closed / filtered).
- Servicio que usa el puerto (ssh, http, https, ftp, etc.).
- Versión del servicio (si se usa `-sV`).

En análisis defensivo, ejecutar `nmap` sobre el propio servidor desde la red interna permite verificar qué servicios están realmente expuestos y compararlo con lo esperado.

## 3. netstat -tulpn: puertos abiertos y procesos

```
netstat -tulpn
```

Esta combinación de opciones muestra:
- `-t` — conexiones TCP.
- `-u` — conexiones UDP.
- `-l` — solo puertos en escucha (LISTEN).
- `-p` — muestra el PID y nombre del proceso.
- `-n` — formato numérico (sin resolver DNS).

### Salida típica:
```
Proto  Recv-Q Send-Q  Local Address     Foreign Address   State      PID/Program
tcp    0      0       0.0.0.0:22        0.0.0.0:*         LISTEN     1234/sshd
tcp    0      0       0.0.0.0:80        0.0.0.0:*         LISTEN     5678/nginx
tcp    0      0       0.0.0.0:4444      0.0.0.0:*         LISTEN     9999/nc
```

En este ejemplo, el puerto 4444 con el proceso `nc` (netcat) es inmediatamente sospechoso: `nc` en modo escucha en un puerto arbitrario es un indicador clásico de una shell reversa o backdoor.

## 4. El log de acceso de Nginx en profundidad

En el Nivel 4, el análisis del log de Nginx va más allá de los últimas líneas:

```
tail -100 /var/log/nginx/access.log
```

Se busca:
- Barridos de URL: muchas peticiones a rutas distintas en secuencia rápida (enumeración de directorios).
- Intentos de acceso a archivos de configuración: `.env`, `config.php`, `wp-config.php`.
- Inyección en parámetros URL: `?id=1' OR 1=1`, `?page=../../etc/passwd`.
- Alto volumen de peticiones 4xx: muchos 403 y 404 indican exploración activa.
