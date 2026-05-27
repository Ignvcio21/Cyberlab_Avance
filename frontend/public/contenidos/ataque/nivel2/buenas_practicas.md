# Nivel 2 — Buenas prácticas

## 1. Introducción

Las buenas prácticas del Nivel 2 se enfocan en el análisis responsable y metodológico de actividades de reconocimiento ofensivo. En escenarios reales de ciberseguridad, una interpretación incorrecta de evidencia puede provocar falsos positivos, interrupciones innecesarias o decisiones defensivas mal justificadas.

Por esta razón, el laboratorio CyberLab no busca únicamente que el estudiante “detecte un ataque”, sino que aprenda a:
- interpretar patrones,
- validar evidencia,
- correlacionar información,
- y responder de manera técnicamente defendible.

Las siguientes prácticas representan lineamientos operacionales similares a los utilizados en procesos reales de análisis y pentesting.

---

## 2. Priorizar evidencia antes de actuar

Una de las prácticas más importantes en ciberseguridad consiste en evitar decisiones impulsivas basadas únicamente en señales iniciales.

Las alertas deben interpretarse como:
- indicadores,
- señales,
- o puntos de partida para el análisis.

Nunca como evidencia definitiva.

### Buena práctica
- revisar eventos antes de aplicar cualquier bloqueo;
- confirmar origen;
- interpretar frecuencia y patrón;
- validar comportamiento repetitivo.

### Mala práctica
- bloquear inmediatamente después de una alerta.

---

## 3. Analizar patrones y no eventos aislados

El reconocimiento ofensivo normalmente se detecta mediante comportamiento repetitivo y correlación de múltiples eventos.

Una buena práctica consiste en observar:
- frecuencia,
- secuencia,
- puertos afectados,
- repetición,
- origen común,
- y temporalidad.

### Buen enfoque
Relacionar múltiples eventos para construir interpretación técnica.

### Mal enfoque
Concluir que existe un ataque observando un único evento aislado.

---

## 4. Mantener una secuencia metodológica

El laboratorio utiliza una metodología progresiva basada en:

1) señal,  
2) evidencia,  
3) interpretación,  
4) contención,  
5) verificación.

Mantener esta secuencia permite:
- reducir errores,
- justificar decisiones,
- y mejorar la calidad del análisis.

### Recomendación
Evitar saltar directamente desde alerta a bloqueo.

---

## 5. Verificar siempre el resultado

Aplicar una medida defensiva sin comprobar el cambio de estado constituye una mala práctica operacional.

Toda acción debe verificarse posteriormente.

### Buena práctica
Después de bloquear:

```bash
show blocked