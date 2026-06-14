# Nivel 3 — Metodología de detección de intrusiones

## 1. El ciclo de detección

La detección de intrusiones sigue un ciclo: observar → hipótesis → verificar → concluir.

- **Observar:** ejecutar los comandos de análisis y recopilar los datos.
- **Hipótesis:** formular una explicación de lo que están mostrando los datos.
- **Verificar:** ejecutar comandos adicionales para confirmar o refutar la hipótesis.
- **Concluir:** determinar con qué certeza se puede afirmar que hay un ataque en curso.

## 2. Secuencia metodológica del Nivel 3

### Etapa 1 — Revisión del historial de logins fallidos
```
lastb -n 20
```
¿Cuántos intentos fallidos recientes hay? ¿De qué IP(s)? ¿De qué usuario(s)?

### Etapa 2 — Cuantificación con grep
```
grep failed /var/log/auth.log
```
¿Cuántos intentos fallidos hay en total? ¿Cuál es el período? ¿Sigue en curso?

### Etapa 3 — Verificar si el escaneo precedió al brute-force
```
grep scan /var/log/syslog
```
¿Hay escaneos de la misma IP antes de los intentos de brute-force? Esto confirmaría un ataque coordinado (reconocimiento → explotación).

### Etapa 4 — Revisar conexiones activas
```
netstat -an
```
¿Hay conexiones activas desde la IP del atacante? ¿En qué estado?

### Etapa 5 — Verificar procesos del sistema
```
top -bn1
```
¿Hay procesos anómalos que podrían indicar que el atacante ya obtuvo acceso?

### Etapa 6 — Revisar alertas críticas
```
grep -i crit /var/log/syslog
```
¿El sistema generó alertas críticas relacionadas con la actividad detectada?

## 3. Construcción de la hipótesis de incidente

Con los datos recopilados, formular la hipótesis del incidente:

> "La IP [X] ejecutó un escaneo de puertos a las [hora], seguido de un ataque de fuerza bruta SSH de [N] intentos entre [hora inicio] y [hora fin]. Las alertas críticas confirman que el sistema detectó el ataque. [En `netstat -an`, hay/no hay] conexiones activas desde la IP del atacante, lo que indica que el acceso [fue/no fue] exitoso."

Esta hipótesis guía las acciones de respuesta del nivel siguiente.

## 4. Cuándo escalar

Si los datos muestran que hay conexiones activas desde la IP del atacante O que hay procesos anómalos corriendo, el incidente puede haber escalado más allá de un intento de ataque. En ese caso, la respuesta requiere acciones de contención inmediata (Niveles 5+).

En el Nivel 3, el objetivo es detectar y caracterizar. La respuesta se trabaja en niveles posteriores.
