# Nivel 7 — Operación completa de SOC: del incidente al reporte

## 1. El nivel de integración

El Nivel 7 es el nivel de integración final de la trayectoria defensiva de CyberLab. No introduce comandos nuevos ni técnicas desconocidas: integra todo lo aprendido en una operación completa que va desde la detección inicial hasta la entrega de un reporte de incidente profesional.

La diferencia con los niveles anteriores es el contexto: en el Nivel 7, el estudiante opera con total autonomía, sin guía implícita del ejercicio. Decide el orden de análisis, prioriza las respuestas, gestiona múltiples vectores si los hay, y produce un reporte que documenta el incidente completo.

## 2. El ciclo completo de respuesta a incidentes

El estándar NIST SP 800-61 define el ciclo de respuesta a incidentes en cuatro fases:

1. **Preparación** — tener las herramientas, procedimientos y permisos necesarios antes de que ocurra un incidente.
2. **Detección y análisis** — identificar que un incidente está ocurriendo y caracterizarlo.
3. **Contención, erradicación y recuperación** — detener el ataque, eliminar sus efectos y restaurar el sistema.
4. **Actividades post-incidente** — documentar, aprender y mejorar los controles.

El Nivel 7 trabaja principalmente las fases 2, 3 y 4. La fase 1 (preparación) es implícita: las herramientas ya están disponibles.

## 3. `export-report`: el producto final

El Nivel 7 introduce el comando `export-report`, que genera el reporte formal del incidente basándose en la sesión de análisis del estudiante.

Un reporte de incidente profesional es el producto más tangible del trabajo del analista SOC. Es lo que el cliente recibe, lo que el equipo de gestión lee para tomar decisiones y lo que queda como registro histórico del incidente.

En CyberLab, `export-report` genera un reporte estructurado que refleja la actividad de análisis y respuesta realizada durante la sesión.

## 4. La responsabilidad del analista

En el Nivel 7, el analista tiene responsabilidad total sobre el incidente:

- **Responsabilidad de detección:** si un vector no fue detectado, no está en el reporte.
- **Responsabilidad de respuesta:** si un vector no fue contenido, el incidente sigue activo.
- **Responsabilidad de documentación:** si la respuesta no está documentada, no puede ser auditada.

Este nivel de responsabilidad es el que distingue la práctica académica del ejercicio profesional. El Nivel 7 de CyberLab reproduce esa exigencia en un entorno seguro.
