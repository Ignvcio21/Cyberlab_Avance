# Nivel 5 — Objetivos de aprendizaje

## 1. Objetivo general

Desarrollar la capacidad de responder activamente a incidentes de seguridad mediante el bloqueo de IPs maliciosas con iptables, la verificación de la efectividad de las reglas de firewall y la documentación del proceso de respuesta.

---

## 2. Objetivos específicos

### 2.1. Detectar y confirmar la amenaza antes de actuar
- Integrar el análisis de logs y red de los niveles anteriores para confirmar la IP del atacante.
- Verificar que la evidencia es suficiente para justificar una acción de bloqueo.
- Descartar que la IP sea de un usuario legítimo antes de bloquear.

### 2.2. Bloquear IPs maliciosas con iptables
- Usar `iptables -A INPUT -s <ip> -j DROP` para bloquear el tráfico entrante de una IP.
- Entender el significado de cada parte del comando (cadena INPUT, origen `-s`, acción DROP).
- Ejecutar el bloqueo con la IP correcta y verificar que el comando no produce errores.

### 2.3. Verificar el estado del firewall
- Usar `iptables -L INPUT -n` para listar las reglas de la cadena INPUT y confirmar el bloqueo.
- Usar `iptables -L` para una vista completa del estado del firewall.
- Verificar que el tráfico del atacante cesó después del bloqueo.

### 2.4. Desbloquear IPs cuando sea necesario
- Usar `iptables -D INPUT -s <ip> -j DROP` para eliminar una regla de bloqueo.
- Aplicar este comando cuando un bloqueo fue un falso positivo.
- Verificar que la regla fue eliminada correctamente.

### 2.5. Documentar el proceso de respuesta
- Registrar qué IP se bloqueó, cuándo y con qué evidencia.
- Verificar que la actividad maliciosa cesó después del bloqueo.
- Describir el estado del sistema antes y después de la respuesta.

---

## 3. Competencias desarrolladas

- Capacidad de ejecutar respuesta activa a incidentes de seguridad.
- Manejo básico de iptables como herramienta de contención.
- Hábito de verificar que las acciones de respuesta tienen el efecto esperado.
