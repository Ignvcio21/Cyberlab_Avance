# Nivel 6 — Avanzado: escenarios multi-vector y correlación compleja

## 1. El salto al Nivel 6

Los niveles anteriores entrenaron habilidades en un escenario relativamente lineal: un atacante, una vulnerabilidad, un vector de acceso. El Nivel 6 introduce una realidad diferente y más cercana a los ataques reales: **múltiples vectores de ataque simultáneos**, múltiples actores o técnicas coordinadas, y la necesidad de correlacionar evidencia que proviene de fuentes diversas y aparentemente desconectadas.

En seguridad ofensiva avanzada, los ataques raramente son simples. Un atacante sofisticado utiliza simultáneamente técnicas de reconocimiento activo, exploits dirigidos a diferentes servicios, evasión de mecanismos de detección y movimiento lateral coordinado. La capacidad de un analista para operar y analizar en este contexto multi-vector es lo que distingue a un profesional avanzado de uno intermedio.

## 2. Qué significa "multi-vector" en este contexto

Un ataque multi-vector es aquel que utiliza más de una técnica, fuente o camino de ataque simultáneamente o en coordinación. En CyberLab, el Nivel 6 simula escenarios donde:

- **Múltiples IPs atacantes** generan actividad simultánea (dos atacantes coordinados o un atacante con múltiples fuentes).
- **Diferentes tipos de actividad** ocurren al mismo tiempo: escaneo, intentos de autenticación, explotación de servicios distintos.
- **El ruido legítimo** se mezcla con actividad maliciosa, requiriendo que el analista discrimine entre señales reales y falsas alarmas.

La dificultad del análisis aumenta exponencialmente porque la correlación ahora debe realizarse entre múltiples fuentes de evidencia simultáneas.

## 3. Por qué el análisis multi-vector es más complejo

### Mayor volumen de información
Un escenario de dos atacantes puede generar el doble de eventos, alertas y tráfico que uno simple. La capacidad de filtrar y priorizar se vuelve crítica.

### Mayor ambigüedad
No toda la actividad que parece maliciosa en un escenario multi-vector lo es. El tráfico legítimo mezclado con actividad maliciosa puede generar falsos positivos. El analista debe discriminar con criterio técnico, no con intuición.

### Correlación inter-vector
Los hallazgos de un vector de ataque pueden ser relevantes para entender el otro. Un analista que trata cada vector de forma independiente pierde la imagen completa del incidente.

### Mayor presión temporal
Los escenarios multi-vector suelen generar escalada más rápida porque múltiples fases del ataque progresan simultáneamente. La gestión del tiempo es parte del desafío.

## 4. Habilidades que requiere el Nivel 6

Para operar efectivamente en este nivel, el estudiante debe haber consolidado:

- **Reconocimiento (N2):** identificar hosts y actividad sin confundir vectores.
- **Enumeración (N3):** enumerar servicios de múltiples hosts simultáneamente.
- **Explotación (N4):** priorizar qué vector explotar primero cuando hay múltiples.
- **Post-explotación (N5):** analizar el alcance de compromisos múltiples.

El Nivel 6 no enseña técnicas nuevas en aislamiento: integra todas las anteriores en un contexto de mayor complejidad.

## 5. El rol del correlacionador

En el Nivel 6, la habilidad más importante no es técnica sino analítica: **la correlación**. El correlacionador es el analista que toma eventos dispersos de múltiples fuentes y construye una narrativa coherente del incidente.

En un SOC real, esta es una de las habilidades más valoradas y más escasas. La correlación efectiva permite:

- Distinguir qué actividad proviene de cada vector.
- Identificar cuál es el vector principal y cuál es distractor.
- Determinar si los vectores son coordinados (mismo actor) o independientes.
- Construir una línea de tiempo coherente del incidente.

## 6. Autoevaluación

1. ¿Qué hace que un ataque multi-vector sea más difícil de analizar que uno de vector único?
2. ¿Cómo distinguirías entre ruido legítimo y actividad maliciosa en un escenario con múltiples fuentes de tráfico?
3. ¿Por qué la correlación es más importante que la velocidad de respuesta en un incidente multi-vector?
4. ¿Qué información de niveles anteriores es más útil para operar en este escenario?
5. ¿Qué diferencia a un analista avanzado de uno intermedio en el manejo de escenarios complejos?
