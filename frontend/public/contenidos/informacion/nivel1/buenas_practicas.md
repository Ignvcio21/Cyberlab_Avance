# Nivel 1 — Buenas prácticas (estándar profesional para pentesting)

## Lectura guía
Esta pestaña se plantea como un “estándar” de buenas prácticas, similar a recomendaciones docentes y lineamientos profesionales. Se organiza en tres partes: **principios**, **checklists** y **plantillas**. El objetivo es que el estudiante pueda ejecutar un trabajo técnicamente correcto, éticamente responsable y evaluable (con evidencia y documentación).

> **Principio rector:** un pentest universitario se evalúa por **método + evidencia + comunicación**. El resultado sin método no demuestra aprendizaje.

---

## A) Principios fundamentales (norma operativa)

### 1) Autorización y alcance explícitos
Toda actividad de pentesting parte por autorización y alcance. En términos profesionales, ejecutar pruebas sin alcance definido constituye un riesgo legal y operativo. En términos académicos, omitir alcance indica desconocimiento del proceso.

**Aplicación práctica:**
- Declarar el alcance al inicio (objetivo, activos, límites).
- Indicar técnicas prohibidas (p. ej., DoS, exfiltración real).
- Definir evidencia mínima esperada.

---

### 2) Mínima intervención (demostrar sin causar daño)
El objetivo no es “romper” un sistema, sino demostrar impacto con la menor intervención posible. Esto es especialmente relevante en pruebas web y de infraestructura.

**Aplicación práctica:**
- Priorizar pruebas controladas.
- Evitar cargas agresivas si no están permitidas.
- Detener la explotación cuando el impacto ya fue demostrado.

---

### 3) Evidencia reproducible (lo que no se puede repetir, no se puede evaluar)
En pentesting universitario, el reporte debe permitir que un tercero valide el hallazgo. La evidencia reproducible incluye: comando, salida, captura y pasos claros.

**Aplicación práctica:**
- Registrar siempre comandos usados (con parámetros).
- Guardar salida relevante (no todo el texto, solo lo clave).
- Explicar cómo interpretar la evidencia.

---

### 4) Separación entre hecho e interpretación
Una buena práctica central es separar:
- **Hecho (evidencia):** “nmap mostró 22/tcp open ssh”.
- **Interpretación:** “existe superficie de ataque en SSH”.
- **Conclusión:** “se recomienda hardening y controles de acceso”.

Esto evita afirmaciones no sustentadas y mejora la calidad del informe.

---

### 5) Priorizar con criterio (no todo es crítico)
La priorización debe considerar:
- exposición (externo vs interno),
- impacto (CIA),
- probabilidad (facilidad de explotación),
- evidencia de actividad real (patrones, intentos).

**Aplicación práctica:**
- No asignar severidad alta sin justificar.
- Explicar por qué un hallazgo es relevante.

---

### 6) Verificación posterior (cierre metodológico)
Toda acción defensiva o cambio aplicado debe verificarse. En el laboratorio se expresa como consulta de estado posterior; en entornos reales puede ser validación de regla, logs posteriores o pruebas de reintento.

**Aplicación práctica:**
- Tras contención, comprobar estado.
- Incorporar verificación al reporte.

---

### 7) Comunicación técnica profesional
La comunicación se evalúa tanto como la ejecución. Un reporte “bonito” pero sin evidencia es malo, y una evidencia buena sin explicación es incompleta.

**Aplicación práctica:**
- Redacción clara, formal, sin lenguaje subjetivo.
- Uso de términos: evidencia, patrón, origen, contención, verificación.

---

## B) Checklist operativo (antes, durante y después)

### Checklist 1 — Antes de comenzar
- [ ] Alcance definido (activos, límites y permisos).
- [ ] Objetivo del pentest declarado (red/web/infra).
- [ ] Evidencia mínima definida (capturas, salidas).
- [ ] Restricciones conocidas (no DoS, horarios, etc.).

### Checklist 2 — Durante el análisis
- [ ] Se ejecutan acciones por fase (reconocimiento → enumeración → análisis).
- [ ] No se concluye sin evidencia reproducible.
- [ ] Se registran comandos y salidas relevantes.
- [ ] Se prioriza con criterio, no por intuición.

### Checklist 3 — Cierre del ejercicio
- [ ] Hallazgos redactados con estructura formal.
- [ ] Evidencia adjunta o referenciada en cada hallazgo.
- [ ] Impacto descrito con CIA (cuando aplica).
- [ ] Mitigaciones concretas y verificables.
- [ ] Verificación posterior incluida cuando se aplican medidas.

---

## C) Plantillas (para que el trabajo se vea universitario)

### Plantilla 1 — Registro de evidencia (muy usado en universidad)
**Comando ejecutado:**  
`<comando exacto con parámetros>`

**Salida relevante (extracto):**
- `<líneas relevantes>`

**Interpretación técnica:**
- `<qué significa esa evidencia>`

**Decisión / siguiente paso:**
- `<qué se hará con esa evidencia y por qué>`

---

### Plantilla 2 — Hallazgo formal (modelo de reporte)
- **Hallazgo:** descripción concreta del problema detectado.  
- **Evidencia:** comando(s), salida(s), captura(s) o pasos que lo demuestran.  
- **Impacto:** qué permite o qué riesgo genera (CIA).  
- **Severidad:** alta/media/baja con justificación breve.  
- **Mitigación:** acción concreta (configuración, parche, control adicional).  
- **Verificación recomendada:** cómo confirmar que se mitigó.

---

### Plantilla 3 — Resumen ejecutivo (para cierre de nivel)
- **Contexto:** qué se evaluó y bajo qué alcance.
- **Resultados:** principales hallazgos (máximo 3–5).
- **Acción prioritaria:** qué se debe corregir primero y por qué.
- **Riesgo residual:** qué queda pendiente y cómo monitorear.

---

## D) Buenas prácticas de redacción (para que no parezca chat)
- Evitar “yo”, “tú”, “te recomiendo” en exceso; preferir lenguaje impersonal.
- Usar verbos técnicos: identificar, evidenciar, validar, contener, verificar.
- No exagerar: evitar “totalmente vulnerable” sin evidencia.
- No inventar: si algo no se probó, se declara como hipótesis.
- Mantener consistencia terminológica: evento/alerta, evidencia, patrón, contención.

---

## Mini-evaluación
1) ¿Por qué el alcance es requisito previo del pentesting?  
2) ¿Qué significa “mínima intervención” y cómo se aplica en práctica?  
3) ¿Qué hace que una evidencia sea “reproducible”?  
4) ¿Por qué se separa hecho de interpretación en un informe?  
5) Redacte un hallazgo usando la plantilla: hallazgo, evidencia, impacto, mitigación y verificación.