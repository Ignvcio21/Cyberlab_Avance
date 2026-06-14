# Nivel 3 — Buenas prácticas de detección de intrusiones

## 1. Distinguir entre "intento" y "éxito"

La diferencia más importante en el análisis de brute-force es si el atacante tuvo éxito. `grep failed` muestra los intentos fallidos; una búsqueda de `Accepted` en auth.log o una conexión `ESTABLISHED` en `netstat -an` muestra si tuvo éxito. Siempre verificar ambos lados.

## 2. Correlacionar IPs antes de concluir

Antes de afirmar que el escaneo y el brute-force son parte del mismo ataque, verificar que provienen de la misma IP. Dos IPs distintas son dos atacantes distintos (o dos incidentes distintos). No asumir correlación sin evidencia.

## 3. Calcular la magnitud del brute-force

Un brute-force de 10 intentos y uno de 10.000 intentos son cualitativamente distintos. El primero puede ser un usuario legítimo que olvidó su contraseña; el segundo es definitivamente una herramienta automatizada. Contar las líneas de `grep failed` da la magnitud real.

## 4. Revisar los procesos como parte estándar del análisis

Siempre incluir `top -bn1` en el análisis cuando hay intentos de acceso. Un analista que detecta el intento pero no verifica si hubo éxito está dejando una pregunta crítica sin responder.

## 5. Documentar el período del ataque

Anotar el primer y último timestamp del ataque permite:
- Calcular la duración del ataque.
- Determinar si sigue en curso.
- Relacionar el ataque con otros eventos del sistema en el mismo período.

## 6. Usar `lastb` como primera verificación rápida

`lastb -n 20` es más rápido de interpretar que buscar en auth.log porque tiene un formato tabular limpio. Úsalo como primera verificación rápida; confirma y profundiza con `grep failed /var/log/auth.log`.

## 7. La hipótesis de incidente es el producto del análisis

Al finalizar el análisis, el producto no es "ejecuté todos los comandos": es la hipótesis del incidente. Una frase que describe quién atacó, cómo, cuándo, con qué magnitud y con qué resultado. Sin esta síntesis, el análisis técnico no produce valor para quien toma decisiones.
