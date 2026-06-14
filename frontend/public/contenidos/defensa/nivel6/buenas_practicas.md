# Nivel 6 — Buenas prácticas en análisis multi-vector defensivo

## 1. Triage siempre antes de responder

En multi-vector, la urgencia de responder puede llevar a actuar antes de tener el panorama completo. El triage inicial (journalctl, grep, netstat) toma solo dos o tres minutos y puede evitar respuestas incompletas. La prisa es el peor enemigo del analista en un incidente complejo.

## 2. Listar explícitamente todos los vectores antes de actuar

Al terminar el triage, hacer una lista explícita: IP1 — tipo de ataque — fase. IP2 — tipo de ataque — fase. Esta lista guía la respuesta y asegura que ningún vector quede sin atender.

## 3. Bloquear y verificar uno a la vez

No ejecutar múltiples bloqueos sin verificar cada uno. Bloquear IP1, verificar con `iptables -L INPUT -n`, confirmar que la regla está activa, y solo entonces bloquear IP2. Esto evita errores acumulados.

## 4. Sospechar de los vectores silenciosos

En un ataque coordinado, el vector más ruidoso suele ser la distracción. El vector principal puede ser más difícil de detectar precisamente porque genera menos ruido. Prestar atención especial a las IPs con pocos eventos pero de mayor severidad.

## 5. Verificar la integridad del sistema post-bloqueo

Después de bloquear todos los vectores, verificar que el sistema no tiene indicadores de compromiso persistente:

```
top -bn1           → procesos anómalos
netstat -tulpn     → servicios no autorizados en escucha
```

El bloqueo de IPs detiene el acceso externo, pero no elimina los efectos de un acceso previo exitoso.

## 6. Documentar la correlación, no solo los hechos

El reporte del Nivel 6 debe incluir no solo qué hizo cada vector, sino cómo se relacionan entre sí. La correlación es el análisis más valioso que el analista puede aportar en un incidente multi-vector.

## 7. El orden de prioridad es siempre: acceso activo > brute-force activo > escaneo

Si hay acceso confirmado, contenerlo es la máxima prioridad. Si hay brute-force activo sin acceso, es la segunda prioridad. El reconocimiento (escaneo) es la menor urgencia porque no tiene acceso y no daña el sistema directamente.
