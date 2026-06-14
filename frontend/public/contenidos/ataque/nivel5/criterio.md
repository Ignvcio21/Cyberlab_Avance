# Nivel 5 — Criterio de evaluación

## 1. Qué se evalúa en el Nivel 5

El Nivel 5 evalúa la capacidad del estudiante para analizar el alcance completo de un compromiso: mapear el entorno interno, calcular el radio de explosión, evaluar la respuesta defensiva y documentar el impacto real con evidencia específica.

## 2. Criterios técnicos

### 2.1. Mapeo del entorno interno
- `show sessions` ejecutado y sesiones analizadas.
- `show hosts` ejecutado y radio de explosión evaluado.
- `show traffic` analizado y correlacionado con hosts identificados.

### 2.2. Análisis de autenticación y escalada
- `show failed logins` revisado.
- `show vulnerabilities` ejecutado para identificar vectores de escalada local.

### 2.3. Evaluación de detección
- `show alerts` ejecutado después de acciones de post-explotación.
- `show events` revisado para verificar evidencia.
- Análisis de qué fue detectado y qué no, documentado como hallazgo.

### 2.4. Documentación de impacto
- Impacto en CIA evaluado con evidencia específica.
- Radio de explosión cuantificado (número de hosts accesibles, tipo de acceso).
- `export report` ejecutado con el análisis completo.

## 3. Niveles de desempeño

### Desempeño mínimo aprobatorio
- `show sessions`, `show hosts` y `show traffic` ejecutados.
- Al menos una evaluación de escalada o movimiento lateral documentada.
- `export report` generado.

### Desempeño satisfactorio
- Todos los criterios técnicos completados.
- Radio de explosión calculado y documentado.
- Análisis de detección incluido en el reporte.
- Impacto en CIA evaluado.

### Desempeño destacado
- Todo lo anterior más análisis profundo de las implicaciones de negocio.
- Documentación de acciones que no fueron detectadas como hallazgo crítico.
- Recomendaciones de remediación específicas y priorizadas para cada hallazgo.
- Capacidad de explicar oralmente el alcance completo del compromiso y su impacto real.

## 4. Autoevaluación previa a la entrega

- [ ] ¿Mapeaste las sesiones activas y los hosts accesibles internamente?
- [ ] ¿Analizaste el tráfico interno?
- [ ] ¿Evaluaste vectores de escalada de privilegios?
- [ ] ¿Verificaste qué acciones fueron detectadas?
- [ ] ¿Calculaste el radio de explosión del compromiso?
- [ ] ¿Evaluaste el impacto en confidencialidad, integridad y disponibilidad?
- [ ] ¿El reporte refleja el análisis completo con evidencia específica?
