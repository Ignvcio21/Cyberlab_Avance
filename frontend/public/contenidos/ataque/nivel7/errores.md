# Nivel 7 — Errores frecuentes en pentest completo

## 1. Error 1 — No planificar antes de ejecutar

**Descripción:** el estudiante abre la sesión y ejecuta el primer comando que recuerda de niveles anteriores, sin definir objetivos ni orden de fases.

**Consecuencias:** la operación se vuelve reactiva en vez de estratégica. El estudiante puede terminar habiendo ejecutado muchos comandos pero sin una narrativa coherente del incidente.

**Corrección:** antes de ejecutar cualquier comando, definir el objetivo, el alcance y el orden de las fases.

---

## 2. Error 2 — Olvidar el reconocimiento panorámico

**Descripción:** el estudiante va directamente al análisis en profundidad sin haber completado primero el panorama general.

**Consecuencias:** puede perder tiempo analizando un vector de baja prioridad mientras uno de alta prioridad pasa desapercibido.

**Corrección:** siempre ejecutar los cuatro comandos de reconocimiento panorámico (`show hosts`, `show events`, `show alerts`, `show traffic`) antes de profundizar en cualquier vector.

---

## 3. Error 3 — Reportar sin estructura profesional

**Descripción:** el reporte describe lo que el estudiante hizo cronológicamente en vez de organizar los hallazgos por relevancia para el cliente.

**Consecuencias:** un cliente que recibe un reporte cronológico obtiene un diario de la operación, no un documento accionable. No sabe qué remediar primero ni qué impacto tiene cada hallazgo.

**Corrección:** estructurar el reporte por hallazgos, no por cronología. Cada hallazgo debe tener severidad, evidencia, impacto y recomendación.

---

## 4. Error 4 — No verificar que la contención es efectiva

**Descripción:** el estudiante bloquea las IPs maliciosas y cierra la sesión sin verificar que la actividad maliciosa cesó.

**Consecuencias:** el incidente puede seguir activo si el bloqueo no funcionó o si hay vectores adicionales no identificados.

**Corrección:** siempre ejecutar `show alerts` y `show events` después del bloqueo antes de considerar la operación completa.

---

## 5. Error 5 — Sobrextender el alcance

**Descripción:** el estudiante detecta una IP o sistema interesante fuera del alcance definido y comienza a analizarlo.

**Consecuencias:** en un pentest real, operar fuera del alcance puede tener consecuencias legales y contractuales. En el laboratorio, es un indicador de falta de disciplina profesional.

**Corrección:** registrar el hallazgo fuera de alcance y documentarlo en el reporte como "hallazgo fuera de alcance, requiere autorización adicional para investigar". No analizarlo.

---

## 6. Error 6 — Ignorar vectores de menor severidad

**Descripción:** el estudiante se concentra en el vector de mayor severidad e ignora los de menor severidad hasta que el principal está resuelto.

**Consecuencias:** los vectores de menor severidad pueden estar coordinados con el principal o pueden escalar en severidad mientras el estudiante no los mira.

**Corrección:** el triage inicial debe dar visibilidad de todos los vectores. La priorización no significa ignorar los secundarios, sino abordarlos después del principal, no nunca.

---

## 7. Error 7 — Reporte sin recomendaciones de remediación

**Descripción:** el reporte documenta los hallazgos pero no incluye qué hacer para remediarlos.

**Consecuencias:** el cliente sabe qué problema tiene pero no cómo resolverlo. Un reporte de pentest sin recomendaciones tiene la mitad de valor.

**Corrección:** para cada hallazgo, incluir al menos una recomendación concreta de remediación. Las recomendaciones genéricas ("mejorar la seguridad") no son útiles; las específicas ("bloquear el puerto 445 en el firewall perimetral") sí.
