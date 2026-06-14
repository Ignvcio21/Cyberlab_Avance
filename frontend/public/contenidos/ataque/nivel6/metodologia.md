# Nivel 6 — Metodología para análisis multi-vector

## 1. Principio central: correlación antes que reacción

En escenarios simples, la respuesta rápida a una alerta suele ser efectiva. En escenarios multi-vector, la reacción inmediata a la primera alerta visible puede ser exactamente lo que el atacante busca provocar. El principio central del Nivel 6 es:

> correlacionar primero, actuar después.

Este principio no implica demora innecesaria, sino que las acciones de respuesta deben basarse en una comprensión al menos parcial del panorama completo antes de comprometerse con una línea de acción.

## 2. Etapa 1 — Triage inicial del escenario

Al comenzar el análisis, el primer paso es obtener una visión de alto nivel de lo que está ocurriendo:

```
show alerts        → ¿cuántas alertas hay? ¿de qué tipo? ¿de qué origen?
show events        → ¿cuántos eventos hay? ¿de cuántas IPs distintas?
show traffic       → ¿cuántos flujos de tráfico hay? ¿qué protocolos?
```

El triage no busca analizar cada elemento en detalle. Busca responder: ¿cuántos vectores distintos parecen estar activos y cuál es la magnitud de cada uno?

## 3. Etapa 2 — Separación de vectores

Con el triage hecho, el analista separa mentalmente los vectores:

- ¿Cuántas IPs distintas generan actividad sospechosa?
- ¿Qué tipo de actividad genera cada una?
- ¿Hay actividad que no puede atribuirse a ninguna de estas IPs (es decir, parece legítima)?

En CyberLab, `resolve host` y `trace ip` ayudan a caracterizar cada IP y determinar si corresponde a un vector malicioso real o a tráfico de fondo.

## 4. Etapa 3 — Análisis por vector

Una vez separados los vectores, analiza cada uno individualmente antes de correlacionarlos:

**Para cada vector:**
- ¿Qué técnicas está usando (escaneo, fuerza bruta, explotación)?
- ¿Qué servicios o hosts está atacando?
- ¿En qué fase del ciclo de ataque parece estar (reconocimiento, explotación, post-explotación)?

## 5. Etapa 4 — Correlación inter-vector

Con cada vector analizado individualmente, busca relaciones entre ellos:

- ¿Ambos vectores atacan el mismo objetivo final?
- ¿Uno de los vectores está habilitando al otro (reconocimiento → explotación)?
- ¿Hay coordinación temporal visible (se intensifican al mismo tiempo)?
- ¿Uno parece diseñado para distraer mientras el otro opera silenciosamente?

La respuesta a estas preguntas define si el incidente es coordinado o coincidente, y cuál es el vector principal.

## 6. Etapa 5 — Identificar y bloquear los vectores maliciosos

Una vez que has identificado con certeza qué IPs corresponden a actividad maliciosa real:

```
block ip <ip-maliciosa-1>
block ip <ip-maliciosa-2>
show blocked         → verificar que ambas quedaron bloqueadas
```

En el Nivel 6, el bloqueo debe ser preciso: solo las IPs maliciosas confirmadas. Bloquear IPs legítimas por error en un escenario de producción tendría consecuencias operacionales.

## 7. Etapa 6 — Verificación post-bloqueo

Después del bloqueo, verifica que la actividad maliciosa cesó:

```
show alerts        → ¿siguen generándose alertas de esas IPs?
show events        → ¿hay eventos nuevos de las IPs bloqueadas?
```

Si continúan los eventos después del bloqueo, puede indicar que hay un tercer vector no identificado o que el bloqueo no se aplicó correctamente.

## 8. Etapa 7 — Documentación del incidente multi-vector

El reporte debe estructurarse diferente a los niveles anteriores:

1. **Resumen ejecutivo:** descripción del incidente en términos de vectores, impacto y resolución.
2. **Análisis por vector:** descripción técnica detallada de cada vector identificado.
3. **Correlación:** relación entre los vectores y conclusión sobre si fueron coordinados.
4. **Impacto combinado:** evaluación del daño potencial considerando todos los vectores activos.
5. **Acciones tomadas:** qué se hizo para contener cada vector.
6. **Recomendaciones:** qué cambios evitarían este tipo de incidente en el futuro.

```
export report
```
