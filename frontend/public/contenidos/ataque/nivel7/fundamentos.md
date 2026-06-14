# Nivel 7 — Fundamentos del pentest completo

## 1. El pentest como proceso profesional

Un pentest (penetration test) no es una serie de ataques aleatorios. Es un proceso sistemático y documentado que busca identificar vulnerabilidades en un sistema antes que un atacante real lo haga. Un pentest profesional tiene alcance definido, metodología estructurada, evidencia documentada y reporte formal.

El Nivel 7 replica este proceso en el entorno simulado de CyberLab.

---

## 2. Las fases del pentest

### 2.1. Definición de alcance (Scoping)
Antes de cualquier acción técnica, se define:
- ¿Qué sistemas están en alcance?
- ¿Qué técnicas están permitidas?
- ¿Cuándo y cómo se reportarán los hallazgos?

En el Nivel 7, el alcance está definido por el ejercicio. El estudiante debe operacionalizar ese alcance: ¿qué hosts, qué servicios, qué vectores?

### 2.2. Reconocimiento (Reconnaissance)
Obtención de información sobre el objetivo antes de interactuar directamente con él. Incluye:
- Identificación de hosts activos.
- Enumeración de servicios y versiones.
- Identificación de usuarios y roles.
- Mapeo de la red objetivo.

### 2.3. Análisis de vulnerabilidades
Con la información del reconocimiento, identificar qué vulnerabilidades podrían existir:
- ¿Qué servicios expuestos tienen vulnerabilidades conocidas?
- ¿Hay credenciales débiles o configuraciones inseguras?
- ¿Qué vectores de ataque son viables dado el alcance?

### 2.4. Explotación
Ejecutar ataques específicos para verificar si las vulnerabilidades identificadas son explotables:
- Ataques de fuerza bruta cuando hay servicios de autenticación.
- Análisis de tráfico cuando hay comunicaciones sospechosas.
- Bloqueo de vectores maliciosos cuando se detectan.

### 2.5. Post-explotación y pivoting
Evaluar qué acceso adicional podría obtenerse desde una posición comprometida. En el contexto del Nivel 7, esto implica analizar si el acceso al primer vector facilita el acceso a otros sistemas.

### 2.6. Reporte
Documentar todos los hallazgos con evidencia, clasificar por severidad e impacto, y proporcionar recomendaciones de remediación.

---

## 3. Principios éticos del pentest

### 3.1. Operar solo dentro del alcance
Todo sistema fuera del alcance definido está explícitamente fuera de límites, incluso si es técnicamente accesible.

### 3.2. No destruir, no exfiltrar más de lo necesario
El objetivo es demostrar que la vulnerabilidad es explotable, no explotarla al máximo. La exfiltración de datos más allá de lo necesario para evidencia es éticamente inaceptable.

### 3.3. Documentar para el cliente, no solo para el pentester
La documentación no es un registro para uso propio. Es el producto que el cliente recibe para poder remediar. Debe ser comprensible por técnicos que no participaron en el pentest.

---

## 4. Integración de lo aprendido

El Nivel 7 requiere aplicar simultáneamente:

- Reconocimiento y enumeración (Niveles 1-2)
- Análisis de eventos y tráfico (Niveles 3-4)
- Detección y respuesta ante ataques (Nivel 5)
- Gestión de múltiples vectores simultáneos (Nivel 6)
- Juicio autónomo para decidir el orden y prioridad de las acciones (Nivel 7)

No se trata de recordar los comandos de cada nivel; se trata de saber cuándo y por qué usar cada uno.
