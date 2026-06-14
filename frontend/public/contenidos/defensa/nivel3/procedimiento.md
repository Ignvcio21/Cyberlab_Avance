# Nivel 3 — Procedimiento de detección de intrusiones

## 1. Antes de comenzar

El Nivel 3 simula una situación en la que el sistema tiene actividad sospechosa activa o reciente. El analista debe detectar qué tipo de ataque está ocurriendo, desde dónde, cuándo empezó y si sigue en curso.

---

## 2. Paso 1 — Revisar el historial de logins fallidos

```
lastb -n 20
```

Analiza:
- ¿Hay intentos fallidos recientes?
- ¿Todos provienen de la misma IP?
- ¿Los timestamps están muy próximos entre sí (ataque automatizado)?
- ¿Qué usuarios está probando el atacante?

Si hay muchos intentos de la misma IP en segundos, es un ataque de fuerza bruta confirmado.

---

## 3. Paso 2 — Cuantificar el ataque de fuerza bruta

```
grep failed /var/log/auth.log
```

Analiza:
- ¿Cuántas líneas devuelve? (mayor volumen = ataque más intenso)
- ¿El primer y último timestamp del ataque? (duración del ataque)
- ¿Sigue activo? (si el último timestamp es reciente)

---

## 4. Paso 3 — Verificar si hubo reconocimiento previo

```
grep scan /var/log/syslog
```

Analiza:
- ¿La IP del escaneo coincide con la IP del brute-force?
- ¿El escaneo ocurrió antes que los intentos de autenticación?

Si sí: el atacante realizó reconocimiento antes de atacar. Esto es un ataque en dos fases.

---

## 5. Paso 4 — Revisar conexiones activas

```
netstat -an
```

Busca:
- Conexiones `ESTABLISHED` desde la IP del atacante.
- Muchas conexiones en `SYN_RECV` desde la IP del atacante.

Si hay una conexión `ESTABLISHED` desde la IP del atacante al puerto 22, el atacante puede haber obtenido acceso SSH exitoso. Esto escala el incidente significativamente.

---

## 6. Paso 5 — Verificar los procesos del sistema

```
top -bn1
```

Busca:
- Procesos con uso de CPU muy alto sin explicación.
- Procesos con nombres inusuales corriendo desde directorios como `/tmp`.
- Procesos de usuario `root` no esperados.

---

## 7. Paso 6 — Revisar alertas críticas del sistema

```
grep -i crit /var/log/syslog
```

¿El sistema generó alertas críticas relacionadas con el ataque detectado?

---

## 8. Paso 7 — Formular la hipótesis del incidente

Con todos los datos, formular:

- IP del atacante: \_\_\_
- Tipo de ataque: fuerza bruta SSH / escaneo / otro.
- Magnitud: número de intentos.
- Período: desde \_\_\_ hasta \_\_\_.
- Estado actual: en curso / finalizado.
- Acceso obtenido: sí (conexión ESTABLISHED) / no (no hay conexiones activas).

---

## 9. Checkpoint de completitud

- [ ] Revisé el historial de logins fallidos con `lastb -n 20`.
- [ ] Cuantifiqué el brute-force con `grep failed /var/log/auth.log`.
- [ ] Verifiqué si hubo escaneo previo con `grep scan /var/log/syslog`.
- [ ] Revisé conexiones activas con `netstat -an`.
- [ ] Revisé procesos del sistema con `top -bn1`.
- [ ] Puedo describir el ataque con IP, tipo, magnitud y estado.
