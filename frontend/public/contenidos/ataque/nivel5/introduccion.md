# Nivel 5 — Post-explotación: acción posterior al acceso inicial

## 1. Qué significa la post-explotación

La post-explotación es la fase del ciclo de pentesting que ocurre después de haber obtenido acceso inicial a un sistema o recurso. Mientras que la explotación (Nivel 4) busca traspasar la primera línea defensiva, la post-explotación responde una pregunta diferente: **una vez dentro, ¿qué puede hacerse y cuál es el impacto real?**

Esta distinción es fundamental para comprender el valor de la post-explotación en una evaluación de seguridad profesional. El acceso inicial por sí solo no responde cuánto daño real puede producirse. La post-explotación es la fase que cuantifica ese impacto.

## 2. Por qué la post-explotación importa en una evaluación profesional

En un pentest real, el cliente no contrata solo para saber si su sistema puede ser comprometido. Necesita saber qué puede hacer un atacante una vez que lo comprometió. La diferencia entre "pudimos entrar" y "pudimos entrar, acceder a la base de datos de clientes, crear usuarios persistentes y movernos a tres sistemas adicionales" es la diferencia entre un hallazgo preocupante y un hallazgo crítico.

La post-explotación proporciona esa profundidad al análisis.

## 3. Actividades principales de la post-explotación

Las actividades de post-explotación en un pentest profesional incluyen:

**Reconocimiento interno:** una vez dentro del sistema, el analista mapea el entorno interno: qué otros sistemas son accesibles desde este punto, qué usuarios existen, qué datos están disponibles, qué procesos corren.

**Escalada de privilegios:** obtener permisos más altos dentro del sistema comprometido. Si el acceso inicial fue como usuario estándar, la escalada de privilegios busca acceso de administrador o root.

**Movimiento lateral:** acceder a otros sistemas dentro de la misma red utilizando el acceso obtenido como punto de pivote. Esto demuestra hasta dónde puede llegar un atacante desde el punto de compromiso inicial.

**Persistencia:** evaluar si un atacante podría mantener acceso al sistema incluso después de que se detecte y elimine el vector de entrada original. Técnicas como creación de usuarios, backdoors o tareas programadas son ejemplos típicos.

**Extracción de información:** determinar a qué datos sensibles puede acceder el atacante desde el sistema comprometido: credenciales, documentos, bases de datos, correos, configuraciones.

**Análisis de detección:** evaluar si las acciones de post-explotación son detectadas por los mecanismos defensivos del sistema.

## 4. El rol del analista en post-explotación

En post-explotación, el analista debe mantener el mismo rigor metodológico que en fases anteriores, con una responsabilidad adicional: las acciones en esta fase tienen mayor potencial de impacto sobre el sistema real. Cada acción debe ser:

- **Autorizada:** dentro del alcance definido para la evaluación.
- **Controlada:** mínimo impacto sobre la operación normal del sistema.
- **Documentada:** evidencia de cada acción para el reporte final.

## 5. Relación con fases anteriores

La post-explotación es la fase que cierra el ciclo ofensivo clásico:

- **Reconocimiento (N2):** ¿qué existe?
- **Enumeración (N3):** ¿qué tecnologías y servicios?
- **Explotación (N4):** ¿se puede acceder?
- **Post-explotación (N5):** ¿qué impacto real tiene ese acceso?

Sin post-explotación, una evaluación de seguridad queda incompleta: sabe que hay una puerta abierta pero no qué hay detrás de ella.

## 6. CyberLab en el Nivel 5

En este nivel, el laboratorio simula el entorno interno al que el analista tiene acceso después de la explotación. Los comandos disponibles permiten analizar sesiones activas, tráfico interno, hosts accesibles desde el punto de compromiso y evidencia de actividad en el sistema.

El objetivo formativo es aprender a extraer el máximo valor técnico de un acceso obtenido, documentarlo con precisión y evaluar el impacto real sobre la confidencialidad, integridad y disponibilidad del sistema analizado.

## 7. Autoevaluación

1. ¿Cuál es la diferencia entre explotación y post-explotación?
2. ¿Por qué la post-explotación es necesaria para cuantificar el impacto real de una vulnerabilidad?
3. ¿Qué significa "movimiento lateral" y por qué es relevante en una evaluación?
4. ¿Qué principios éticos y operacionales deben mantenerse durante la post-explotación?
5. ¿Cómo se relaciona la post-explotación con el reporte final de una evaluación de seguridad?
