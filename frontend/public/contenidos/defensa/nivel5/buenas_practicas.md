# Nivel 5 — Buenas prácticas de respuesta a incidentes

## 1. Confirmar siempre antes de actuar

En seguridad defensiva, actuar sin suficiente evidencia puede ser tan dañino como no actuar. El bloqueo de una IP legítima interrumpe el servicio; el bloqueo de una IP incorrecta deja al atacante libre. Confirmar siempre con evidencia múltiple antes de ejecutar el bloqueo.

## 2. Verificar siempre después de actuar

Ejecutar el bloqueo no es suficiente. Verificar con `iptables -L INPUT -n` que la regla se aplicó, y con `tail -f /var/log/syslog` que la actividad cesó. La respuesta no está completa hasta que la verificación lo confirma.

## 3. Documentar la decisión, no solo la acción

En un informe de incidente, es importante documentar no solo qué se hizo sino por qué. "Bloqueé 192.168.1.100 porque mostraba 85 intentos de brute-force en 2 minutos, precedidos por un escaneo de puertos" es más valioso que "bloqueé 192.168.1.100".

## 4. Conocer el comando de desbloqueo antes de bloquear

Antes de ejecutar un bloqueo en producción, tener a mano el comando de desbloqueo. Los falsos positivos ocurren incluso con analistas experimentados. Saber cómo deshacer el bloqueo rápidamente minimiza el impacto.

## 5. Un bloqueo es contención, no remediación

Bloquear una IP detiene ese atacante específico, pero no cierra la vulnerabilidad que intentó explotar. Después del bloqueo, pensar siempre en qué medidas adicionales harían al sistema más resistente (contraseñas más fuertes, fail2ban, autenticación de dos factores).

## 6. Revisar el firewall completo periódicamente

Con el tiempo, el firewall puede acumular reglas de bloqueos anteriores que ya no son necesarias. `iptables -L` permite ver el estado completo. Un firewall con reglas obsoletas es más difícil de auditar y gestionar.

## 7. Priorizar la contención sobre el análisis cuando hay acceso activo

Si hay evidencia de que el atacante tiene acceso activo al sistema (conexión ESTABLISHED en netstat), la prioridad es contener inmediatamente antes de seguir analizando. Cada minuto con acceso activo es un minuto más de riesgo.
