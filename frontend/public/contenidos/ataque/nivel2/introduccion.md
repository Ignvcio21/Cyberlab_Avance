# Nivel 2 — Reconocimiento y escaneo de puertos

## Introducción

En este nivel se introduce una de las etapas más importantes dentro de un proceso de pentesting: el reconocimiento de servicios mediante escaneo de puertos. A diferencia del Nivel 1, donde el foco principal se centró en interpretar alertas y responder ante un patrón evidente de fuerza bruta, en este nivel el estudiante comienza a trabajar con actividades asociadas a la fase inicial de reconocimiento ofensivo.

En ciberseguridad, el reconocimiento representa la etapa donde un atacante intenta obtener información del objetivo antes de ejecutar acciones más invasivas. Esta información puede incluir direcciones IP, servicios expuestos, puertos abiertos, versiones de software y posibles vectores de entrada. Aunque esta fase suele parecer “menos peligrosa” que una explotación directa, en la práctica constituye una de las etapas más críticas dentro de una intrusión, ya que permite preparar ataques posteriores con mayor precisión.

Dentro del laboratorio CyberLab, el reconocimiento se representa mediante escenarios controlados donde el sistema genera eventos relacionados con conexiones repetitivas hacia múltiples puertos de un mismo objetivo. El estudiante deberá interpretar estos comportamientos utilizando evidencia entregada por eventos y alertas, manteniendo una metodología ordenada y basada en observación técnica.

Este nivel busca reforzar la importancia del análisis previo antes de ejecutar acciones. En escenarios reales, una decisión apresurada puede provocar bloqueos innecesarios, falsos positivos o interrupciones sobre servicios legítimos. Por ello, el laboratorio no evalúa únicamente “llegar al resultado”, sino la capacidad de justificar técnicamente cada decisión tomada durante el procedimiento.

Desde una perspectiva académica, este nivel introduce conceptos fundamentales asociados a:
- reconocimiento activo,
- enumeración básica de servicios,
- interpretación de patrones,
- correlación entre eventos y alertas,
- y priorización inicial de incidentes.

Asimismo, se mantiene el enfoque metodológico trabajado en el Nivel 1:
1) identificación de señales,
2) análisis de evidencia,
3) interpretación del patrón,
4) aplicación de medidas,
5) verificación posterior.

La diferencia principal es que ahora el estudiante deberá interpretar comportamientos menos evidentes y comprender que no toda actividad sospechosa implica automáticamente una explotación activa. Parte importante del aprendizaje consiste precisamente en distinguir reconocimiento, enumeración y ataque real.

En términos operacionales, el laboratorio continúa utilizando una terminal interactiva inspirada en entornos Linux/Kali, donde el usuario deberá consultar eventos, revisar alertas y aplicar acciones defensivas de forma controlada. El objetivo no es memorizar comandos, sino desarrollar criterio técnico y comprensión metodológica del proceso ofensivo.

Finalmente, este nivel sirve como transición hacia escenarios posteriores de mayor complejidad, donde se incorporarán análisis de servicios expuestos, correlación de actividad sospechosa y simulaciones ofensivas multi-etapa.