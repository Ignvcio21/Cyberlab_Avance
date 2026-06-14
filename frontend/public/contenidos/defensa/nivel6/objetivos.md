# Nivel 6 — Objetivos de aprendizaje

## 1. Objetivo general

Desarrollar la capacidad de detectar, analizar y responder simultáneamente a múltiples vectores de ataque, manteniendo una visión sistémica del incidente y priorizando las acciones de respuesta según el impacto y la progresión de cada vector.

---

## 2. Objetivos específicos

### 2.1. Triage inicial en escenarios multi-vector
- Ejecutar los comandos de inspección panorámica para obtener una visión de todos los vectores activos.
- Identificar cuántas IPs distintas generan actividad sospechosa.
- No comprometer el análisis completo por reaccionar al primer vector visible.

### 2.2. Separar y caracterizar cada vector
- Identificar el tipo de ataque y la IP de origen de cada vector.
- Determinar en qué fase está cada vector (reconocimiento, fuerza bruta, acceso web, acceso activo).
- Clasificar los vectores por severidad e impacto potencial.

### 2.3. Correlacionar los vectores
- Determinar si los vectores son independientes o parte de un ataque coordinado.
- Identificar si hay un vector principal y uno secundario o de distracción.
- Evaluar el impacto combinado de los vectores.

### 2.4. Responder a múltiples vectores
- Bloquear múltiples IPs maliciosas con `iptables`.
- Priorizar el orden de bloqueo según la severidad de cada vector.
- Verificar que cada bloqueo se aplicó correctamente.

### 2.5. Verificar la contención completa
- Confirmar que todos los vectores fueron contenidos.
- Detectar si queda algún vector activo después de la respuesta.
- Identificar actividad residual o nuevos vectores emergentes.

---

## 3. Competencias desarrolladas

- Gestión de incidentes complejos con múltiples fuentes de amenaza simultáneas.
- Priorización de respuestas bajo presión.
- Análisis de correlación inter-vector.
