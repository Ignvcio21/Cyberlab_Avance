# Nivel 7 — Buenas prácticas de la operación completa de SOC

## 1. Definir el criterio de completitud antes de comenzar

Una operación sin criterio de completitud puede terminar antes de tiempo (incidente sin resolver) o extenderse innecesariamente. Definir al inicio: ¿qué tiene que ser verdad para que esta operación esté completa? Típicamente: todos los vectores identificados y contenidos, actividad maliciosa cesada, reporte generado.

## 2. El triage es sagrado

Nunca saltarse el triage panorámico, sin importar cuánta urgencia haya. El triage dura tres minutos y puede evitar que un segundo vector pase desapercibido mientras el analista está ocupado con el primero.

## 3. Construir la narrativa del incidente mientras se analiza

No dejar la narración para el reporte final. Mientras se analiza, ir construyendo mentalmente (o en borrador) la narrativa: qué pasó, cuándo, quién, con qué objetivo. La narrativa clara facilita enormemente la escritura del reporte y asegura que los hallazgos se integran de forma coherente.

## 4. El resumen ejecutivo se escribe al final, en lenguaje simple

El resumen ejecutivo es el primer elemento del reporte pero el último en escribirse. Necesita conocimiento completo del incidente para describir el impacto correctamente. Escribirlo en lenguaje simple: sin siglas no explicadas, sin comandos, en términos de riesgo y consecuencias.

## 5. Las recomendaciones deben ser específicas y accionables

Una recomendación de remediación vaga ("mejorar la seguridad") no es útil. Una específica ("implementar fail2ban con umbral de 5 intentos fallidos por minuto y bloqueo de 24 horas") puede implementarse directamente.

## 6. Verificar el sistema dos veces: antes y después de la respuesta

Antes de la respuesta: ¿cuál es el estado del sistema? Después de la respuesta: ¿el estado cambió de la forma esperada? Comparar ambos estados es la forma más clara de demostrar que la respuesta fue efectiva.

## 7. El reporte es un producto profesional

El reporte del Nivel 7 debe poder entregarse a un cliente real. Esto significa: sin errores de redacción, con estructura clara, con evidencia específica y con recomendaciones útiles. Un reporte descuidado mina la credibilidad del análisis, incluso si el análisis técnico fue correcto.

## 8. Documentar lo que no se encontró

"Se verificó que no hay procesos maliciosos activos ni servicios no autorizados en escucha" es una conclusión valiosa. Documenta que el análisis fue exhaustivo y que el compromiso no se extendió más allá de lo documentado.

## 9. Auditar el propio proceso al finalizar

Antes de entregar el reporte, revisar: ¿cubrí todos los vectores? ¿Mis bloqueos tienen evidencia suficiente? ¿El reporte es coherente con lo que hice? Esta auto-auditoría tarda poco y puede detectar omisiones importantes.
