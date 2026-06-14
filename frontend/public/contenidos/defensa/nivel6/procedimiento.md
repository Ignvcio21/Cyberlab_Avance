# Nivel 6 — Procedimiento de análisis multi-vector

## 1. Antes de comenzar

El Nivel 6 presenta múltiples vectores de ataque simultáneos. La clave es completar el triage antes de responder a ninguno. Resistir la tentación de actuar inmediatamente sobre el primer vector visible.

---

## 2. Paso 1 — Triage panorámico (identificar todos los vectores)

Ejecutar en secuencia:

```
journalctl -n 50
grep failed /var/log/auth.log
grep scan /var/log/syslog
grep -i crit /var/log/syslog
netstat -an
top -bn1
```

Al terminar, listar mentalmente todas las IPs que aparecen con actividad sospechosa. ¿Cuántas son? ¿Qué tipo de actividad realiza cada una?

---

## 3. Paso 2 — Caracterizar cada vector individualmente

Para cada IP sospechosa identificada:

**¿Qué tipo de actividad tiene?**
- Brute-force SSH → buscar en auth.log.
- Escaneo de puertos → buscar en syslog.
- Acceso web → buscar en nginx/access.log.
- Acceso activo → verificar en netstat.

**¿En qué fase está?**
- Solo reconocimiento (escaneo).
- Explotación activa (brute-force en curso).
- Acceso obtenido (conexión ESTABLISHED).

**¿Cuál es la severidad?**
- Acceso activo = crítico.
- Brute-force con muchos intentos = alto.
- Escaneo = medio.

---

## 4. Paso 3 — Correlacionar los vectores

¿Los vectores están coordinados?
- ¿Comenzaron al mismo tiempo?
- ¿Las técnicas son complementarias (uno escanea, otro ataca)?
- ¿O son independientes (tipos de ataque sin relación)?

---

## 5. Paso 4 — Responder en orden de prioridad

Bloquear primero el vector de mayor severidad:

```
iptables -A INPUT -s <ip-más-peligrosa> -j DROP
iptables -L INPUT -n    → confirmar bloqueo
```

Luego el siguiente:

```
iptables -A INPUT -s <ip-secundaria> -j DROP
iptables -L INPUT -n    → confirmar bloqueo
```

---

## 6. Paso 5 — Verificar contención completa

```
tail -f /var/log/syslog
netstat -an
iptables -L INPUT -n
```

¿Cesó toda la actividad maliciosa? ¿Hay actividad residual de algún vector? ¿Hay nuevos vectores no identificados en el triage inicial?

---

## 7. Checkpoint de completitud

- [ ] Realicé el triage panorámico antes de actuar.
- [ ] Identifiqué el número y origen de todos los vectores activos.
- [ ] Caractericé cada vector por tipo, fase y severidad.
- [ ] Correlacioné los vectores (coordinados / independientes).
- [ ] Bloqueé todas las IPs maliciosas en orden de prioridad.
- [ ] Verifiqué que cada bloqueo se aplicó con `iptables -L INPUT -n`.
- [ ] Confirmé que toda la actividad maliciosa cesó.
