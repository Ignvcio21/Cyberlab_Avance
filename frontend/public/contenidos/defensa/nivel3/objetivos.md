# Nivel 3 — Objetivos de aprendizaje

## 1. Objetivo general

Desarrollar la capacidad de detectar ataques activos de fuerza bruta y escaneo de red usando herramientas específicas de análisis de intrusiones, y de construir una hipótesis de incidente fundamentada en evidencia de múltiples fuentes.

---

## 2. Objetivos específicos

### 2.1. Detectar ataques de fuerza bruta
- Usar `lastb -n 20` para revisar el historial de intentos de login fallidos.
- Usar `grep failed /var/log/auth.log` para cuantificar la magnitud de un ataque de fuerza bruta.
- Identificar la IP de origen, el usuario objetivo y el período del ataque.
- Evaluar si el ataque está en curso o ya terminó.

### 2.2. Detectar escaneos de red
- Usar `grep scan /var/log/syslog` para identificar eventos de escaneo.
- Correlacionar el escaneo con actividad posterior de la misma IP.
- Distinguir entre un escaneo de reconocimiento aislado y uno que forma parte de un ataque coordinado.

### 2.3. Analizar el estado de conexiones activas
- Usar `netstat -an` para ver todas las conexiones activas y puertos en escucha.
- Identificar conexiones sospechosas en el listado de conexiones activas.
- Relacionar las conexiones activas con los eventos de log previamente analizados.

### 2.4. Verificar el estado de los procesos del sistema
- Usar `top -bn1` para obtener una instantánea del uso de CPU y memoria por proceso.
- Identificar procesos con uso anómalo de recursos que podrían indicar actividad maliciosa.

### 2.5. Construir una hipótesis de incidente
- Integrar los hallazgos de múltiples fuentes en una hipótesis coherente del ataque.
- Determinar la fase del ataque (reconocimiento, explotación activa, post-explotación).
- Establecer qué información adicional se necesita para confirmar o refutar la hipótesis.

---

## 3. Competencias desarrolladas al completar el nivel

- Capacidad de detectar indicadores de ataques de fuerza bruta y escaneo.
- Uso de herramientas específicas de análisis de estado del sistema.
- Construcción de hipótesis de incidente basadas en evidencia.
