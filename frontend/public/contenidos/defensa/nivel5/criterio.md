# Nivel 5 — Criterio de evaluación

## 1. Descripción del nivel

El Nivel 5 evalúa la capacidad del estudiante para ejecutar respuesta activa a incidentes mediante el bloqueo de IPs maliciosas con iptables, con evidencia suficiente, verificación del bloqueo y documentación del proceso.

---

## 2. Criterios de evaluación

### 2.1. Evidencia pre-bloqueo (25%)
- Recopiló evidencia de al menos dos fuentes antes de ejecutar el bloqueo.
- La evidencia identifica claramente la IP maliciosa.
- Verificó que la actividad era inequívocamente maliciosa (no un falso positivo).

### 2.2. Ejecución del bloqueo (20%)
- Ejecutó `iptables -A INPUT -s <ip> -j DROP` con la IP correcta.
- La sintaxis del comando fue correcta.
- Bloqueó la IP del atacante, no una IP aleatoria.

### 2.3. Verificación del bloqueo (25%)
- Ejecutó `iptables -L INPUT -n` y confirmó que la regla aparece.
- Verificó que la IP bloqueada aparece correctamente en la lista de reglas.

### 2.4. Verificación de cese de actividad (15%)
- Ejecutó `tail -f /var/log/syslog` u otro comando para confirmar que la actividad maliciosa cesó.
- Puede describir si el ataque cesó o si hay actividad residual.

### 2.5. Documentación del proceso (15%)
- Puede describir la evidencia que justificó el bloqueo.
- Puede describir cuándo se ejecutó el bloqueo y qué ocurrió después.
- Conoce el comando de desbloqueo y cuándo usarlo.

---

## 3. Indicadores de desempeño destacado

- Recopiló evidencia de tres o más fuentes antes del bloqueo.
- Ejecutó el bloqueo, verificó la regla y verificó el cese de actividad en la secuencia correcta.
- Puede describir la diferencia entre contención (bloqueo) y remediación (cierre de vulnerabilidad).
- Ejecutó `iptables -L` para revisar el estado completo del firewall post-respuesta.

## 4. Indicadores de desempeño insuficiente

- Bloqueó sin verificar la evidencia suficiente.
- No verificó que la regla se aplicó con `iptables -L INPUT -n`.
- No verificó que el ataque cesó después del bloqueo.
- No puede describir la evidencia que justificó el bloqueo.

---

## 5. Nota mínima de aprobación

Se requiere recopilar evidencia suficiente, ejecutar el bloqueo con la IP correcta y verificar que la regla se aplicó correctamente para aprobar el nivel.
