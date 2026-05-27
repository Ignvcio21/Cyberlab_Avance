# Nivel 2 — Comandos y explicación

## 1. Finalidad operativa de los comandos en el Nivel 2

En este nivel, los comandos disponibles se orientan al análisis de actividades de reconocimiento ofensivo y enumeración básica de servicios. A diferencia del Nivel 1, donde el escenario presentaba patrones más evidentes de fuerza bruta, aquí el estudiante debe interpretar comportamiento asociado a exploración de puertos y recopilación de información previa a una posible explotación.

Desde una perspectiva metodológica, los comandos del laboratorio no representan únicamente “acciones para avanzar”, sino herramientas de análisis utilizadas para:
- identificar señales,
- consultar evidencia,
- interpretar patrones,
- aplicar contención,
- y verificar resultados.

El valor formativo del nivel se encuentra principalmente en la capacidad de justificar técnicamente cada decisión tomada durante el procedimiento.

---

## 2. Comandos de orientación operacional

### 2.1. `help`

**Función operacional:**  
Muestra los comandos disponibles dentro del laboratorio y facilita la navegación inicial del entorno interactivo.

**Interpretación técnica:**  
En herramientas profesionales, disponer de ayuda integrada reduce errores operacionales y facilita la estandarización de procedimientos. En entornos de ciberseguridad, una mala interpretación de comandos puede provocar respuestas incorrectas o pérdida de tiempo durante un incidente.

Dentro del laboratorio, `help` cumple una función de apoyo metodológico y orientación operativa.

**Uso recomendado:**  
- Inicio del escenario.
- Verificación de sintaxis.
- Recordatorio de comandos válidos.
- Confirmación de parámetros.

**Error común:**  
Utilizar `help` como sustituto del análisis técnico. La evaluación considera importante comprender el propósito de cada comando y no únicamente memorizar su existencia.

---

### 2.2. `status`

**Función operacional:**  
Entrega un resumen general del estado actual del laboratorio y del escenario activo.

**Interpretación técnica:**  
La visibilidad operacional constituye un elemento fundamental dentro de operaciones de seguridad. Un resumen de estado permite comprender rápidamente:
- qué escenario está activo,
- qué acciones faltan,
- y cuál es el avance actual del caso.

En el laboratorio, `status` facilita mantener contexto durante el procedimiento.

**Uso recomendado:**  
- Antes de iniciar análisis.
- Luego de una pausa.
- Para verificar progreso general.

**Error común:**  
Confundir estado general con evidencia técnica. El comando no reemplaza el análisis de eventos.

---

## 3. Comandos de detección y priorización

### 3.1. `show alerts`

**Función operacional:**  
Lista las alertas generadas por el sistema asociadas a actividad sospechosa detectada durante el escenario.

**Interpretación técnica:**  
Las alertas representan señales iniciales de posible actividad ofensiva. En entornos reales, estas alertas suelen generarse mediante:
- correlación,
- reglas por umbral,
- detección de comportamiento anómalo,
- o firmas conocidas.

Sin embargo, una alerta por sí sola no constituye evidencia definitiva. Desde una perspectiva profesional, la alerta debe interpretarse como punto de partida para el análisis posterior.

**Uso recomendado:**  
1) identificar la alerta relevante,  
2) revisar severidad,  
3) pasar inmediatamente al análisis de eventos.

**Buenas prácticas de explicación:**  
- “La alerta permitió priorizar la revisión del incidente.”
- “La actividad sospechosa fue validada posteriormente mediante eventos.”

**Errores frecuentes:**  
- asumir ataque únicamente por existencia de alerta,
- aplicar contención sin validar evidencia,
- ignorar severidad o contexto del incidente.

---

## 4. Comandos de evidencia y análisis

### 4.1. `show events`

**Función operacional:**  
Muestra eventos registrados por el sistema relacionados con conexiones, actividad sospechosa y comportamiento observado durante el escenario.

**Interpretación técnica:**  
Los eventos constituyen evidencia primaria dentro del análisis de seguridad. Permiten:
- identificar origen,
- observar frecuencia,
- detectar patrones repetitivos,
- y correlacionar comportamiento ofensivo.

En el Nivel 2, los eventos suelen reflejar:
- múltiples conexiones hacia distintos puertos,
- intentos secuenciales,
- patrones compatibles con escaneo de servicios.

La metodología del laboratorio exige analizar estos patrones antes de ejecutar acciones defensivas.

**Uso recomendado:**  
- Después de revisar alertas.
- Antes de cualquier bloqueo.
- Como base principal para justificar decisiones.

**Buenas prácticas de explicación:**  
- “Los eventos mostraron múltiples conexiones desde una misma IP.”
- “El patrón observado era consistente con reconocimiento ofensivo.”

**Errores comunes:**  
- analizar solo un evento aislado,
- ignorar frecuencia,
- no relacionar eventos con alertas previas.

---

## 5. Comandos de contención

### 5.1. `block ip X.X.X.X`

**Función operacional:**  
Aplica una medida de contención bloqueando la dirección IP especificada.

**Interpretación técnica:**  
El bloqueo de IP representa una acción defensiva inmediata utilizada para reducir exposición frente a actividad sospechosa.

En entornos reales, este tipo de medidas puede implementarse mediante:
- firewall,
- ACL,
- listas de denegación,
- WAF,
- o sistemas automatizados de respuesta.

Dentro del laboratorio, el bloqueo solo se considera metodológicamente correcto cuando:
- existe evidencia suficiente,
- el origen fue identificado correctamente,
- y la acción puede justificarse técnicamente.

**Uso recomendado:**  
1) revisar alertas,  
2) validar eventos,  
3) identificar IP origen,  
4) ejecutar bloqueo,  
5) verificar resultado.

**Errores frecuentes:**  
- bloquear IP incorrecta,
- bloquear sin revisar eventos,
- utilizar sintaxis incorrecta.

---

### 5.2. `unblock ip X.X.X.X`

**Función operacional:**  
Revierte el bloqueo aplicado sobre la dirección IP indicada.

**Interpretación técnica:**  
Representa el principio de reversibilidad operacional. Toda medida defensiva puede generar impacto sobre disponibilidad o acceso legítimo, por lo que debe existir capacidad de revertir cambios cuando corresponda.

En seguridad profesional, desbloquear puede ser necesario:
- ante falsos positivos,
- por error operacional,
- o al finalizar una contención temporal.

**Uso recomendado:**  
- corrección de errores,
- cierre controlado del incidente,
- restauración posterior.

**Error común:**  
Desbloquear sin verificar previamente el contexto del escenario.

---

## 6. Comandos de verificación

### 6.1. `show blocked`

**Función operacional:**  
Muestra las direcciones IP actualmente bloqueadas dentro del escenario activo.

**Interpretación técnica:**  
Corresponde a evidencia de resultado posterior a una acción defensiva.

La verificación constituye una etapa obligatoria dentro de operaciones de seguridad. Aplicar una medida sin comprobar el cambio de estado debilita la confiabilidad del procedimiento.

Por esta razón, el laboratorio considera importante validar:
- que la IP fue bloqueada,
- que el estado cambió,
- y que la acción se registró correctamente.

**Uso recomendado:**  
- inmediatamente después del bloqueo,
- como parte del cierre metodológico.

**Error frecuente:**  
Asumir que el bloqueo funcionó sin verificar evidencia posterior.

---

## 7. Comando de limpieza visual

### 7.1. `clear`

**Función operacional:**  
Limpia la salida visible de la terminal.

**Interpretación técnica:**  
Corresponde a una función de organización visual y no modifica la evidencia almacenada por el sistema.

En operaciones reales, mantener claridad visual facilita el análisis y reduce errores asociados a saturación de información.

**Uso recomendado:**  
- reorganización visual,
- reinicio de lectura,
- separación entre etapas del procedimiento.

**Error común:**  
Usar limpieza visual para ocultar errores metodológicos o comandos incorrectos.

---

## 8. Secuencia metodológica recomendada

Para el Nivel 2 se recomienda mantener la siguiente secuencia operacional:

1) `show alerts`  
2) `show events`  
3) interpretación del patrón  
4) `block ip <IP origen>`  
5) `show blocked`  
6) reporte o cierre del escenario

Esta secuencia permite mantener coherencia metodológica y facilita justificar técnicamente las acciones ejecutadas.

---

## 9. Calidad técnica en el uso de comandos

El laboratorio considera un uso de comandos técnicamente correcto cuando:
- existe orden lógico,
- la acción se basa en evidencia,
- el estudiante identifica patrones,
- se aplica verificación posterior,
- y puede explicarse el propósito operacional de cada etapa.

La evaluación no se centra únicamente en “escribir correctamente un comando”, sino en demostrar comprensión del proceso asociado a su utilización.

---

## 10. Síntesis

Los comandos del Nivel 2 representan herramientas básicas de análisis y contención dentro de un escenario de reconocimiento ofensivo. Su propósito formativo consiste en desarrollar criterio técnico, interpretación de evidencia y metodología operacional basada en observación, correlación y validación posterior.