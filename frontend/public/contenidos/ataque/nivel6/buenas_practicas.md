# Nivel 6 — Buenas prácticas en análisis multi-vector

## 1. Completar el triage antes de actuar

En incidentes con múltiples vectores, la presión por responder rápidamente puede llevar a actuar sobre el primer vector visible sin saber qué más está ocurriendo. La buena práctica es completar siempre el triage inicial antes de tomar cualquier acción de respuesta.

El triage toma segundos (tres comandos) y puede evitar respuestas incompletas o contraproducentes.

## 2. Usar nombres de variables para IPs al documentar

Al analizar múltiples IPs, referirse a ellas como "Vector A" y "Vector B" en el análisis hace el trabajo más claro que repetir las IPs numéricas constantemente. En el reporte final, se incluyen las IPs específicas, pero durante el análisis es más efectivo trabajar con referencias descriptivas.

## 3. Registrar la hipótesis de correlación antes de confirmarla

Antes de ejecutar los comandos de verificación, escribe (mentalmente o en borrador) tu hipótesis de correlación. Luego ejecuta los comandos y evalúa si la evidencia la confirma o la refuta. Esto evita el sesgo de confirmación en el análisis.

## 4. Bloquear en orden de severidad

Si hay dos vectores maliciosos, bloquea primero el de mayor severidad o el que está más avanzado en su progresión. Esto minimiza el daño potencial mientras se completa la contención.

## 5. Verificar cada bloqueo antes del siguiente

Después de cada `block ip`, ejecuta `show blocked` para confirmar que el bloqueo se aplicó antes de proceder con el siguiente. Esto evita llegar al final del proceso y descubrir que un bloqueo falló silenciosamente.

## 6. Documentar también los falsos positivos

En el reporte, documentar qué IPs se analizaron y se descartaron (y por qué) demuestra que el análisis fue exhaustivo y reduce el riesgo de que alguien cuestione si hubo IPs maliciosas no detectadas.

## 7. El reporte es el producto final

En el Nivel 6, la capacidad técnica de detectar y bloquear múltiples vectores es solo el 50% del trabajo. El reporte que comunica lo que se encontró, cómo se correlacionó y qué impacto tendría en producción es la otra mitad. Un analista que detecta correctamente pero no puede comunicar sus hallazgos es menos valioso que uno que hace ambas cosas.

## 8. Evaluar el impacto combinado, no solo por vector

Un ataque de dos vectores puede ser sinérgico: el daño combinado puede ser mayor que la suma de los vectores individuales. Por ejemplo, un vector de reconocimiento que alimenta a un vector de explotación multiplica el impacto. El reporte debe reflejar esta realidad.
