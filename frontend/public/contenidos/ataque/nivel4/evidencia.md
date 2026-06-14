# Nivel 4 — Evidencia en explotación

## 1. Por qué la evidencia es central en este nivel

En fases anteriores, la evidencia servía principalmente para confirmar la presencia de actividad en el entorno: hosts activos, servicios respondiendo, tráfico observable. En el Nivel 4, la evidencia cumple un rol adicional y más exigente: **demostrar que una vulnerabilidad fue explotada** y **cuantificar el impacto real** de esa explotación.

Un hallazgo de explotación sin evidencia es un hallazgo cuestionable. En el contexto de una evaluación de seguridad profesional, el cliente necesita ver no solo que "el sistema era vulnerable", sino que la vulnerabilidad fue efectivamente aprovechada y que el impacto fue concreto y verificable. Esa demostración se realiza mediante evidencia.

## 2. Tipos de evidencia en explotación

### 2.1. Evidencia de identificación

Es la evidencia que demuestra que la vulnerabilidad fue identificada en el entorno:

- Salida de `show vulnerabilities` con la vulnerabilidad listada.
- Información de servicio afectado obtenida en enumeración previa.
- Versión del software vulnerable confirmada durante el escaneo.

### 2.2. Evidencia de ejecución

Es la evidencia de que la técnica de explotación fue aplicada:

- Registro del comando de explotación ejecutado y su salida.
- Eventos generados en el sistema como respuesta a la técnica (visibles en `show events`).
- Alertas activadas por el sistema de detección del objetivo (visibles en `show alerts`).

### 2.3. Evidencia de resultado

Es la evidencia de que la explotación produjo el efecto esperado:

- Acceso obtenido al sistema o recurso objetivo.
- Datos recuperados del sistema comprometido.
- Cambio de estado confirmado en el entorno (por ejemplo, nuevo usuario, archivo modificado, servicio alterado).

### 2.4. Evidencia de impacto

Es la evidencia que permite cuantificar qué tan grave fue la explotación:

- Nivel de privilegios obtenido.
- Alcance del acceso: datos a los que fue posible acceder, sistemas accesibles desde el punto de compromiso.
- Capacidad de persistencia o movimiento lateral desde el acceso obtenido.

## 3. Cómo recopilar evidencia en el laboratorio

### 3.1. Durante la ejecución

El laboratorio registra automáticamente todos los comandos ejecutados en la sesión. Sin embargo, el analista debe asegurarse de revisar y retener las salidas más relevantes:

- Resultado completo de `show vulnerabilities` (qué se identificó).
- Resultado de `show events` post-explotación (qué actividad generó).
- Resultado de `show alerts` (cómo respondió el sistema).

### 3.2. Al cierre de la sesión

El comando `export report` genera el reporte de cierre que consolida la evidencia de la sesión. Este reporte es la evidencia documental final del análisis.

## 4. Calidad de la evidencia

No toda evidencia tiene el mismo valor en una evaluación profesional. Se considera evidencia de alta calidad cuando:

- **Es específica:** hace referencia concreta a la vulnerabilidad, el servicio y la técnica utilizados.
- **Es reproducible:** otro analista puede seguir el mismo procedimiento y obtener el mismo resultado.
- **Es trazable:** existe un registro de cuándo y cómo se obtuvo.
- **Es coherente:** la evidencia de identificación, ejecución y resultado es consistente entre sí.

Se considera evidencia de baja calidad cuando es ambigua, no específica, o no puede relacionarse directamente con la técnica aplicada.

## 5. Evidencia y detección: una relación estratégica

Un aspecto frecuentemente subestimado en explotación es la relación entre evidencia y detección. Cuando un sistema genera alertas durante una explotación, esas alertas son a la vez:

- **Evidencia de detección:** el sistema defensivo identificó la actividad.
- **Hallazgo adicional:** la capacidad de detección del sistema es un dato relevante para el informe.

En una evaluación profesional, tanto la explotación exitosa como la detección exitosa del sistema son hallazgos valiosos. El analista ofensivo debe reportar ambos.

## 6. Errores comunes en recopilación de evidencia

- **No revisar eventos después de la explotación:** el analista asume que la técnica funcionó sin verificar con `show events`.
- **Exportar el reporte antes de completar la explotación:** el reporte queda sin la evidencia de resultado más importante.
- **No relacionar vulnerabilidad con evidencia:** el reporte menciona la vulnerabilidad pero no incluye evidencia de que fue explotada efectivamente.
- **Confundir evidencia de presencia con evidencia de impacto:** detectar que un servicio es vulnerable no equivale a demostrar que fue explotado.
