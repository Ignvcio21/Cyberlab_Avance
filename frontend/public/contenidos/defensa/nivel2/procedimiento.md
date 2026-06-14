# Nivel 2 — Procedimiento de búsqueda en logs

## 1. Antes de comenzar

El Nivel 2 asume que el sistema ha tenido actividad sospechosa y el analista debe encontrar evidencia de ella usando búsquedas específicas en los logs.

Antes de ejecutar cualquier comando de búsqueda, verifica brevemente el estado del sistema:
```
systemctl status
```

---

## 2. Paso 1 — Buscar intentos de autenticación fallida

```
grep failed /var/log/auth.log
```

Analiza la salida:
- ¿Cuántas líneas devuelve?
- ¿Todas provienen de la misma IP?
- ¿Los intentos son consecutivos (mismo timestamp o muy próximos)?
- ¿Qué usuarios se están intentando (root, admin, nombres genéricos)?

Si hay muchos intentos desde la misma IP en poco tiempo, estás ante un ataque de fuerza bruta.

---

## 3. Paso 2 — Buscar eventos de escaneo

```
grep scan /var/log/syslog
```

Analiza la salida:
- ¿La IP de los escaneos coincide con la IP de los fallos de autenticación?
- ¿Los escaneos ocurrieron antes que los intentos de autenticación? (Patrón típico: reconocimiento → ataque)

---

## 4. Paso 3 — Revisar alertas críticas

```
grep -i crit /var/log/syslog
```

Analiza la salida:
- ¿Qué tipo de alertas críticas hay?
- ¿Se relacionan con la actividad sospechosa encontrada en los pasos anteriores?
- ¿Alguna indica que el sistema fue comprometido?

---

## 5. Paso 4 — Revisar la actividad web reciente

```
tail -20 /var/log/nginx/access.log
```

Analiza la salida:
- ¿La misma IP que realizó intentos de brute-force también accedió al servidor web?
- ¿Intentó acceder a rutas sensibles (/admin, /.env, /config)?
- ¿Qué códigos de respuesta recibió? (403 = bloqueado, 404 = no encontrado, 200 = acceso exitoso)

---

## 6. Paso 5 — Revisar actividad reciente del sistema

```
tail -50 /var/log/syslog
```

Busca eventos recientes que no hayan aparecido en las búsquedas anteriores. ¿Hay algo en el sistema que las búsquedas específicas no capturaron?

---

## 7. Paso 6 — Seguimiento en tiempo real (si el ataque está activo)

Si los timestamps de los eventos son recientes (últimos minutos), el ataque puede estar en curso:

```
tail -f /var/log/syslog
```

Observa si siguen llegando nuevos eventos relacionados.

---

## 8. Checkpoint de completitud

- [ ] Busqué autenticación fallida y analicé la frecuencia y origen.
- [ ] Busqué eventos de escaneo y los correlacioné con los fallos de auth.
- [ ] Revisé alertas críticas del sistema.
- [ ] Revisé la actividad web reciente.
- [ ] Puedo describir la actividad sospechosa encontrada con al menos una IP de origen y tipo de actividad.
