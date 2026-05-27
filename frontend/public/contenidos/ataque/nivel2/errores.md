# Nivel 2 — Errores comunes y malas prácticas

## 1. Propósito de esta sección

El objetivo de esta sección es identificar errores frecuentes observados durante ejercicios de reconocimiento ofensivo y análisis de eventos relacionados con escaneo de puertos. En ciberseguridad, muchos incidentes no ocurren únicamente por falta de herramientas, sino por errores metodológicos, interpretación incorrecta de evidencia o decisiones apresuradas.

Dentro del laboratorio CyberLab, el Nivel 2 busca fortalecer la capacidad de análisis técnico antes de ejecutar acciones defensivas. Por esta razón, comprender los errores comunes resulta tan importante como aprender el procedimiento correcto.

La mayoría de los errores en este nivel se relacionan con:
- interpretación incompleta de evidencia,
- bloqueo apresurado,
- falta de correlación,
- y ausencia de validación posterior.

---

## 2. Confundir alerta con evidencia definitiva

Uno de los errores más frecuentes consiste en asumir que una alerta confirma automáticamente un ataque.

En entornos reales, las alertas representan señales generadas por reglas o comportamientos observados, pero no siempre constituyen evidencia suficiente para justificar una acción inmediata. Una alerta puede corresponder a:
- un falso positivo,
- una actividad legítima,
- un comportamiento mal interpretado,
- o una anomalía parcial.

Por ello, el laboratorio exige validar cualquier alerta utilizando eventos y análisis adicional.

### Ejemplo incorrecto

> “Había una alerta, así que bloqueé la IP.”

### Problema metodológico
- No existe validación de evidencia.
- No se interpreta el patrón.
- No se justifica técnicamente la acción.

### Corrección adecuada
La alerta debe utilizarse como punto de partida para consultar eventos y confirmar el comportamiento observado.

---

## 3. Bloquear sin revisar eventos

Otro error crítico corresponde a aplicar contención sin revisar evidencia primaria.

El análisis profesional requiere:
1) identificar la señal,
2) consultar eventos,
3) interpretar el patrón,
4) recién entonces aplicar una medida.

Bloquear sin revisar eventos transforma el procedimiento en una reacción impulsiva y no en una respuesta técnica defendible.

### Consecuencias
- falsos positivos,
- bloqueo de actividad legítima,
- mala interpretación del escenario,
- pérdida de coherencia metodológica.

### Buen enfoque
Antes de bloquear, el estudiante debe:
- identificar IP origen,
- confirmar repetición,
- analizar puertos afectados,
- y justificar la relación con reconocimiento ofensivo.

---

## 4. Analizar eventos de manera aislada

Un error frecuente consiste en observar únicamente un evento individual y concluir inmediatamente que existe actividad maliciosa.

En seguridad operacional, el análisis depende principalmente de:
- patrones,
- frecuencia,
- correlación,
- y comportamiento repetitivo.

Una conexión individual rara vez basta para concluir que existe un escaneo de puertos.

### Error típico
- revisar solo el primer evento,
- ignorar secuencia,
- no considerar temporalidad,
- omitir correlación entre registros.

### Buen enfoque
El estudiante debe interpretar:
- repetición,
- múltiples puertos,
- concentración temporal,
- origen común.

---

## 5. Confundir IP origen con servicio afectado

En escenarios de reconocimiento ofensivo, algunos estudiantes confunden:
- la IP atacante,
- con el servicio o sistema objetivo.

Este error provoca bloqueos incorrectos y demuestra falta de interpretación de los registros observados.

### Ejemplo del problema
- la IP 192.168.1.120 genera conexiones,
- pero el estudiante bloquea el servidor destino.

### Consecuencia
La contención no corresponde al origen del comportamiento sospechoso.

### Recomendación
Analizar cuidadosamente:
- quién origina la conexión,
- hacia qué servicio se dirige,
- y qué elemento representa el posible atacante.

---

## 6. Ejecutar comandos por ensayo y error

Uno de los objetivos centrales de CyberLab es evitar que el estudiante complete escenarios únicamente probando comandos hasta “acertar”.

Desde una perspectiva académica, esto constituye una mala práctica porque:
- no demuestra comprensión,
- no existe metodología,
- no hay interpretación,
- y no puede justificarse técnicamente el procedimiento.

### Señales de ensayo y error
- múltiples bloqueos sin análisis,
- comandos aleatorios,
- ausencia de explicación,
- acciones fuera de secuencia.

### Buen enfoque
Cada comando debe ejecutarse:
- con un propósito claro,
- basado en evidencia,
- y siguiendo una lógica operacional.

---

## 7. Omitir verificación posterior

Aplicar una medida sin verificar el resultado representa otro error metodológico importante.

En seguridad real, toda acción defensiva debe confirmarse posteriormente para asegurar:
- que el cambio fue aplicado,
- que el estado se modificó,
- y que la medida surtió efecto.

### Error frecuente
- ejecutar `block ip ...`
- y asumir que el bloqueo funcionó sin verificar.

### Corrección adecuada
Después de aplicar contención, debe revisarse:

```bash
show blocked