# Nivel 6 — Fundamentos técnicos del análisis multi-vector

## 1. Anatomía de un ataque multi-vector

Un ataque multi-vector no es simplemente "más de un ataque al mismo tiempo". Es una estrategia ofensiva donde la coordinación entre vectores produce un efecto mayor que la suma de sus partes. Los patrones más comunes incluyen:

**Distracción y explotación:** un vector genera ruido intenso (escaneo masivo, intentos de autenticación) para distraer los sistemas de defensa mientras el vector real de explotación opera de forma más silenciosa.

**Encadenamiento de vectores:** el primer vector obtiene información que habilita el segundo. Por ejemplo, un vector de reconocimiento identifica credenciales que el segundo vector utiliza para autenticación.

**Redundancia:** múltiples vectores apuntan al mismo objetivo desde diferentes ángulos para aumentar la probabilidad de éxito aunque uno sea bloqueado.

**División de roles:** en ataques de equipos reales, diferentes actores tienen roles específicos (reconocimiento, explotación, post-explotación) y operan en paralelo sobre el mismo objetivo.

## 2. El problema de la correlación en multi-vector

La correlación en escenarios de vector único es relativamente directa: los eventos de una única fuente se correlacionan por tiempo y patrón. En multi-vector, la correlación debe realizarse entre fuentes que pueden tener:

- **IPs distintas:** los eventos de dos vectores llegan de diferentes orígenes.
- **Patrones distintos:** cada vector puede usar técnicas completamente diferentes.
- **Tiempos distintos:** los vectores no siempre son simultáneos; uno puede preceder al otro por minutos u horas.

Para correlacionar efectivamente, el analista debe buscar:

- **Objetivo compartido:** ambos vectores apuntan al mismo host o servicio.
- **Secuencia lógica:** uno de los vectores parece preparar el camino para el otro.
- **Coordinación temporal:** los vectores se activan o intensifican al mismo tiempo.
- **Complementariedad técnica:** las técnicas de cada vector se complementan para lograr un objetivo que ninguno podría lograr solo.

## 3. Falsos positivos en entornos complejos

En un entorno con múltiples fuentes de tráfico, la probabilidad de falsos positivos aumenta significativamente. Un falso positivo en seguridad es una alerta o clasificación como malicioso de algo que en realidad es legítimo.

Los falsos positivos son costosos porque:

- Consumen tiempo de análisis que debería estar en actividad real.
- Pueden llevar a bloquear IPs o servicios legítimos.
- Reducen la confianza en el sistema de detección.

La discriminación de falsos positivos requiere:

- Conocimiento del comportamiento normal del entorno.
- Análisis de contexto: ¿esta actividad tiene sentido dada la función del host?
- Correlación con otras fuentes: ¿hay más evidencia que respalde la clasificación como maliciosa?

## 4. Priorización bajo complejidad

En un escenario multi-vector con alto volumen de información, el analista no puede atender todo simultáneamente. La priorización efectiva sigue criterios técnicos:

- **Impacto potencial:** priorizar el vector que, si tiene éxito, produce mayor daño.
- **Velocidad de escalada:** priorizar el vector que parece estar progresando más rápido.
- **Detectabilidad:** los vectores más silenciosos pueden ser más peligrosos aunque parezcan menos activos.
- **Alcance:** priorizar vectores que afectan sistemas críticos o con mayor radio de explosión potencial.

## 5. La naturaleza de los escenarios nivel 6-7 en CyberLab

En CyberLab, los niveles 6 y 7 introducen escenarios con múltiples IPs atacantes. Esto significa que el estudiante verá actividad maliciosa proveniente de dos fuentes distintas simultáneamente, mezclada con tráfico legítimo del entorno.

Los comandos de análisis (`show events`, `show alerts`, `show traffic`, `show hosts`) producirán más información que en niveles anteriores, y parte de esa información corresponde a actividad legítima que no debe tratarse como amenaza.

La habilidad central del nivel es discriminar, correlacionar y priorizar esta información con criterio técnico sólido.
