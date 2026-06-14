# Nivel 5 — Evidencia en la respuesta a incidentes

## 1. La evidencia que justifica el bloqueo

Antes de ejecutar cualquier acción de bloqueo, el analista debe tener evidencia suficiente. En el Nivel 5, la evidencia de bloqueo tiene dos componentes:

**Evidencia pre-bloqueo:** lo que justificó la decisión de bloquear.

```
grep failed /var/log/auth.log → 85 intentos fallidos desde 192.168.1.100
grep scan /var/log/syslog    → escaneo de puertos desde 192.168.1.100 a las 03:15
netstat -an                  → 3 conexiones en SYN_RECV desde 192.168.1.100
```

**Evidencia del bloqueo:** confirmación de que la acción se ejecutó correctamente.

```
iptables -L INPUT -n →
Chain INPUT (policy ACCEPT)
DROP    all   --   192.168.1.100    0.0.0.0/0
```

## 2. La evidencia post-bloqueo

Después del bloqueo, el analista debe documentar el efecto del bloqueo:

- **Confirmación de cese de actividad:** `tail -f /var/log/syslog` no muestra nuevos eventos de la IP bloqueada.
- **Estado del firewall:** `iptables -L` muestra el estado completo del firewall post-respuesta.
- **Timestamp del bloqueo:** cuándo se ejecutó el bloqueo.

## 3. La evidencia del proceso de toma de decisión

La evidencia del proceso (no solo del resultado) es importante en un informe profesional:

- ¿Qué análisis se realizó antes del bloqueo?
- ¿Qué criterios se usaron para decidir bloquear?
- ¿Se verificó que la IP no era de un usuario legítimo?

Esta documentación del razonamiento muestra que el analista actuó con criterio y no de forma impulsiva.

## 4. Organización de la evidencia del Nivel 5

```
[PRE-BLOQUEO]
Evidencia de actividad maliciosa de 192.168.1.100:
- 85 intentos de brute-force SSH (grep failed /var/log/auth.log)
- Escaneo de puertos a las 03:15 (grep scan /var/log/syslog)
- 3 conexiones SYN_RECV activas (netstat -an)

[BLOQUEO]
Acción ejecutada: iptables -A INPUT -s 192.168.1.100 -j DROP
Timestamp: 2026-06-14 03:25:00

[POST-BLOQUEO]
Verificación: regla aparece en iptables -L INPUT -n
Efecto: sin nuevos eventos de 192.168.1.100 en tail -f /var/log/syslog
```

## 5. La diferencia entre ejecutar y documentar

Ejecutar el bloqueo sin documentarlo deja al equipo sin contexto para entender qué pasó y por qué. Un bloqueo bien documentado permite: auditar la decisión, aprender del incidente, detectar si el atacante regresa desde una IP diferente.
