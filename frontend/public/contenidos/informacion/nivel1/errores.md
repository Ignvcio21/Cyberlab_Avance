# Nivel 1 — Errores comunes (anti-patrones) y correcciones

## Cómo usar esta sección
Esta pestaña no se plantea como teoría lineal, sino como un catálogo de **anti-patrones**. Un anti-patrón es un error recurrente que aparece cuando se ejecutan actividades de pentesting o análisis defensivo sin método. En evaluación universitaria, estos errores suelen penalizarse porque indican ausencia de criterio, falta de evidencia o procedimiento incompleto. Cada anti-patrón se presenta con: **síntoma observable**, **causa probable**, **corrección** y **evidencia mínima** para demostrar que se corrigió.

> **Regla práctica:** si un paso no deja evidencia verificable, es como si no hubiera ocurrido.

---

## Anti-patrón 1 — Ejecutar acciones sin definir alcance
**Error:** comenzar a escanear/probar sin declarar qué está permitido.  
**Síntoma:** el estudiante “hace cosas” sin poder explicar límites del ejercicio.  
**Causa probable:** confusión entre laboratorio y entorno real; falta de preparación metodológica.  
**Corrección:** declarar alcance en una frase antes de iniciar: objetivo, activos, limitaciones y evidencia mínima.  
**Evidencia mínima:** una nota escrita (en reporte) con alcance y reglas del ejercicio.

---

## Anti-patrón 2 — “Tirar comandos” sin fase ni propósito
**Error:** usar herramientas o comandos sin justificar qué fase del proceso se está ejecutando.  
**Síntoma:** el estudiante no puede responder “¿por qué ejecutaste eso?” y solo dice “porque había que hacerlo”.  
**Causa probable:** aprendizaje por receta, no por metodología.  
**Corrección:** asociar cada comando a una fase y a una evidencia esperada (reconocimiento, enumeración, análisis).  
**Evidencia mínima:** explicación breve en reporte: comando → fase → evidencia → decisión.

---

## Anti-patrón 3 — Confundir “señal” con “evidencia”
**Error:** asumir que una alerta o mensaje del sistema “prueba” el incidente.  
**Síntoma:** se aplica contención sin revisar registros/eventos.  
**Causa probable:** desconocimiento de jerarquía de información (alerta vs evento).  
**Corrección:** usar alerta como orientación y confirmar con evidencia primaria (eventos/logs).  
**Evidencia mínima:** captura/salida de eventos donde se observe origen y patrón.

---

## Anti-patrón 4 — Concluir con un solo dato (sin patrón)
**Error:** inferir ataque o vulnerabilidad a partir de un evento aislado.  
**Síntoma:** afirmaciones del tipo “es ataque” sin describir repetición/frecuencia/origen.  
**Causa probable:** falta de criterio estadístico y de análisis relacional.  
**Corrección:** describir patrón: origen + repetición + ventana temporal + coherencia con el caso.  
**Evidencia mínima:** evidencia de múltiples registros relacionados (no solo uno).

---

## Anti-patrón 5 — Bloquear antes de analizar
**Error:** aplicar bloqueo/contención como primera reacción.  
**Síntoma:** bloqueo de IP sin identificación clara del origen real.  
**Causa probable:** enfoque reactivo; confusión entre “responder rápido” y “responder correcto”.  
**Corrección:** seguir secuencia mínima: señal → evidencia → decisión → verificación.  
**Evidencia mínima:** registro de consulta de evidencia previo al bloqueo.

---

## Anti-patrón 6 — Bloquear la IP equivocada
**Error:** aplicar contención sobre una IP que no corresponde al origen del patrón.  
**Síntoma:** el incidente no se “resuelve” o el estado no cambia como se espera.  
**Causa probable:** lectura apresurada de evidencias; error de copia; confusión de campos.  
**Corrección:** volver a evidencia primaria, confirmar origen, revertir bloqueo erróneo y aplicar el correcto.  
**Evidencia mínima:** (i) evidencia original del origen, (ii) listado de bloqueadas con IP correcta.

---

## Anti-patrón 7 — Omitir verificación (respuesta incompleta)
**Error:** asumir que la contención funcionó sin comprobarlo.  
**Síntoma:** no existe evidencia de resultado; solo “se ejecutó el comando”.  
**Causa probable:** desconocimiento del principio de control de cambios.  
**Corrección:** verificar estado posterior inmediatamente después de la acción (por ejemplo, listar bloqueadas).  
**Evidencia mínima:** captura/salida de verificación mostrando el cambio de estado.

---

## Anti-patrón 8 — No documentar evidencia reproducible
**Error:** reportar conclusiones sin salida de herramientas, capturas o pasos reproducibles.  
**Síntoma:** el informe dice “se detectó X”, pero no muestra cómo se comprobó.  
**Causa probable:** enfoque narrativo sin soporte técnico.  
**Corrección:** incluir siempre evidencia mínima: comando + salida relevante + interpretación.  
**Evidencia mínima:** extracto de salida o captura que un tercero pueda validar.

---

## Anti-patrón 9 — Confundir “puerto abierto” con “vulnerabilidad”
**Error:** afirmar que un puerto abierto “es una vulnerabilidad”.  
**Síntoma:** hallazgos que indican “puerto 80 abierto → vulnerable” sin análisis adicional.  
**Causa probable:** falta de distinción entre superficie y debilidad.  
**Corrección:** tratar puerto abierto como **superficie** y luego evaluar: versión, configuración, autenticación, OWASP.  
**Evidencia mínima:** análisis adicional (headers, versiones, pruebas controladas) antes de concluir.

---

## Anti-patrón 10 — Declarar severidad sin criterios
**Error:** marcar todo como “alto” sin justificar.  
**Síntoma:** severidades arbitrarias y no comparables.  
**Causa probable:** desconocimiento de criterios de impacto/probabilidad.  
**Corrección:** justificar severidad con CIA (confidencialidad, integridad, disponibilidad), exposición y facilidad de explotación.  
**Evidencia mínima:** justificación breve por hallazgo: impacto + exposición + probabilidad.

---

## Anti-patrón 11 — Explotación excesiva (fuera de alcance o innecesaria)
**Error:** intentar demostrar “máximo acceso” sin necesidad y sin autorización.  
**Síntoma:** acciones que van más allá de la evidencia mínima requerida.  
**Causa probable:** confusión entre aprendizaje y demostración de habilidad ofensiva.  
**Corrección:** aplicar principio de mínima intervención: demostrar impacto con prueba controlada y detenerse.  
**Evidencia mínima:** prueba mínima (por ejemplo, lectura controlada) + recomendación de mitigación.

---

## Anti-patrón 12 — Lenguaje subjetivo en evaluación oral
**Error:** usar frases vagas (“se veía raro”, “parece ataque”).  
**Síntoma:** imposibilidad de defender decisiones ante preguntas técnicas.  
**Causa probable:** falta de estructura de explicación.  
**Corrección:** usar plantilla formal: señal → evidencia → patrón → decisión → verificación → cierre.  
**Evidencia mínima:** explicación escrita en reporte o narración técnica breve.

---

## Lista rápida de correcciones (para aplicar en el momento)
- Si no hay evidencia, **no concluyas**.
- Si hay señal, busca evidencia primaria antes de contener.
- Si contuviste, **verifica**.
- Si concluyes, **documenta** (comando + salida + interpretación).
- Si asignas severidad, **justifica** (impacto + exposición + probabilidad).

---

## Mini-evaluación
1) ¿Por qué “bloquear sin ver eventos” es un error metodológico?  
2) ¿Qué evidencia mínima debe existir para justificar contención?  
3) ¿Por qué un puerto abierto no es automáticamente vulnerabilidad?  
4) ¿Qué significa “verificación” y qué aporta en auditoría?  
5) Escriba una explicación de 5 líneas usando la plantilla: señal → evidencia → patrón → decisión → verificación.