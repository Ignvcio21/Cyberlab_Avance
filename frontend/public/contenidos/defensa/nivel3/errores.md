# Nivel 3 — Errores frecuentes en detección de intrusiones

## 1. Error 1 — Concluir que hay un ataque solo porque hay intentos fallidos

**Descripción:** el estudiante ve 3-5 intentos fallidos de autenticación y concluye inmediatamente que hay un ataque de fuerza bruta.

**Consecuencias:** posibles falsos positivos. Algunos intentos fallidos son normales (usuarios legítimos que escriben mal su contraseña).

**Corrección:** un ataque de fuerza bruta tiene características específicas: decenas o cientos de intentos en un período corto, siempre desde la misma IP, con usuarios genéricos (root, admin). Un par de intentos fallidos de un usuario conocido no es un brute-force.

---

## 2. Error 2 — No usar `netstat -an` para verificar el estado de conexiones

**Descripción:** el estudiante detecta el brute-force pero no verifica si el atacante logró establecer una conexión exitosa.

**Consecuencias:** puede reportar un intento de ataque cuando en realidad hay un compromiso activo, o viceversa.

**Corrección:** siempre verificar `netstat -an` para determinar si hay conexiones activas del atacante. La diferencia entre "intento de ataque" y "acceso obtenido" es crítica para la respuesta.

---

## 3. Error 3 — Ignorar la dimensión temporal del ataque

**Descripción:** el estudiante identifica el brute-force pero no analiza cuándo empezó y si sigue activo.

**Consecuencias:** no puede determinar urgencia ni si el ataque sigue en curso, lo que afecta la prioridad de la respuesta.

**Corrección:** siempre anotar el primer y último timestamp del ataque. Si el último timestamp es de los últimos minutos, el ataque sigue activo. Si fue hace horas, ya terminó.

---

## 4. Error 4 — No correlacionar el escaneo con el brute-force

**Descripción:** el estudiante detecta el escaneo y el brute-force como eventos separados e independientes.

**Consecuencias:** pierde la narrativa del ataque coordinado (reconocimiento → explotación) y no puede comunicar la sofisticación del atacante.

**Corrección:** verificar siempre si la IP del escaneo coincide con la del brute-force. Si sí, son parte del mismo ataque coordinado.

---

## 5. Error 5 — Olvidar revisar los procesos del sistema

**Descripción:** el estudiante analiza los logs pero no ejecuta `top -bn1` para verificar el estado de los procesos.

**Consecuencias:** puede perder evidencia de que el atacante ya obtuvo acceso y está ejecutando procesos en el sistema.

**Corrección:** en cualquier incidente con intentos de acceso, siempre verificar el estado de procesos para descartar que el atacante ya logró ejecutar código en el sistema.
