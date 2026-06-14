# Nivel 5 — Metodología de respuesta a incidentes

## 1. El ciclo de respuesta

La respuesta a incidentes sigue un ciclo definido: detectar → analizar → contener → verificar → documentar. El Nivel 5 trabaja principalmente la fase de contención y verificación, construyendo sobre la detección y análisis de niveles anteriores.

## 2. Secuencia metodológica del Nivel 5

### Etapa 1 — Confirmar la amenaza (análisis previo al bloqueo)

Antes de bloquear, confirmar con evidencia:

```
grep failed /var/log/auth.log   → ¿cuántos intentos desde esta IP?
lastb -n 20                     → ¿el historial de fallos confirma el brute-force?
grep scan /var/log/syslog       → ¿hubo escaneo previo de la misma IP?
netstat -an                     → ¿hay conexiones activas de esta IP?
```

La decisión de bloquear debe basarse en evidencia, no en sospecha.

### Etapa 2 — Ejecutar el bloqueo

Con la IP del atacante confirmada:

```
iptables -A INPUT -s <ip-atacante> -j DROP
```

### Etapa 3 — Verificar el bloqueo

Inmediatamente después del bloqueo:

```
iptables -L INPUT -n
```

Confirmar que la regla aparece en la lista. Si no aparece, el comando puede haber fallado.

### Etapa 4 — Verificar que el ataque cesó

Después del bloqueo, el tráfico del atacante debería cesar:

```
tail -f /var/log/syslog
```

Observar si siguen apareciendo eventos de la IP bloqueada. Si siguen apareciendo, el bloqueo puede no haber funcionado o hay otra IP involucrada.

### Etapa 5 — Verificar el estado completo del firewall

```
iptables -L
```

Vista completa de todas las cadenas y reglas activas. Confirmar que el estado del firewall es el esperado.

### Etapa 6 — Documentar la respuesta

¿Qué IP se bloqueó? ¿Cuándo? ¿Con qué evidencia? ¿Qué ocurrió después del bloqueo?

## 3. Cuándo desbloquear

Si el bloqueo fue incorrecto (falso positivo, IP de usuario legítimo):

```
iptables -D INPUT -s <ip> -j DROP
```

Documentar el desbloqueo con la razón.

## 4. El principio de confirmar antes de actuar

El bloqueo de una IP tiene consecuencias. En producción, bloquear la IP de un cliente legítimo puede interrumpir el servicio y generar pérdidas. El principio fundamental del Nivel 5 es: confirmar con evidencia antes de actuar, y verificar después de actuar.
