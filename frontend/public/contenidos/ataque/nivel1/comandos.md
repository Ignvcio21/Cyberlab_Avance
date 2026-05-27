# Nivel 1 — Comandos y explicación

## 1. Finalidad de la terminal en el laboratorio
La terminal interactiva de CyberLab representa una abstracción pedagógica de operaciones habituales en ciberseguridad operacional. En un entorno real, un analista consulta fuentes de evidencia (logs, SIEM, paneles SOC), aplica medidas de contención (firewall, WAF, ACL, listas de denegación) y valida resultados con consultas posteriores. El laboratorio simplifica estas acciones en comandos de consola para dos propósitos formativos: (i) entrenar un flujo ordenado de trabajo y (ii) exigir justificación basada en evidencia antes de aplicar una medida defensiva.

En consecuencia, los comandos no deben interpretarse como “atajos” para completar el escenario, sino como herramientas para ejecutar etapas del ciclo mínimo de respuesta: **detección, análisis, contención, verificación y documentación**. La evaluación del Nivel 1 se centra en la coherencia del procedimiento, es decir, que el comando se use en el momento adecuado, con un propósito claro, y que el estudiante sea capaz de explicar la relación entre salida del sistema y decisión adoptada.

## 2. Comandos de orientación y visibilidad operativa

### 2.1. `ayuda`
**Función operacional:** presenta los comandos disponibles y, según la implementación, puede incluir ejemplos o recordatorios de formato.

**Interpretación técnica:** en herramientas profesionales, la documentación mínima integrada reduce errores operacionales. En seguridad, un error por mala usabilidad puede traducirse en decisiones incorrectas o pérdida de tiempo durante un incidente. Por ello, `ayuda` se interpreta como una medida de soporte a la operación: facilita precisión y reduce incertidumbre del operador.

**Uso recomendado:** se utiliza al inicio de la sesión, ante dudas de formato, o cuando se incorporan comandos nuevos en niveles posteriores. No reemplaza la lectura del contenido teórico, pero reduce fricción para ejecutar el procedimiento.

**Error común:** depender de `ayuda` como sustituto del entendimiento. En evaluación, se espera que el estudiante pueda justificar por qué ejecuta un comando, no solo que “sepa que existe”.

---

### 2.2. `estado`
**Función operacional:** entrega un resumen del estado actual del laboratorio (por ejemplo, si hay un escenario activo, estado del caso, y/o indicadores generales).

**Interpretación técnica:** en operaciones de seguridad, mantener visibilidad del estado reduce riesgos de omisión. Un “resumen operativo” permite al analista confirmar rápidamente qué está en curso y qué acciones faltan. El comando `estado` cumple ese rol pedagógico: mantener claridad sobre el avance y evitar que el estudiante ejecute acciones fuera de secuencia.

**Uso recomendado:** se utiliza cuando:
- se necesita confirmar si existe un escenario activo,
- se requiere contextualizar “en qué fase” está el caso,
- o cuando el estudiante retoma el laboratorio después de una pausa.

**Error común:** confundir `estado` con evidencia. Este comando es informativo; la evidencia primaria se consulta mediante eventos.

## 3. Comandos de detección y priorización

### 3.1. `ver alertas`
**Función operacional:** lista alertas generadas por el sistema. Normalmente incluyen título, severidad y descripción.

**Interpretación técnica:** la alerta representa una **señal** que orienta la priorización del análisis. En sistemas reales, una alerta suele resultar de reglas por umbral o correlación (por ejemplo, múltiples intentos fallidos en un periodo). Sin embargo, una alerta no constituye prueba por sí sola; puede ser un falso positivo o una interpretación parcial. Por ello, la metodología profesional exige validar la alerta con evidencia primaria antes de aplicar contención.

**Uso recomendado:** `ver alertas` debe ejecutarse como parte de la fase de detección y priorización:
1) identificar qué alerta es relevante para el caso,
2) registrar su severidad como orientación,
3) pasar a la evidencia mediante eventos.

**Buenas prácticas de explicación (evaluación oral):**
- “Se revisaron alertas para identificar el riesgo priorizado.”
- “La alerta orientó el análisis, pero fue confirmada con eventos.”

**Error común:** afirmar “es un ataque porque hay alerta”. La respuesta correcta debe incluir validación posterior.

## 4. Comandos de evidencia y análisis

### 4.1. `ver eventos`
**Función operacional:** lista eventos detallados asociados a actividad observada por el sistema. Típicamente incluyen tipo de evento, IP origen y descripción.

**Interpretación técnica:** los eventos son evidencia primaria. Permiten:
- identificar el origen (por ejemplo, IP),
- reconocer repetición y frecuencia,
- describir el patrón,
- y sostener una justificación técnica para contención.

En incidentes reales, el análisis se basa en correlación de múltiples eventos. Por ello, el estudiante debe interpretar “patrones” y no solo un dato aislado. En el Nivel 1, la evidencia suele ser consistente con un patrón repetitivo que justifica contención. La evaluación considera incompleto un procedimiento que omite la consulta de eventos antes de bloquear.

**Uso recomendado:** se ejecuta inmediatamente después de identificar la alerta relevante. El estudiante debe observar:
- origen (IP),
- repetición (frecuencia),
- coherencia con el caso planteado,
- y relación con la alerta.

**Buenas prácticas de explicación:**
- “Los eventos confirmaron la IP origen y la repetición en un periodo corto.”
- “La decisión defensiva se derivó de la evidencia observada en eventos.”

**Errores comunes:**
- leer solo el primer evento y concluir sin patrón,
- confundir la IP origen con otros datos,
- omitir relación entre eventos y alerta.

## 5. Comandos de contención y control

### 5.1. `bloquear ip X.X.X.X`
**Función operacional:** aplica un bloqueo de la dirección IP indicada, como medida de contención.

**Interpretación técnica:** el bloqueo por IP representa una medida defensiva inmediata. En entornos reales, este tipo de contención puede implementarse en firewall, WAF, ACL, o mecanismos automatizados (por ejemplo, reglas dinámicas). Su objetivo es cortar el origen de la actividad sospechosa y reducir el riesgo en el corto plazo.

**Criterio metodológico:** el bloqueo solo se considera correcto cuando:
- existe evidencia consistente de riesgo,
- se identificó correctamente el origen,
- y la acción es proporcional al escenario.

El laboratorio exige que el estudiante conecte evidencia con decisión: bloquear “por intuición” no cumple el estándar formativo.

**Uso recomendado:**
1) identificar IP origen en eventos,
2) ejecutar el bloqueo con formato correcto,
3) pasar inmediatamente a verificación.

**Errores frecuentes:**
- bloquear IP incorrecta por lectura apresurada,
- bloquear antes de revisar eventos,
- usar formato incorrecto del comando.

---

### 5.2. `desbloquear ip X.X.X.X`
**Función operacional:** revierte el bloqueo de la IP indicada.

**Interpretación técnica:** representa el principio de reversibilidad y control de cambios. En seguridad profesional, toda medida de contención debe considerar el impacto sobre disponibilidad. Un bloqueo indebido puede afectar usuarios legítimos, especialmente en redes compartidas. Por ello, la reversión controlada es parte de una operación madura.

**Uso recomendado:** se utiliza cuando:
- se identificó un falso positivo,
- se bloqueó una IP por error,
- se requiere restaurar acceso tras cierre formal del caso,
- o se aplica una política de bloqueo temporal.

En evaluación, se considera positivo que el estudiante pueda explicar bajo qué condiciones desbloquearía en un sistema real, aun si el laboratorio no exige desbloqueo para completar el escenario.

## 6. Comandos de verificación (evidencia de resultado)

### 6.1. `ver bloqueadas`
**Función operacional:** lista las IPs bloqueadas actualmente por el sistema.

**Interpretación técnica:** constituye evidencia de resultado. En seguridad, aplicar una medida sin verificar equivale a operar sin certeza. `ver bloqueadas` confirma el cambio de estado posterior a la contención y permite validar que la acción surtió efecto. Este paso se considera obligatorio en el ciclo mínimo de respuesta.

**Uso recomendado:** se ejecuta inmediatamente después de `bloquear ip ...`. El estudiante debe confirmar que:
- la IP aparece en el listado,
- el estado corresponde a la acción aplicada,
- y la verificación se integra en la explicación final del caso.

**Error común:** omitir verificación, lo cual debilita la calidad del procedimiento aun si el bloqueo “parece” haber funcionado.

## 7. Comando de limpieza visual

### 7.1. `limpiar`
**Función operacional:** limpia la salida visible de la terminal.

**Interpretación técnica:** es un comando de higiene de interfaz. No altera la evidencia del sistema, solo la presentación en pantalla. En herramientas reales, la limpieza puede facilitar lectura y reducir confusiones, pero no sustituye registro ni documentación.

**Uso recomendado:** se utiliza cuando la terminal está saturada y se requiere reorden visual. No debe usarse para “ocultar errores” en evaluación, ya que el proceso debe ser explicable y trazable.

## 8. Secuencia mínima recomendada (procedimiento estándar)
Para el Nivel 1, se recomienda mantener una secuencia mínima verificable:
1) `ver alertas` (señal y priorización),
2) `ver eventos` (evidencia y patrón),
3) `bloquear ip <IP origen>` (contención),
4) `ver bloqueadas` (verificación).

Posteriormente, según la lógica del laboratorio, se genera el reporte de sesión para documentar el cierre.

Esta secuencia se considera la “columna vertebral” del nivel. La complejidad de escenarios posteriores incrementará el volumen de evidencia y la diversidad de comandos, pero el estándar metodológico se conserva: señal → evidencia → contención → verificación.

## 9. Criterios de calidad en el uso de comandos (evaluación)
Se considera un uso de comandos de alta calidad cuando:
- el orden es coherente con el ciclo metodológico,
- existe justificación explícita basada en evidencia,
- se identifica correctamente origen y patrón,
- se ejecuta verificación obligatoria,
- y se puede explicar el propósito de cada comando.

En una presentación académica, se recomienda describir el uso de comandos no como lista, sino como parte de un proceso: “primero se consultaron alertas para priorizar, luego eventos para confirmar evidencia, se aplicó contención y se verificó el resultado”.

## 10. Síntesis
El conjunto de comandos del Nivel 1 modela una práctica profesional: consultar señales, consultar evidencia, contener y verificar. El valor formativo no está en el comando en sí, sino en el método que obliga a seguir y en la capacidad del estudiante para justificar la decisión. Esta habilidad constituye la base para niveles posteriores, donde se incorporarán escenarios más complejos y se ampliará el repertorio de acciones defensivas y de análisis.