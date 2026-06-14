# Nivel 5 — Comandos de respuesta con iptables

## 1. `iptables -A INPUT -s <ip> -j DROP`
Bloquea todo el tráfico entrante desde una IP específica.

**Uso:**
```
iptables -A INPUT -s 192.168.1.100 -j DROP
```

**Confirmar que funcionó:**
```
iptables -L INPUT -n
```

**Desglose:**
- `-A INPUT` — añadir al final de la cadena INPUT.
- `-s <ip>` — especificar la IP de origen a bloquear.
- `-j DROP` — descartar silenciosamente el paquete.

---

## 2. `iptables -D INPUT -s <ip> -j DROP`
Elimina una regla de bloqueo existente.

**Uso:**
```
iptables -D INPUT -s 192.168.1.100 -j DROP
```

**Para qué sirve:** desbloquear una IP bloqueada por error (falso positivo) o cuando el bloqueo ya no es necesario.

**Importante:** el comando debe ser idéntico a la regla que se desea eliminar.

---

## 3. `iptables -L INPUT -n`
Lista todas las reglas de la cadena INPUT en formato numérico.

**Uso:**
```
iptables -L INPUT -n
```

**Salida típica después de un bloqueo:**
```
Chain INPUT (policy ACCEPT)
target  prot  opt  source           destination
DROP    all   --   192.168.1.100    0.0.0.0/0
DROP    all   --   10.0.0.55        0.0.0.0/0
```

**Para qué sirve:** verificar que el bloqueo se aplicó correctamente. Si la IP no aparece en la lista, el bloqueo falló.

---

## 4. `iptables -L`
Lista todas las reglas de todas las cadenas del firewall.

**Uso:**
```
iptables -L
```

**Para qué sirve:** vista completa del estado del firewall: INPUT, OUTPUT y FORWARD. Útil para verificar el estado general del firewall, no solo las reglas de bloqueo.

---

## 5. Comandos de análisis previo al bloqueo (del Nivel 3)

Antes de ejecutar cualquier bloqueo, siempre confirmar con:

```
grep failed /var/log/auth.log   → confirmar brute-force desde la IP
lastb -n 20                     → confirmar historial de intentos fallidos
grep scan /var/log/syslog       → confirmar escaneo previo
netstat -an                     → confirmar conexiones activas
```

---

## 6. Secuencia completa de respuesta en el Nivel 5

```
[CONFIRMACIÓN]
grep failed /var/log/auth.log   → confirmar la IP del atacante
lastb -n 20                     → verificar el historial

[BLOQUEO]
iptables -A INPUT -s <ip> -j DROP

[VERIFICACIÓN]
iptables -L INPUT -n            → confirmar que la regla se aplicó
tail -f /var/log/syslog         → verificar que el ataque cesó
iptables -L                     → estado completo del firewall
```
