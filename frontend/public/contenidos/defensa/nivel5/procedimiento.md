# Nivel 5 — Procedimiento de respuesta y bloqueo

## 1. Antes de comenzar

El Nivel 5 es el primer nivel donde el analista toma acciones activas de respuesta. Antes de bloquear cualquier IP, completar el análisis de los niveles anteriores para tener evidencia suficiente.

---

## 2. Paso 1 — Recopilar y confirmar la evidencia

Ejecutar la secuencia de análisis de los niveles anteriores:

```
lastb -n 20
grep failed /var/log/auth.log
grep scan /var/log/syslog
grep -i crit /var/log/syslog
netstat -an
```

Al finalizar, debes poder responder: ¿cuál es la IP del atacante? ¿Qué tipos de actividad maliciosa realizó? ¿Está activo en este momento?

---

## 3. Paso 2 — Decidir si el bloqueo está justificado

Antes de bloquear, verificar:

- ¿La IP aparece en múltiples fuentes de evidencia? (auth.log, syslog, netstat)
- ¿El volumen de actividad maliciosa es inequívocamente anómalo?
- ¿La IP podría ser de un usuario legítimo? (En el laboratorio, las IPs maliciosas son claramente de atacantes)

Si la respuesta a las dos primeras es sí y a la tercera es no, el bloqueo está justificado.

---

## 4. Paso 3 — Ejecutar el bloqueo

```
iptables -A INPUT -s 192.168.1.100 -j DROP
```

(Reemplaza 192.168.1.100 con la IP del atacante identificada en el análisis)

---

## 5. Paso 4 — Verificar que el bloqueo se aplicó

```
iptables -L INPUT -n
```

Confirma que aparece una línea con `DROP ... 192.168.1.100` en la salida. Si no aparece, el bloqueo falló y debes ejecutarlo de nuevo.

---

## 6. Paso 5 — Verificar que el ataque cesó

```
tail -f /var/log/syslog
```

Observa si siguen apareciendo eventos de la IP bloqueada. En condiciones normales, después del bloqueo no deberían aparecer nuevos eventos de esa IP.

---

## 7. Paso 6 — Revisar el estado completo del firewall

```
iptables -L
```

Confirma el estado general del firewall y que no hay otras reglas problemáticas activas.

---

## 8. Paso 7 (si aplica) — Desbloquear si fue un error

Si se bloqueó una IP por error:

```
iptables -D INPUT -s 192.168.1.100 -j DROP
iptables -L INPUT -n   → verificar que la regla fue eliminada
```

---

## 9. Checkpoint de completitud

- [ ] Recopilé evidencia de al menos dos fuentes (auth.log, syslog, netstat) que confirman la IP del atacante.
- [ ] Ejecuté `iptables -A INPUT -s <ip> -j DROP` con la IP correcta.
- [ ] Verifiqué que la regla aparece en `iptables -L INPUT -n`.
- [ ] Confirmé que la actividad maliciosa cesó después del bloqueo.
- [ ] Puedo describir la evidencia que justificó el bloqueo.
