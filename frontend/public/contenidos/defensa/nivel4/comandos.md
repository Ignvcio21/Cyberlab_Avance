# Nivel 4 — Comandos de análisis de red

## 1. `tcpdump`
Captura y analiza tráfico de red en tiempo real.

**Uso básico:**
```
tcpdump
```

**Con filtro por IP:**
```
tcpdump host 192.168.1.100
```

**Con filtro por puerto:**
```
tcpdump port 22
```

**Combinado:**
```
tcpdump host 192.168.1.100 port 22
```

**Salida típica:**
```
03:21:07.000 IP 192.168.1.100.49123 > 192.168.1.1.22: Flags [S], seq 1234, win 64240
03:21:07.001 IP 192.168.1.1.22 > 192.168.1.100.49123: Flags [R.], seq 0, ack 1235
03:21:07.100 IP 192.168.1.100.49124 > 192.168.1.1.23: Flags [S], seq 5678, win 64240
```

**Qué analizar:** múltiples paquetes SYN a puertos distintos en secuencia rápida = escaneo de puertos activo. Paquetes salientes hacia IPs externas no esperadas = posible exfiltración o C2.

---

## 2. `nmap`
Escanea puertos y detecta servicios activos.

**Escaneo básico:**
```
nmap 192.168.1.1
```

**Con detección de versiones:**
```
nmap -sV 192.168.1.1
```

**Salida típica:**
```
PORT    STATE SERVICE  VERSION
22/tcp  open  ssh      OpenSSH 8.2p1
80/tcp  open  http     nginx 1.18.0
443/tcp open  https    nginx 1.18.0
4444/tcp open  krb524  (sospechoso)
```

**Qué analizar:** puertos abiertos que no deberían estarlo. El 4444 abierto con un servicio no reconocido es inmediatamente sospechoso.

---

## 3. `netstat -tulpn`
Lista todos los servicios que escuchan en puertos del sistema.

**Uso:**
```
netstat -tulpn
```

**Salida típica:**
```
Proto  Local Address     PID/Program
tcp    0.0.0.0:22        1234/sshd
tcp    0.0.0.0:80        5678/nginx
tcp    0.0.0.0:443       5678/nginx
tcp    0.0.0.0:4444      9999/nc
```

**Qué analizar:** cualquier proceso que no sea un servicio conocido y autorizado. El proceso `nc` (netcat) escuchando en el puerto 4444 es una señal de alarma mayor.

---

## 4. `tail -N /var/log/nginx/access.log`
Muestra los últimos N accesos al servidor web.

**Uso:**
```
tail -50 /var/log/nginx/access.log
tail -100 /var/log/nginx/access.log
```

**Salida típica:**
```
192.168.1.100 - [14/Jun] "GET /admin HTTP/1.1" 403
192.168.1.100 - [14/Jun] "GET /.env HTTP/1.1" 404
192.168.1.100 - [14/Jun] "GET /config.php HTTP/1.1" 404
192.168.1.100 - [14/Jun] "POST /wp-login.php HTTP/1.1" 200
```

**Qué analizar:** muchas peticiones 403/404 = exploración. Un 200 en `/wp-login.php` tras muchos 403 puede indicar acceso exitoso.

---

## 5. Secuencia recomendada para el Nivel 4

```
netstat -tulpn               → inventario de puertos y procesos
nmap <ip-propia>             → verificar desde perspectiva externa
tcpdump host <ip-sospechosa> → capturar tráfico de la IP sospechosa
tail -50 /var/log/nginx/access.log → análisis de accesos web
grep failed /var/log/auth.log → correlacionar con autenticación
```
