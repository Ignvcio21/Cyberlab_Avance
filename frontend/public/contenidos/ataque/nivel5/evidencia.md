# Nivel 5 — Evidencia en post-explotación

## 1. La evidencia en post-explotación es la más valiosa del ciclo

En fases anteriores, la evidencia demostraba que una vulnerabilidad existía o podía ser explotada. En post-explotación, la evidencia debe demostrar cuánto daño real fue posible producir a partir de ese acceso. Esta es la evidencia que responde la pregunta más importante para el cliente: ¿qué tan grave es este compromiso?

## 2. Tipos de evidencia en post-explotación

### 2.1. Evidencia de alcance de acceso
- Listado de hosts accesibles desde el punto de compromiso (`show hosts`).
- Sesiones activas identificadas desde el acceso obtenido (`show sessions`).
- Tráfico interno observable desde la posición comprometida (`show traffic`).

### 2.2. Evidencia de escalada de privilegios
- Vulnerabilidades locales identificadas que permiten escalada (`show vulnerabilities`).
- Si se ejecutó escalada: evidencia del privilegio obtenido antes y después.

### 2.3. Evidencia de movimiento lateral
- Hosts accesibles desde el sistema comprometido con sus servicios.
- Cualquier credencial, token o configuración de confianza identificada.

### 2.4. Evidencia de exposición de datos
- Descripción de qué datos sensibles son accesibles desde el acceso obtenido.
- Clasificación de esos datos por sensibilidad.

### 2.5. Evidencia de detección (o ausencia de ella)
- Alertas generadas durante la post-explotación (`show alerts`).
- Eventos registrados por el sistema (`show events`).
- Acciones que no generaron alertas (documentadas como hallazgo negativo relevante).

## 3. Evidencia de impacto en CIA

Para cada dimensión del modelo CIA, la evidencia debe ser específica:

**Confidencialidad:** ¿a qué datos específicos fue posible acceder? Nombrar el tipo de dato, no solo afirmar que "había datos".

**Integridad:** ¿qué configuraciones o datos podrían haberse modificado? ¿El sistema tiene logs que registran cambios?

**Disponibilidad:** ¿qué servicios podrían haberse interrumpido desde el acceso obtenido?

## 4. Calidad de evidencia en post-explotación

La evidencia de alta calidad en post-explotación permite que el cliente entienda concretamente el riesgo. Frases vagas como "pudimos movernos lateralmente" no son suficientes. La evidencia debe especificar: a qué hosts, mediante qué mecanismo, con qué nivel de acceso y qué datos estaban disponibles desde ahí.
