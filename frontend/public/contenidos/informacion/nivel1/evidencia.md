# Nivel 1 — Evidencia y análisis

## 1. Principio de evidencia en ciberseguridad aplicada
La toma de decisiones en ciberseguridad debe sustentarse en evidencia verificable. En un contexto profesional, una acción defensiva es evaluable cuando se puede demostrar: (i) qué se observó, (ii) dónde se observó, (iii) por qué se interpretó como riesgo o incidente, (iv) qué medida se aplicó y (v) cómo se verificó el resultado. En un contexto académico, estas mismas condiciones determinan la calidad del aprendizaje, ya que permiten distinguir entre ejecución mecánica y razonamiento técnico.

CyberLab incorpora este principio mediante dos fuentes principales de información: **alertas** y **eventos**. Las alertas representan señales sintetizadas que orientan el análisis; los eventos representan evidencia primaria y detallada que permite confirmar qué ocurrió y sustentar decisiones. La competencia central del Nivel 1 consiste en comprender que el análisis no se basa en una única señal, sino en la relación entre señales, evidencia y patrón.

## 2. Señal vs evidencia: jerarquía y uso metodológico
Un error recurrente en estudiantes que se inician en seguridad consiste en tratar la alerta como “prueba”. En operación real, la alerta es un mecanismo de priorización: indica que el sistema detectó un comportamiento potencialmente relevante, pero no garantiza por sí sola que exista un ataque o que la interpretación sea correcta. Las alertas pueden generar falsos positivos por umbrales mal calibrados, comportamientos legítimos (por ejemplo, una red corporativa compartida) o condiciones operacionales anómalas (por ejemplo, reintentos automáticos por fallos de servicio).

Por lo tanto, la metodología correcta se fundamenta en la siguiente jerarquía:
- **Alerta (señal):** orienta; sugiere dónde mirar.
- **Evento (evidencia primaria):** confirma; permite reconstruir hechos y patrones.
- **Verificación posterior:** evidencia de resultado; confirma el efecto de la contención.

En el laboratorio, esta jerarquía se traduce en una secuencia concreta: revisar alertas, revisar eventos, decidir contención y verificar el estado posterior.

## 3. La evidencia relevante suele ser un patrón, no un evento aislado
En seguridad, la evidencia rara vez se reduce a un único registro. La mayoría de los incidentes se identifican por patrones: repetición, frecuencia, persistencia, correlación temporal y coherencia de origen. Un evento aislado (por ejemplo, un fallo de autenticación) puede ser normal. En cambio, múltiples fallos en pocos segundos desde un mismo origen se interpretan como un patrón anómalo compatible con automatización o abuso.

El análisis en el Nivel 1 debe entrenar precisamente esa habilidad: observar la relación entre eventos. Para sostener una argumentación técnica, se recomienda describir el patrón mediante cuatro componentes:
1) **Origen:** desde dónde proviene la actividad (por ejemplo, dirección IP).
2) **Frecuencia:** cuántos eventos ocurren en una ventana temporal.
3) **Persistencia:** si la actividad se mantiene hasta que se aplica una medida.
4) **Coherencia con el caso:** si el patrón coincide con el escenario simulado.

Estos componentes permiten evitar explicaciones vagas y construir una justificación basada en datos observables.

## 4. Elementos mínimos que deben extraerse de los eventos
Cuando se consultan eventos en el laboratorio, la evidencia debe interpretarse de forma estructurada. Se recomienda extraer al menos:
- **Tipo de evento:** qué acción se registró (por ejemplo, intento fallido, actividad repetitiva).
- **IP origen:** actor o fuente del comportamiento.
- **Descripción:** contexto del evento (qué ocurrió y cómo se describe).
- **Repetición:** si existen múltiples eventos similares.
- **Relación temporal:** proximidad en el tiempo (ventana corta sugiere automatización).

La evidencia más sólida en el Nivel 1 no es “vi un evento”, sino “observé repetición de eventos del mismo tipo, desde el mismo origen, en un periodo reducido”.

## 5. Construcción de una explicación técnica (estructura recomendada)
Para fines académicos y para preparar una conversación con un docente, se recomienda una estructura de explicación basada en evidencia, que sea consistente y replicable. Un formato recomendable es:

1) **Señal inicial (alerta):** indicar qué alerta se revisó y qué riesgo sugiere.
2) **Confirmación (eventos):** indicar qué eventos se consultaron y qué se observó.
3) **Caracterización del patrón:** describir repetición, frecuencia, persistencia y origen.
4) **Decisión defensiva:** explicar qué medida se aplicó y por qué es coherente con la evidencia.
5) **Verificación:** indicar cómo se comprobó que la medida quedó aplicada.
6) **Cierre:** mencionar reporte o registro final.

Una explicación técnica no debe basarse en frases subjetivas (“parecía ataque”), sino en afirmaciones verificables (“se registraron múltiples eventos repetidos desde la IP X en un periodo corto, consistente con el escenario”).

## 6. Justificación de contención: relación causal entre evidencia y acción
La contención es una medida que debe ser proporcional y justificada. En el laboratorio, la contención se representa principalmente mediante bloqueo de IP, por su claridad y verificabilidad. Sin embargo, el estudiante debe ser capaz de explicar la contención como relación causal:

- **Evidencia:** múltiples eventos repetidos desde un origen.
- **Riesgo:** probabilidad de abuso o ataque según patrón observado.
- **Medida:** bloqueo del origen para cortar la actividad y reducir riesgo inmediato.
- **Verificación:** confirmación de que el origen quedó bloqueado.

En un entorno real, el bloqueo por IP puede ser insuficiente o tener impacto sobre usuarios legítimos; por ello, se espera que el estudiante reconozca que esta medida es contención inmediata y que, en sistemas reales, se complementa con defensa en profundidad (rate limiting, MFA, bloqueo progresivo, correlación).

## 7. Evidencia de resultado: la verificación como requisito
El análisis basado en evidencia no se limita a la evidencia previa a la contención. La evidencia de resultado, obtenida por verificación posterior, es crítica: confirma que la medida defensiva fue efectiva y que el sistema cambió de estado. En CyberLab, esto se expresa mediante la consulta posterior (por ejemplo, listado de IPs bloqueadas). Sin esta verificación, la respuesta queda metodológicamente incompleta, ya que el analista no puede demostrar que la contención se aplicó.

Desde una perspectiva profesional, la evidencia de resultado también facilita auditoría y revisión. Un reporte o una bitácora de incidente debe incluir no solo “se bloqueó X”, sino “se verificó que X quedó bloqueada”.

## 8. Consideración de falsos positivos y criterio profesional
Un elemento relevante del pensamiento profesional es reconocer que no toda señal implica un incidente real. En un entorno productivo, pueden existir escenarios donde múltiples intentos desde una IP son legítimos: redes NAT corporativas, usuarios con credenciales olvidadas, automatizaciones autorizadas o fallas de servicio que provocan reintentos. Por ello, la formación universitaria debe incorporar el criterio de proporcionalidad: se actúa con base en evidencia suficiente y se privilegian medidas reversibles cuando existe incertidumbre.

En CyberLab, los escenarios están diseñados para fines didácticos y suelen representar casos donde la contención está justificada. Aun así, se considera formativamente valioso que el estudiante sea capaz de mencionar el concepto de falso positivo y explicar que, en un sistema real, la contención podría iniciarse con medidas temporales, monitoreo reforzado o escalamiento antes de aplicar bloqueos permanentes.

## 9. Aplicación a la evaluación del laboratorio
En términos de evaluación, el estudiante demuestra competencia cuando:
- revisa alertas y las interpreta como señal inicial,
- revisa eventos y describe evidencia como patrón,
- identifica correctamente el origen,
- aplica contención coherente,
- verifica explícitamente el resultado,
- y puede describir el cierre del caso con terminología técnica.

El enfoque se centra en coherencia metodológica y argumentación basada en evidencia. El laboratorio está diseñado para que el procedimiento pueda ser reconstruido y explicado, lo que lo convierte en un instrumento útil para evaluar aprendizaje real.

## 10. Síntesis
El Nivel 1 entrena el análisis basado en evidencia como estándar mínimo de calidad. La evidencia se construye a partir de eventos y se organiza mediante alertas que priorizan el análisis. La decisión defensiva se justifica cuando existe un patrón consistente y se completa cuando se verifica el resultado. Esta disciplina metodológica es transferible a escenarios más complejos: aunque cambien las técnicas y aumente el volumen de información, el criterio central permanece: **señal → evidencia → patrón → decisión → verificación → documentación**.