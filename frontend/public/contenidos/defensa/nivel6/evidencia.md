# Nivel 6 — Evidencia en análisis multi-vector defensivo

## 1. Organización de la evidencia por vector

En un incidente multi-vector, mezclar la evidencia de todos los vectores en un único bloque produce confusión. La práctica correcta es organizar la evidencia por vector y luego añadir la correlación inter-vector.

**Ejemplo de estructura:**

```
[Vector 1 — IP: 192.168.1.100]
Tipo: Ataque de fuerza bruta SSH
Evidencia:
  - 85 intentos fallidos (grep failed /var/log/auth.log)
  - Usuarios probados: root, admin, user
  - Período: 03:21 - 03:23
  - Estado: sin acceso exitoso confirmado (no hay ESTABLISHED en netstat)

[Vector 2 — IP: 10.0.0.55]
Tipo: Escaneo de puertos + acceso web
Evidencia:
  - 3 eventos de escaneo en syslog (03:15)
  - 47 peticiones a rutas sensibles en nginx/access.log (03:18 - 03:20)
  - 1 petición POST exitosa a /admin/login (200, 03:20)
  - Proceso nc en puerto 4444 activo (netstat -tulpn, top -bn1)
  - Estado: posible compromiso activo
```

## 2. Evidencia de correlación inter-vector

```
[Correlación]
- Los vectores comenzaron con 6 minutos de diferencia (IP1: 03:21, IP2: 03:15)
- IP2 ejecutó reconocimiento y acceso web antes de que IP1 iniciara brute-force
- Patrón sugerido: IP2 accedió al servidor, dejó backdoor en puerto 4444, e IP1 sigue atacando como distracción
- Conclusión: ataque coordinado con división de roles (IP2: intrusión, IP1: distracción)
```

## 3. Evidencia de respuesta priorizada

```
[Respuesta]
Prioridad 1: IP2 (compromiso activo confirmado)
  - Bloqueo ejecutado: iptables -A INPUT -s 10.0.0.55 -j DROP
  - Verificación: regla aparece en iptables -L INPUT -n
  
Prioridad 2: IP1 (brute-force activo)
  - Bloqueo ejecutado: iptables -A INPUT -s 192.168.1.100 -j DROP
  - Verificación: regla aparece en iptables -L INPUT -n
```

## 4. Evidencia de contención completa

```
[Verificación post-bloqueo]
- tail -f /var/log/syslog: sin nuevos eventos de IP1 o IP2 en 2 minutos
- netstat -an: sin conexiones activas de IP1 o IP2
- iptables -L INPUT -n: ambas IPs en la lista de bloqueos
- Proceso en puerto 4444: requiere investigación adicional (posible backdoor persistente)
```

## 5. La evidencia de un vector no completamente resuelto

Si después del bloqueo de la IP hay evidencia de que el atacante dejó un backdoor (proceso anómalo activo), documentar que el incidente no está completamente resuelto. El bloqueo detuvo el acceso desde esa IP, pero la remediación requiere acciones adicionales (eliminar el proceso malicioso, verificar integridad del sistema).
