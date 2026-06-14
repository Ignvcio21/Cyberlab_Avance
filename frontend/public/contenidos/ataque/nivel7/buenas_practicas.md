# Nivel 7 — Buenas prácticas del pentest completo

## 1. Definir el éxito antes de empezar

Un pentest sin criterio de completitud puede extenderse indefinidamente o terminar antes de tiempo. Define al inicio qué constituye un resultado completo y exitoso: qué evidencia mínima necesitas, qué estado debe tener el sistema al finalizar.

## 2. Tratar el historial como una herramienta de control

El comando `history` no es solo documentación: es una herramienta de control durante la operación. Revisarlo periódicamente permite detectar si estás repitiendo pasos, si te estás desviando del plan o si falta alguna fase por completar.

## 3. Un comando, una decisión

Cada comando debe responder a una pregunta específica. "Ejecuto `show events` porque quiero ver si hay nuevos eventos de la IP que acabo de bloquear" es correcto. "Ejecuto `show events` porque sé que debo usarlo" no es. La reflexión antes del comando es parte de la metodología.

## 4. Separar el análisis del reporte

Durante la operación, el foco es el análisis técnico. El reporte se elabora al final, cuando el análisis está completo. Intentar redactar el reporte mientras se analiza fragmenta la atención y produce peores resultados en ambas tareas.

## 5. Incluir severidad explícita en cada hallazgo

Sin clasificación de severidad, el cliente no sabe qué priorizar. Usa una escala consistente:

- **Crítico:** explotación activa con impacto inmediato sobre sistemas críticos.
- **Alto:** vulnerabilidad explotable con alto impacto potencial.
- **Medio:** vulnerabilidad explotable con impacto moderado o requiere condiciones adicionales.
- **Bajo:** vulnerabilidad de bajo impacto o muy difícil de explotar.

## 6. Las recomendaciones deben ser implementables

Una buena recomendación de remediación es específica, implementable y proporcional al impacto del hallazgo. "Actualizar el sistema operativo" es demasiado genérico. "Aplicar el parche CVE-XXXX-YYYY en el servidor web antes del próximo ciclo de parcheo" es útil.

## 7. El reporte ejecutivo es tan importante como el técnico

El pentest produce dos audiencias: técnicos que necesitan reproducir y remediar los hallazgos, y directivos que necesitan entender el riesgo del negocio. El resumen ejecutivo es para los segundos: sin jerga, sin comandos, en lenguaje de impacto y riesgo. Si el resumen ejecutivo no puede entenderse sin conocimientos técnicos, hay que reescribirlo.

## 8. Reconocer los límites del alcance como práctica ética

Un analista profesional no cruza el alcance aunque técnicamente pueda. Documenta lo que encontró fuera de alcance y lo escala para autorización adicional. Este comportamiento no es una limitación: es un indicador de madurez profesional y es exactamente lo que un cliente real espera de un pentester.

## 9. Mantener el plan actualizado ante hallazgos inesperados

Si el reconocimiento revela algo no esperado (un vector adicional, un sistema no inventariado), actualiza el plan mentalmente y documenta el cambio en el reporte. Un buen pentest adapta su metodología a la realidad del entorno; un mal pentest ignora lo que no encajaba en el plan original.
