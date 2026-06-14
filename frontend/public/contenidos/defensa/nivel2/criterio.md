# Nivel 2 — Criterio de evaluación

## 1. Descripción del nivel

El Nivel 2 evalúa la capacidad del estudiante para buscar y filtrar eventos específicos en los logs del sistema, identificar indicadores básicos de actividad sospechosa y correlacionar hallazgos de múltiples fuentes de log.

---

## 2. Criterios de evaluación

### 2.1. Uso de comandos de búsqueda (30%)
- Ejecutó `grep failed /var/log/auth.log` para buscar autenticación fallida.
- Ejecutó `grep scan /var/log/syslog` para buscar eventos de escaneo.
- Ejecutó `grep -i crit /var/log/syslog` para buscar alertas críticas.
- Usó `tail -N` para revisar actividad reciente en al menos un archivo de log.

### 2.2. Cobertura de la búsqueda (25%)
- La búsqueda cubrió al menos tres archivos de log distintos (auth.log, syslog, nginx/access.log).
- No se limitó a un único comando de búsqueda.
- Usó `tail -f` solo si la actividad era reciente (timestamps actuales).

### 2.3. Interpretación de resultados (25%)
- Puede describir cuántos intentos de autenticación fallida encontró y de qué IP.
- Puede relacionar los eventos de escaneo con los fallos de autenticación.
- Puede identificar si la actividad sospechosa está en curso o ya terminó.

### 2.4. Correlación entre fuentes (20%)
- Relacionó los hallazgos de diferentes archivos de log.
- Identificó la IP de origen común entre los distintos tipos de actividad sospechosa.
- Puede describir la narrativa del ataque en términos de secuencia temporal.

---

## 3. Indicadores de desempeño destacado

- Ejecutó búsquedas en los tres tipos de log (auth, syslog, nginx).
- Correlacionó los hallazgos de manera explícita: "la IP X aparece en escaneos, brute-force y acceso web".
- Usó opciones avanzadas de grep (como `-i`, número de resultados) de forma apropiada.
- Puede describir la narrativa completa del ataque basándose en los logs.

## 4. Indicadores de desempeño insuficiente

- Solo ejecutó un comando de búsqueda.
- No pudo describir la IP de origen de la actividad sospechosa.
- No correlacionó hallazgos de diferentes archivos de log.
- Confundió actividad normal con anómala o viceversa.

---

## 5. Nota mínima de aprobación

Se requiere ejecutar al menos tres comandos de búsqueda, cubrir al menos dos archivos de log distintos e identificar la IP de origen de al menos un tipo de actividad sospechosa para aprobar el nivel.
