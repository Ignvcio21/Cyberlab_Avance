# Nivel 1 — Objetivos de aprendizaje en Pentesting (enfoque universitario)

## 1. Propósito del nivel
Este nivel establece los objetivos formativos mínimos que permiten comprender el pentesting como un **proceso metodológico** y no como un conjunto de herramientas o comandos aislados. En el ámbito universitario, el aprendizaje de pentesting se considera logrado cuando el estudiante demuestra: (i) comprensión conceptual de qué es y qué no es una prueba de penetración, (ii) capacidad de ejecutar fases con propósito definido, (iii) interpretación técnica de evidencia, y (iv) documentación formal de hallazgos con criterios de severidad y mitigación.

El nivel se considera introductorio porque fija el vocabulario y las competencias base: alcance, autorización, reconocimiento, enumeración, evidencia, verificación y reporte. Estas competencias son transversales a cualquier tipo de pentest (red, web, infraestructura) y determinan la calidad profesional del trabajo.

> **Concepto clave:** El objetivo académico no es “usar herramientas”, sino **tomar decisiones justificadas** dentro de un proceso controlado.

---

## 2. Objetivo general
Comprender y aplicar la estructura metodológica de un pentest, identificando sus fases principales, el tipo de evidencia esperada en cada fase, los criterios éticos y de alcance, y los fundamentos de documentación técnica de hallazgos (incluyendo impacto y mitigación).

Este objetivo se evidencia cuando el estudiante puede explicar el pentesting de forma ordenada, ejecutar una secuencia de acciones coherente y justificar decisiones con evidencia observada, sin recurrir a afirmaciones subjetivas.

---

## 3. Objetivos específicos

### 3.1 Definir pentesting con precisión (y diferenciarlo de un ataque)
El estudiante debe ser capaz de formular una definición formal: el pentesting es una evaluación de seguridad autorizada, con alcance definido y objetivo de mejora. Además, debe diferenciarlo explícitamente de un ataque real, considerando:
- **Autorización:** existencia de permiso explícito.
- **Alcance:** límites claros de lo permitido y lo prohibido.
- **Intención:** identificar debilidades para corregirlas, no causar daño.
- **Documentación:** reporte técnico como parte obligatoria del proceso.

En evaluación oral, un error grave es describir pentesting sin mencionar autorización y alcance.

---

### 3.2 Comprender el concepto de “alcance” y reglas de compromiso
El estudiante debe entender que antes de ejecutar herramientas se debe definir:
- activos permitidos (IPs, dominios, endpoints),
- restricciones de horario,
- credenciales de prueba (si se entregan),
- técnicas prohibidas (por ejemplo, DoS),
- criterio de evidencia mínima (demostrar impacto sin daño),
- canales de comunicación y escalamiento.

Este objetivo desarrolla una competencia profesional: operar con control y responsabilidad.

---

### 3.3 Identificar y describir las fases del proceso de pentesting
El estudiante debe reconocer y explicar, al menos, las siguientes fases:
1) **Reconocimiento:** recolección de información (pasiva y activa controlada).
2) **Enumeración/Escaneo:** identificación de superficie de ataque (puertos, servicios, rutas).
3) **Análisis de vulnerabilidades:** evaluación de debilidades y priorización.
4) **Explotación controlada:** demostración limitada del impacto.
5) **Post-explotación (si aplica):** evaluación del alcance obtenido (si está permitido).
6) **Reporte y mitigación:** documentación, priorización y recomendaciones.

El foco no es memorizar nombres, sino comprender **qué se busca** en cada fase y **qué evidencia** se espera obtener.

---

### 3.4 Relacionar comandos y herramientas con fases (no como recetas)
El estudiante debe ser capaz de responder preguntas como:
- “¿Por qué usarías `nmap` aquí?”
- “¿Qué evidencia esperas al ejecutar este comando?”
- “¿Qué decisión tomarías después de este resultado?”

Ejemplos de relación fase–herramienta:
- Reconocimiento: `whois`, consultas DNS, huella de tecnologías.
- Enumeración: `nmap`, `curl -I`, enumeración de rutas.
- Análisis: revisión de versiones, configuración, OWASP Top 10.
- Explotación: pruebas controladas y reproducibles (según alcance).

El objetivo es que el estudiante no “tire comandos”, sino que ejecute acciones con propósito.

---

### 3.5 Interpretar evidencia (salidas, patrones y contexto)
El estudiante debe aprender a interpretar resultados con lenguaje técnico:
- Un puerto abierto no es una vulnerabilidad por sí mismo, es una **superficie**.
- Una versión detectada no implica vulnerabilidad hasta confirmar CVE/condiciones.
- Una respuesta HTTP no es “buena o mala”, se interpreta por cabeceras, códigos, comportamiento.

Competencias esperadas:
- describir hallazgos con precisión,
- identificar qué datos son relevantes,
- distinguir evidencia primaria (salida de herramienta/logs) de conclusiones,
- evitar afirmaciones no sustentadas.

---

### 3.6 Documentar hallazgos con estructura profesional
En ámbito universitario, el reporte es parte del aprendizaje. Se espera que el estudiante domine al menos esta estructura:

- **Hallazgo:** qué se detectó.
- **Evidencia:** cómo se comprobó (comando, salida, captura).
- **Impacto:** qué podría ocurrir (CIA: confidencialidad, integridad, disponibilidad).
- **Severidad:** justificación (alto/medio/bajo).
- **Recomendación:** mitigación concreta y verificable.

Este objetivo es clave para evaluaciones y defensas: un pentest sin documentación formal se considera incompleto.

---

### 3.7 Desarrollar criterio de priorización (pensamiento profesional)
El estudiante debe aprender que no todo hallazgo tiene la misma relevancia. Se espera criterio para priorizar:
- exposición directa a internet vs interna,
- autenticación requerida vs no requerida,
- impacto potencial (CIA),
- facilidad de explotación,
- evidencia de actividad real (intentos repetidos, escaneo, etc.).

En evaluación, esto se manifiesta cuando el estudiante puede explicar por qué abordaría primero un vector y no otro.

---

### 3.8 Reconocer límites éticos y legales
La formación universitaria debe incorporar explícitamente:
- prohibición de operar sin autorización,
- respeto por datos sensibles,
- mínima invasión para demostrar impacto,
- confidencialidad del reporte,
- responsabilidad sobre herramientas y alcance.

Este objetivo evita confusiones frecuentes y fortalece el componente profesional del aprendizaje.

---

## 4. Indicadores de logro (cómo se demuestra que se aprendió)
Se considera que el estudiante cumple los objetivos cuando puede:

1) Definir pentesting correctamente y diferenciarlo de ataque real.  
2) Explicar el alcance y por qué se define antes de ejecutar herramientas.  
3) Describir fases del proceso y su propósito.  
4) Asociar herramientas/comandos a fases con justificación.  
5) Interpretar evidencia sin inventar conclusiones.  
6) Redactar un hallazgo con evidencia, impacto y mitigación.  
7) Priorizar hallazgos con criterio técnico.  
8) Explicar límites éticos y legales.

---

## 5. Autoevaluación breve
1) ¿Qué tres elementos hacen que un pentest sea distinto de un ataque real?  
2) ¿Qué significa “alcance” y qué riesgos existen si no se define?  
3) Enumere cuatro fases del pentesting y explique qué se busca en cada una.  
4) ¿Por qué un puerto abierto no es automáticamente una vulnerabilidad?  
5) Redacte un hallazgo en formato: hallazgo, evidencia, impacto, severidad y recomendación.