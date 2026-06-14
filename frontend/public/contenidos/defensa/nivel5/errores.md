# Nivel 5 — Errores frecuentes en respuesta a incidentes

## 1. Error 1 — Bloquear sin suficiente evidencia

**Descripción:** el estudiante ejecuta el bloqueo con la primera IP sospechosa que encuentra, sin verificar que la evidencia es suficiente.

**Consecuencias:** posibles falsos positivos: bloquear usuarios legítimos. En producción, esto interrumpe el servicio y puede tener consecuencias contractuales.

**Corrección:** antes de bloquear, verificar que la IP aparece en múltiples fuentes de evidencia (auth.log, syslog, netstat) con actividad claramente maliciosa (alto volumen, usuarios genéricos, escaneos).

---

## 2. Error 2 — No verificar el bloqueo después de ejecutarlo

**Descripción:** el estudiante ejecuta `iptables -A INPUT -s <ip> -j DROP` pero no verifica que la regla se aplicó correctamente.

**Consecuencias:** el bloqueo puede haber fallado por un error de sintaxis (IP incorrecta, opción incorrecta) y el atacante sigue activo. El analista cree que respondió cuando en realidad no lo hizo.

**Corrección:** siempre ejecutar `iptables -L INPUT -n` inmediatamente después del bloqueo para confirmar que la regla aparece en la lista.

---

## 3. Error 3 — Bloquear la IP incorrecta

**Descripción:** el estudiante escribe mal la IP al ejecutar el comando de bloqueo.

**Consecuencias:** la IP maliciosa sigue activa y una IP inocente queda bloqueada.

**Corrección:** copiar la IP exactamente de la evidencia del log. Verificar con `iptables -L INPUT -n` que la regla muestra la IP correcta.

---

## 4. Error 4 — No verificar que el ataque cesó después del bloqueo

**Descripción:** el estudiante bloquea la IP y da el incidente por resuelto sin verificar que la actividad maliciosa efectivamente cesó.

**Consecuencias:** puede haber una segunda IP atacante que el bloqueo de la primera no afectó. O el bloqueo puede no haber funcionado.

**Corrección:** después del bloqueo, siempre verificar con `tail -f /var/log/syslog` que no hay nuevos eventos de la IP bloqueada.

---

## 5. Error 5 — Olvidar documentar la evidencia que justificó el bloqueo

**Descripción:** el estudiante bloquea la IP pero no registra qué evidencia justificó la decisión.

**Consecuencias:** en un entorno profesional, el bloqueo no puede auditarse. Si alguien pregunta "¿por qué bloqueaste esa IP?", no hay respuesta documentada.

**Corrección:** antes de ejecutar el bloqueo, documentar explícitamente: IP objetivo, tipo de actividad, número de eventos, fuentes de evidencia.

---

## 6. Error 6 — No saber cómo desbloquear

**Descripción:** el estudiante no conoce el comando `iptables -D` y no puede deshacer un bloqueo incorrecto.

**Consecuencias:** en caso de falso positivo, el usuario o servicio bloqueado permanece inaccesible más tiempo del necesario.

**Corrección:** conocer el comando de desbloqueo y su sintaxis antes de ejecutar el bloqueo. `iptables -D` tiene la misma sintaxis que `-A`, solo cambia la opción.
