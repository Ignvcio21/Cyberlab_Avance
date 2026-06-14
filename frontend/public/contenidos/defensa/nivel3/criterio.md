# Nivel 3 — Criterio de evaluación

## 1. Descripción del nivel

El Nivel 3 evalúa la capacidad del estudiante para detectar ataques de fuerza bruta y escaneo de red, analizar el estado de las conexiones activas y procesos del sistema, y construir una hipótesis de incidente fundamentada.

---

## 2. Criterios de evaluación

### 2.1. Detección del ataque de fuerza bruta (25%)
- Usó `lastb -n 20` para revisar el historial de logins fallidos.
- Usó `grep failed /var/log/auth.log` para cuantificar el ataque.
- Identificó la IP de origen, los usuarios probados y el período del ataque.

### 2.2. Detección de escaneo y correlación (20%)
- Verificó si hubo escaneo previo con `grep scan /var/log/syslog`.
- Determinó si el escaneo y el brute-force provienen de la misma IP.
- Estableció la secuencia temporal (escaneo antes del brute-force).

### 2.3. Análisis de conexiones y procesos (25%)
- Ejecutó `netstat -an` y analizó las conexiones activas.
- Ejecutó `top -bn1` y revisó los procesos en busca de anomalías.
- Determinó si el atacante obtuvo acceso exitoso o no.

### 2.4. Hipótesis de incidente (30%)
- Formuló una hipótesis coherente que integra los hallazgos de todas las fuentes.
- La hipótesis incluye: IP del atacante, tipo de ataque, magnitud, período y estado (en curso / finalizado / con éxito / sin éxito).
- La hipótesis es consistente con la evidencia encontrada.

---

## 3. Indicadores de desempeño destacado

- Detectó tanto el brute-force como el escaneo previo y los correlacionó como un ataque en dos fases.
- Determinó con evidencia explícita si el atacante obtuvo acceso o no.
- La hipótesis de incidente es completa y podría guiar una respuesta de contención.

## 4. Indicadores de desempeño insuficiente

- No verificó el estado de las conexiones con `netstat -an`.
- No revisó los procesos con `top -bn1`.
- La hipótesis de incidente no incluye IP de origen o estado del ataque.
- Confundió intentos fallidos normales con un ataque de fuerza bruta.

---

## 5. Nota mínima de aprobación

Se requiere detectar el brute-force con evidencia de al menos dos fuentes (lastb + grep failed), analizar las conexiones activas con netstat y formular una hipótesis de incidente con IP, tipo y estado para aprobar el nivel.
