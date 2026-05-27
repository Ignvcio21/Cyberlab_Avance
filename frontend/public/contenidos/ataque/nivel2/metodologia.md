# Nivel 2 — Metodología

## 1. Propósito metodológico del nivel

La metodología del Nivel 2 se orienta al análisis de actividades de reconocimiento ofensivo mediante interpretación de eventos y correlación básica de evidencia. A diferencia del Nivel 1, donde el patrón sospechoso era más evidente, este nivel introduce situaciones donde el estudiante debe observar comportamiento repetitivo y comprender el contexto operacional antes de aplicar una acción.

El objetivo principal no consiste únicamente en ejecutar comandos, sino en desarrollar un procedimiento coherente y justificable desde una perspectiva técnica. En ciberseguridad, una respuesta correcta requiere:
- evidencia suficiente,
- interpretación del comportamiento,
- y validación posterior de las acciones aplicadas.

Por esta razón, el laboratorio mantiene un enfoque metodológico basado en análisis secuencial y toma de decisiones fundamentadas.

---

## 2. Flujo metodológico del laboratorio

El procedimiento del Nivel 2 se estructura en cinco etapas principales:

1) detección inicial,  
2) análisis de evidencia,  
3) interpretación del patrón,  
4) acción de contención,  
5) verificación posterior.

Cada etapa cumple una función específica dentro del análisis ofensivo y defensivo del escenario.

---

## 3. Detección inicial

La primera etapa corresponde a la identificación de señales asociadas a actividad sospechosa. Estas señales pueden presentarse mediante alertas generadas automáticamente por el sistema.

En términos operacionales, la alerta actúa como mecanismo de priorización. Su función es orientar al analista respecto de comportamientos que requieren revisión más detallada.

Sin embargo, desde una perspectiva metodológica, la alerta no debe interpretarse como evidencia definitiva. Una buena práctica profesional exige validar cualquier señal utilizando registros adicionales antes de aplicar medidas de contención.

Por ello, el laboratorio espera que el estudiante utilice las alertas únicamente como punto de partida para el análisis posterior.

---

## 4. Consulta de evidencia primaria

Luego de identificar la señal inicial, el estudiante debe consultar los eventos asociados al escenario. Esta etapa representa la obtención de evidencia primaria.

Los eventos permiten:
- identificar la IP origen,
- reconocer repetición de conexiones,
- observar frecuencia,
- y analizar comportamiento sobre distintos servicios o puertos.

La metodología del laboratorio prioriza la observación de patrones antes que la reacción inmediata. En consecuencia, se considera incorrecto bloquear una dirección IP sin revisar previamente los eventos relacionados.

---

## 5. Interpretación del patrón

Una vez obtenida la evidencia, el estudiante debe interpretar el comportamiento observado.

En este nivel, el análisis se enfoca principalmente en:
- conexiones repetitivas,
- múltiples intentos hacia distintos puertos,
- actividad concentrada en periodos cortos,
- y patrones compatibles con reconocimiento ofensivo.

El laboratorio busca que el estudiante comprenda que el análisis no depende de un único evento aislado, sino de la relación entre múltiples registros observados en conjunto.

Desde una perspectiva profesional, esta etapa corresponde al proceso de correlación de información.

---

## 6. Aplicación de medidas de contención

Cuando el análisis entrega evidencia suficiente, el estudiante puede aplicar medidas de contención sobre el origen sospechoso.

Dentro de CyberLab, esta acción se representa mediante el bloqueo de direcciones IP utilizando comandos desde la terminal interactiva.

La metodología considera correcto el bloqueo únicamente cuando:
- existe evidencia consistente,
- el origen fue identificado correctamente,
- y la decisión puede justificarse técnicamente.

El objetivo pedagógico no es “completar rápido” el escenario, sino demostrar criterio operacional y coherencia metodológica.

---

## 7. Verificación posterior

Después de aplicar una medida defensiva, el estudiante debe verificar el resultado obtenido.

La verificación constituye una etapa obligatoria dentro del flujo metodológico, ya que permite confirmar:
- que la acción fue aplicada correctamente,
- que el cambio de estado ocurrió,
- y que la contención surtió efecto.

En operaciones reales, omitir esta etapa puede provocar errores operacionales o falsa percepción de seguridad. Por ello, el laboratorio considera incompleto cualquier procedimiento que no incluya validación posterior.

---

## 8. Registro y explicación técnica

Además de ejecutar acciones, el estudiante debe ser capaz de explicar:
- qué observó,
- qué evidencia utilizó,
- por qué tomó una decisión,
- y cómo verificó el resultado.

El laboratorio busca desarrollar habilidades técnicas y comunicacionales asociadas a ciberseguridad operacional. En consecuencia, la metodología también considera importante:
- el orden del procedimiento,
- la capacidad de interpretación,
- y la justificación técnica de las acciones realizadas.

---

## 9. Relación con niveles posteriores

La metodología trabajada en este nivel servirá como base para escenarios posteriores de mayor complejidad. Aunque aumentará el volumen de evidencia y la cantidad de acciones disponibles, el flujo metodológico principal se mantendrá:

1) detección,  
2) evidencia,  
3) interpretación,  
4) contención,  
5) verificación.

El dominio de esta secuencia constituye uno de los objetivos centrales del laboratorio CyberLab.