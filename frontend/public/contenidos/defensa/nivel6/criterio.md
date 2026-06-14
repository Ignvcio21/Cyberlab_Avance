# Nivel 6 — Criterio de evaluación

## 1. Descripción del nivel

El Nivel 6 evalúa la capacidad del estudiante para detectar, caracterizar y responder a múltiples vectores de ataque simultáneos, manteniendo una visión sistémica del incidente y priorizando las respuestas correctamente.

---

## 2. Criterios de evaluación

### 2.1. Triage inicial completo (20%)
- Ejecutó los comandos de triage antes de actuar sobre ningún vector.
- Identificó correctamente el número de vectores activos.
- No actuó sobre el primer vector sin haber completado el triage.

### 2.2. Caracterización de cada vector (20%)
- Identificó tipo, fase y severidad de cada vector.
- Determinó cuáles vectores tenían acceso activo y cuáles solo intentaban acceso.
- Clasificó los vectores por prioridad de respuesta.

### 2.3. Correlación inter-vector (20%)
- Analizó si los vectores son coordinados o independientes.
- Identificó el vector principal y el secundario (si aplica).
- Evaluó el impacto combinado del incidente.

### 2.4. Respuesta y verificación (25%)
- Bloqueó todas las IPs maliciosas identificadas.
- El orden de bloqueo fue coherente con la prioridad de severidad.
- Verificó cada bloqueo con `iptables -L INPUT -n`.
- Verificó que toda la actividad maliciosa cesó post-bloqueo.

### 2.5. Estado del sistema post-respuesta (15%)
- Verificó si hay procesos anómalos o servicios no autorizados activos post-bloqueo.
- Identificó si el incidente está completamente resuelto o hay riesgos residuales.

---

## 3. Indicadores de desempeño destacado

- Identificó el vector de distracción vs. el vector principal.
- La correlación inter-vector está documentada con evidencia explícita.
- Detectó indicadores de compromiso persistente (backdoor) después de los bloqueos.

## 4. Indicadores de desempeño insuficiente

- Trató el escenario como de vector único.
- No completó el triage antes de actuar.
- Bloqueó en orden incorrecto (menor severidad antes que mayor).
- No verificó la contención de todos los vectores.

---

## 5. Nota mínima de aprobación

Se requiere identificar todos los vectores activos, bloquear todas las IPs maliciosas con verificación y confirmar el cese de actividad de todos los vectores para aprobar el nivel.
