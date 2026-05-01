# Nivel 1 — Metodología de Pentesting (proceso por fases)

## Visión general
El pentesting se ejecuta como un **proceso** con fases definidas, donde cada fase produce evidencia y reduce incertidumbre sobre el objetivo. La metodología correcta evita dos errores frecuentes: (i) ejecutar herramientas sin propósito (“tirar comandos”) y (ii) concluir vulnerabilidades sin evidencia verificable. En el contexto universitario, se espera que el estudiante pueda justificar qué hace en cada fase, qué evidencia obtiene y qué decisión toma a partir de esa evidencia.

> **Principio metodológico:** cada fase debe responder tres preguntas: **¿qué se busca?, ¿qué evidencia se espera?, ¿cuál es el criterio de término?**

---

## Fase 0 — Autorización, alcance y reglas de compromiso
### Qué se busca
Definir límites y condiciones del ejercicio: qué activos se pueden evaluar, qué técnicas están permitidas y qué evidencia es suficiente.

### Evidencia esperada
- Alcance (IPs, dominios, aplicaciones, rangos).
- Restricciones (horarios, límites de carga, técnicas prohibidas).
- Reglas de evidencia mínima (demostración controlada sin daño).
- Responsables y canal de comunicación.

### Checklist (mínimo)
- [ ] Alcance definido (objetivos y activos).
- [ ] Restricciones y prohibiciones establecidas (ej. DoS no permitido).
- [ ] Objetivo del pentest definido (red, web, infraestructura).
- [ ] Evidencia mínima acordada (capturas, salidas de comandos, logs).

### Criterio de término
No se inicia reconocimiento ni escaneo hasta que el alcance esté definido. En evaluación académica, omitir esta fase se considera un error conceptual grave.

---

## Fase 1 — Reconocimiento (recolección de información)
### Qué se busca
Obtener información inicial sin depender todavía de explotación: tecnologías, endpoints evidentes, dominios, estructura y huellas.

### Evidencia esperada
- Identificación de tecnologías (servidor web, framework).
- Descubrimiento de dominios/subdominios si aplica.
- Información pública relevante (headers, certificados, banners).

### Actividades típicas (ejemplos)
- Revisión de cabeceras HTTP y respuestas del servidor.
- Identificación de tecnologías expuestas.
- Observación de rutas públicas o recursos visibles.

### Checklist (mínimo)
- [ ] Se identificó si el objetivo es web/red/infra.
- [ ] Se identificaron tecnologías principales (si aplica).
- [ ] Se registró evidencia básica (captura o salida).

### Criterio de término
El reconocimiento termina cuando existe suficiente contexto para diseñar el escaneo/enumeración con hipótesis claras (por ejemplo: “hay HTTP y SSH expuestos; se prioriza enumeración web y hardening SSH”).

---

## Fase 2 — Enumeración y escaneo (superficie de ataque)
### Qué se busca
Descubrir puertos, servicios, versiones, rutas, endpoints o recursos que amplían la superficie de ataque.

### Evidencia esperada
- Puertos abiertos y servicios detectados.
- Versiones (cuando aplica) para análisis posterior.
- Endpoints/rutas relevantes en web.
- Usuarios, recursos o configuraciones expuestas (si aplica).

### Actividades típicas
- Escaneo de puertos (total o parcial según alcance).
- Detección de servicios y versiones.
- Enumeración de rutas web (si está permitido).
- Revisión de respuestas HTTP (códigos, headers).

### Checklist (mínimo)
- [ ] Se identificaron puertos/servicios principales.
- [ ] Se registró evidencia de salida (captura/salida guardada).
- [ ] Se priorizaron componentes según exposición e impacto.

### Criterio de término
La enumeración termina cuando se tiene un mapa básico de superficie: qué servicios existen, dónde están y cuáles son los puntos que justifican un análisis de vulnerabilidades. No debe continuar indefinidamente; se define un límite de tiempo y profundidad según alcance.

---

## Fase 3 — Análisis de vulnerabilidades (hipótesis y validación)
### Qué se busca
Convertir la superficie de ataque en hipótesis de vulnerabilidad: configuraciones inseguras, servicios desactualizados, controles débiles, fallos típicos (OWASP) y condiciones explotables.

### Evidencia esperada
- Versiones y configuraciones relacionadas a vulnerabilidades conocidas (CVE) o malas prácticas.
- Comportamientos inseguros observables (por ejemplo, endpoints sin autenticación).
- Evidencia reproducible (pasos y resultados consistentes).

### Enfoque académico recomendado
- Diferenciar “hallazgo” de “vulnerabilidad confirmada”.
- No afirmar vulnerabilidad solo por versión: se requiere condición explotable o evidencia adicional.
- Priorizar según impacto (CIA), exposición y probabilidad.

### Checklist (mínimo)
- [ ] Se generaron hipótesis (qué podría estar mal).
- [ ] Se validó al menos una hipótesis con evidencia reproducible.
- [ ] Se identificaron mitigaciones preliminares.

### Criterio de término
El análisis concluye cuando existe un conjunto de hallazgos priorizados con evidencia suficiente para justificar pruebas controladas (explotación) o recomendaciones directas si la explotación no está permitida.

---

## Fase 4 — Explotación controlada (demostración mínima de impacto)
### Qué se busca
Demostrar impacto sin causar daño. La explotación en pentesting universitario se entiende como una prueba limitada, no como compromiso total del sistema.

### Evidencia esperada
- Prueba controlada que demuestre impacto.
- Capturas/salidas que permitan replicar.
- Confirmación de alcance de la vulnerabilidad (qué permite y qué no).

### Principios de ejecución
- Mínima intervención: demostrar sin degradar disponibilidad.
- Reproducibilidad: pasos claros para repetir.
- Respeto al alcance: no avanzar fuera de lo permitido.

### Checklist (mínimo)
- [ ] Se ejecutó una prueba controlada dentro del alcance.
- [ ] Se registró evidencia del impacto.
- [ ] Se documentó mitigación concreta.

### Criterio de término
La explotación termina cuando el impacto queda demostrado con evidencia suficiente. No se persigue “máximo acceso”; se persigue evidencia mínima y responsable.

---

## Fase 5 — Reporte y recomendaciones (cierre académico)
### Qué se busca
Convertir lo observado en un documento técnico: hallazgo, evidencia, impacto, severidad y mitigación.

### Evidencia esperada
- Hallazgos redactados con estructura profesional.
- Evidencia adjunta o referenciada (capturas/salidas).
- Recomendaciones verificables (acciones concretas).

### Estructura mínima de un hallazgo (modelo)
- **Hallazgo:** qué se encontró.
- **Evidencia:** cómo se comprobó (comando, salida, captura).
- **Impacto:** qué permite (CIA).
- **Severidad:** alta/media/baja con justificación.
- **Mitigación:** cambio específico y medible.

### Checklist final (antes de “entregar”)
- [ ] El alcance está declarado en el reporte.
- [ ] Cada hallazgo tiene evidencia reproducible.
- [ ] Cada hallazgo tiene mitigación concreta.
- [ ] No hay conclusiones sin respaldo.

### Criterio de término
El reporte se considera completo cuando permite a un tercero replicar la evidencia y comprender el impacto sin ejecutar pruebas destructivas.

---

## Errores metodológicos frecuentes (alerta académica)
- Saltar el alcance y comenzar escaneo sin reglas.
- Confundir enumeración con explotación.
- Declarar vulnerabilidad sin evidencia reproducible.
- No priorizar (todo “alto” sin justificación).
- Reporte sin mitigaciones concretas.

---

## Mini-evaluación (control de dominio)
1) ¿Qué incluye el “alcance” y por qué se define antes del reconocimiento?  
2) ¿Qué diferencia hay entre enumeración y análisis de vulnerabilidades?  
3) ¿Por qué una versión detectada no confirma automáticamente una vulnerabilidad?  
4) ¿Qué significa “explotación controlada” y cuál es su evidencia mínima?  
5) ¿Qué elementos no pueden faltar en un hallazgo del reporte?