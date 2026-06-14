# Nivel 4 — Procedimiento de análisis de red

## 1. Antes de comenzar

El Nivel 4 introduce el análisis de tráfico y puertos. El estudiante debe aplicar tanto los comandos nuevos como los aprendidos en niveles anteriores para construir una imagen completa del sistema.

---

## 2. Paso 1 — Inventario de servicios en escucha

```
netstat -tulpn
```

Analiza la salida y construye mentalmente el inventario de servicios:
- ¿Qué puertos están en LISTEN?
- ¿Qué proceso controla cada puerto?
- ¿Hay algún puerto o proceso que no debería estar ahí?

Los servicios esperados típicamente son: sshd (puerto 22), nginx (80, 443). Cualquier otro requiere explicación.

---

## 3. Paso 2 — Verificar la exposición desde la perspectiva del atacante

```
nmap 192.168.1.1
```
(usando la IP del servidor)

Compara la salida de nmap con la de `netstat -tulpn`. ¿Son consistentes? ¿Hay puertos visibles desde la red que no aparecen en netstat, o viceversa?

---

## 4. Paso 3 — Capturar tráfico de la IP sospechosa

Si en niveles anteriores o en el análisis inicial identificaste una IP sospechosa:

```
tcpdump host 192.168.1.100
```

Analiza la captura:
- ¿Qué puertos está intentando alcanzar?
- ¿Hay tráfico saliente desde el servidor hacia esa IP? (indica posible C2 o backdoor)
- ¿El tipo de tráfico es consistente con el ataque identificado (SSH brute-force, escaneo, web)?

---

## 5. Paso 4 — Analizar los accesos web

```
tail -100 /var/log/nginx/access.log
```

Busca:
- Peticiones a rutas sensibles (/admin, /.env, /config, /wp-admin).
- Muchas peticiones 403/404 desde la misma IP (exploración).
- Peticiones POST a páginas de login (brute-force web).
- Alguna petición con código 200 que debería ser 403 (acceso logrado).

---

## 6. Paso 5 — Correlacionar con los logs del sistema

```
grep failed /var/log/auth.log
grep scan /var/log/syslog
lastb -n 20
```

¿La IP identificada en el análisis de red aparece también en los logs del sistema? La convergencia de evidencia de red + logs confirma que se trata del mismo atacante.

---

## 7. Checkpoint de completitud

- [ ] Ejecuté `netstat -tulpn` e identifiqué todos los servicios en escucha.
- [ ] Ejecuté `nmap` para verificar la perspectiva externa.
- [ ] Ejecuté `tcpdump` con la IP sospechosa y analicé el tráfico.
- [ ] Revisé los accesos web con `tail -100 /var/log/nginx/access.log`.
- [ ] Correlacioné la evidencia de red con la evidencia de logs.
- [ ] Puedo describir el ataque desde la perspectiva de red y de logs combinados.
