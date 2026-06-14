# Nivel 4 — Metodología de explotación

## 1. Por qué la metodología importa en explotación

La explotación sin metodología produce resultados impredecibles, daño potencial al sistema analizado, hallazgos sin evidencia reproducible y exposición legal para el analista. En cambio, la explotación estructurada permite obtener resultados verificables, mantener control del proceso, documentar hallazgos con precisión y garantizar que el análisis sea repetible y auditable.

El Nivel 4 aplica una metodología en seis etapas que se describen a continuación. Esta metodología no reemplaza el juicio técnico del analista, pero proporciona un marco ordenado que reduce errores y maximiza la calidad del análisis.

## 2. Etapa 1 — Revisión de superficie de ataque acumulada

Antes de comenzar la explotación, el analista debe revisar toda la información técnica recopilada en fases previas:

- **Hosts activos identificados** en reconocimiento (Nivel 2).
- **Servicios y tecnologías enumerados** en enumeración (Nivel 3).
- **Puertos abiertos y versiones detectadas** durante el escaneo técnico.
- **Patrones observados** en tráfico, sesiones y eventos del laboratorio.

Esta revisión permite identificar qué elementos de la superficie de ataque tienen mayor probabilidad de contener vulnerabilidades explotables.

**Pregunta clave:** ¿cuáles servicios detectados tienen versiones conocidamente vulnerables o configuraciones inseguras?

## 3. Etapa 2 — Identificación y priorización de vulnerabilidades

Con la superficie de ataque revisada, el paso siguiente es identificar vulnerabilidades específicas:

### 3.1. Búsqueda en la terminal del laboratorio

El comando `show vulnerabilities` permite visualizar vulnerabilidades detectadas por el sistema en el entorno analizado. Cada entrada incluye:

- servicio afectado,
- descripción de la debilidad,
- severidad estimada,
- vector de acceso.

### 3.2. Priorización por impacto y explotabilidad

No todas las vulnerabilidades identificadas tienen el mismo valor operacional. La priorización se basa en:

- **Severidad:** vulnerabilidades críticas o altas primero.
- **Explotabilidad:** vulnerabilidades con exploit disponible y condiciones cumplidas.
- **Accesibilidad:** vulnerabilidades en servicios directamente accesibles desde la posición del atacante.
- **Impacto:** vulnerabilidades que, si son explotadas, producen acceso significativo (ej. acceso root, lectura de datos sensibles, ejecución de código).

**Regla práctica:** en una evaluación con tiempo limitado, se priorizan vulnerabilidades remotas con puntuación CVSS alta y exploit conocido sobre vulnerabilidades locales o teóricas.

## 4. Etapa 3 — Investigación de contexto antes de explotar

Antes de ejecutar cualquier técnica de explotación, el analista debe:

### 4.1. Verificar el contexto técnico
- ¿La versión del servicio está confirmada?
- ¿Las condiciones del entorno permiten la explotación?
- ¿Existe algún control compensatorio activo que podría bloquear la técnica?

### 4.2. Inteligencia sobre el objetivo
- `resolve host` proporciona información de resolución DNS y reputación de la IP objetivo, útil para contextualizar el activo antes de intervenir.
- `trace ip` permite analizar el camino de red hacia el objetivo, identificar posibles filtros intermedios e interpretar la posición del activo dentro de la infraestructura.

### 4.3. Revisión del historial de sesión
- `history` permite revisar los comandos ejecutados en la sesión actual para evitar repeticiones innecesarias y mantener un registro mental del progreso.

## 5. Etapa 4 — Ejecución de la explotación

La ejecución se realiza según la naturaleza de la vulnerabilidad seleccionada. En el laboratorio, los comandos disponibles permiten simular técnicas de explotación representativas. El principio fundamental es:

> una acción a la vez, con verificación inmediata de resultado.

No se ejecutan múltiples técnicas simultáneamente sin verificar el resultado de la anterior. La ejecución en cascada sin verificación genera ambigüedad en los resultados y dificulta la documentación precisa del hallazgo.

### Consideraciones durante la ejecución:

- Mantener registro de cada comando ejecutado y su resultado.
- No escalar la intervención más allá del objetivo del ejercicio.
- Si una técnica no produce el resultado esperado, analizar la causa antes de intentar una alternativa.

## 6. Etapa 5 — Verificación del resultado

Una explotación no está completa hasta que el resultado está verificado con evidencia. La verificación puede incluir:

- Confirmación de acceso al sistema o recurso objetivo.
- Revisión de eventos generados tras la explotación (logs, alertas).
- Evidencia observable de que la vulnerabilidad fue explotada exitosamente.

La verificación tiene doble propósito: confirmar el resultado técnico y proporcionar evidencia reproducible para el informe.

**Error crítico:** declarar éxito en la explotación sin evidencia verificable. En una evaluación profesional, un hallazgo sin evidencia es un hallazgo cuestionable.

## 7. Etapa 6 — Documentación del hallazgo

La documentación es la etapa que transforma el trabajo técnico en valor profesional. Un hallazgo de explotación bien documentado incluye:

1. **Descripción de la vulnerabilidad:** qué es y dónde se encontró.
2. **Vector de explotación:** cómo se accedió a la vulnerabilidad.
3. **Evidencia:** capturas, salidas de terminal, logs.
4. **Impacto real:** qué acceso o daño fue posible lograr.
5. **Recomendación:** qué debe hacerse para remediar la vulnerabilidad.

En el laboratorio, el comando `export report` genera el reporte de cierre que consolida los datos de la sesión. Este reporte es el entregable final del Nivel 4.

## 8. Secuencia metodológica recomendada

```
show vulnerabilities        → identificar vulnerabilidades en el entorno
resolve host / trace ip     → contexto técnico del objetivo
[técnica de explotación]    → ejecución controlada según vulnerabilidad
show events                 → verificar evidencia generada
export report               → documentar el hallazgo
```

Esta secuencia no es rígida, pero refleja el flujo metodológico profesional que se espera en el laboratorio.

## 9. Diferencia entre metodología y procedimiento

La metodología es el marco conceptual: por qué hacer qué en qué orden. El procedimiento es la implementación concreta de esa metodología en el laboratorio. El Nivel 4 enseña ambos: comprensión del marco (metodología) y aplicación práctica (procedimiento en la sección correspondiente).

Un profesional que solo conoce el procedimiento puede ejecutar pasos en un contexto específico. Un profesional que comprende la metodología puede adaptarse a cualquier contexto nuevo con criterio técnico propio.
