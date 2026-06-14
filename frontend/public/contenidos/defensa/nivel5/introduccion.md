# Nivel 5 — Respuesta a incidentes y bloqueo de IPs

## 1. De la detección a la respuesta

Los niveles 1 al 4 desarrollaron la capacidad de detectar y caracterizar ataques. El Nivel 5 da el paso siguiente: responder activamente. La respuesta a incidentes no es solo analizar; es tomar decisiones y ejecutar acciones que contengan o eliminen la amenaza.

La acción de respuesta más inmediata en un entorno de servidor Linux es el bloqueo de IPs maliciosas usando el firewall del sistema.

## 2. iptables: el firewall de Linux

`iptables` es el sistema de filtrado de paquetes nativo de Linux. Permite definir reglas que controlan qué tráfico entra, sale o pasa por el servidor. En el contexto de respuesta a incidentes, se usa principalmente para:

- **Bloquear una IP maliciosa:** denegar todo el tráfico entrante desde la IP del atacante.
- **Desbloquear una IP:** eliminar una regla de bloqueo (por ejemplo, si fue un falso positivo).
- **Verificar el estado del firewall:** listar las reglas activas para confirmar que el bloqueo se aplicó correctamente.

## 3. El principio de proporcionalidad

No toda actividad sospechosa justifica un bloqueo inmediato. El bloqueo de IPs es una acción que puede tener consecuencias (bloquear un usuario legítimo por error, o bloquear una IP de un proveedor que comparte IP con usuarios legítimos). Por eso:

- **Bloquear solo con evidencia suficiente:** múltiples indicadores convergentes (escaneo + brute-force + acceso web desde la misma IP) justifican el bloqueo.
- **Verificar antes de bloquear:** confirmar que la IP es claramente maliciosa y no una IP compartida con tráfico legítimo.
- **Documentar el bloqueo:** registrar qué IP se bloqueó, cuándo y por qué.

## 4. La importancia de verificar el bloqueo

Ejecutar el comando de bloqueo no garantiza que la regla se aplicó correctamente. Siempre verificar con `iptables -L INPUT -n` que la regla aparece en el firewall y que el tráfico del atacante cesó.

## 5. El bloqueo como medida temporal

En producción, el bloqueo de IPs con iptables es una medida de contención inmediata, no una solución definitiva. Las IPs pueden cambiar; el atacante puede volver desde una IP diferente. El bloqueo gana tiempo para implementar medidas más robustas (fail2ban, WAF, autenticación de dos factores), pero no reemplaza esas medidas.

En el contexto del laboratorio, el bloqueo es la acción de respuesta principal que el estudiante debe dominar.
