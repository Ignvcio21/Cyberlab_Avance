# Nivel 2 — Evidencia y análisis

## 1. Propósito de la evidencia en el Nivel 2

En el Nivel 2, la evidencia cumple un rol central dentro del proceso de análisis. El estudiante no debe actuar únicamente a partir de una alerta o de una impresión inicial, sino que debe revisar registros que permitan justificar técnicamente la existencia de una actividad sospechosa compatible con reconocimiento ofensivo.

En ciberseguridad, una acción defensiva sin evidencia puede provocar errores operacionales, falsos positivos o bloqueos innecesarios. Por esta razón, el laboratorio CyberLab exige que cada decisión importante sea respaldada por información observable dentro del sistema.

La evidencia se utiliza para responder preguntas como:
- ¿qué ocurrió?
- ¿desde dónde ocurrió?
- ¿qué patrón se observa?
- ¿qué servicio o recurso fue afectado?
- ¿qué acción corresponde aplicar?
- ¿cómo se verifica el resultado?

---

## 2. Diferencia entre alerta y evidencia

Una alerta representa una señal inicial generada por el sistema. Su función principal es advertir que existe un comportamiento que requiere revisión.

Sin embargo, la alerta no debe ser tratada como prueba definitiva. Puede indicar una anomalía, pero debe ser validada mediante eventos u otros registros.

Por ejemplo:

**Alerta:**  
“Posible escaneo de puertos detectado.”

**Evidencia:**  
“Múltiples conexiones desde la IP 192.168.1.120 hacia los puertos 22, 80, 443 y 8080 en un intervalo corto.”

La alerta orienta el análisis; la evidencia permite justificarlo.

---

## 3. Evidencia primaria

En este nivel, la evidencia primaria corresponde principalmente a los eventos generados por el sistema durante la simulación.

Estos eventos pueden mostrar:
- IP origen,
- tipo de actividad,
- servicio o puerto afectado,
- descripción del comportamiento,
- fecha u orden de ocurrencia,
- relación con una alerta previa.

El estudiante debe analizar estos elementos para identificar si existe un patrón compatible con reconocimiento ofensivo.

---

## 4. Patrón esperado en reconocimiento y escaneo

Un comportamiento compatible con escaneo de puertos suele presentar algunas características observables:

- múltiples intentos desde una misma IP,
- conexiones dirigidas a varios puertos,
- actividad concentrada en poco tiempo,
- búsqueda de servicios activos,
- repetición sistemática,
- ausencia de interacción normal de usuario.

Este patrón no debe interpretarse únicamente por la cantidad de eventos, sino por la relación entre ellos.

Una conexión aislada puede ser normal.  
Varias conexiones ordenadas hacia distintos puertos desde el mismo origen pueden indicar reconocimiento.

---

## 5. Registro de evidencia en el laboratorio

Durante el ejercicio, el estudiante debe considerar como evidencia mínima:

### 1) Señal inicial
La alerta generada por el sistema o la indicación del escenario.

### 2) Eventos relacionados
Los registros donde se observa actividad sospechosa.

### 3) Identificación del origen
La IP asociada al comportamiento analizado.

### 4) Interpretación del patrón
La explicación técnica de por qué los eventos se relacionan con escaneo o reconocimiento.

### 5) Acción aplicada
El comando utilizado para responder al incidente.

### 6) Verificación posterior
La comprobación de que la acción aplicada produjo un cambio de estado.

---

## 6. Ejemplo de análisis de evidencia

Un análisis correcto podría estructurarse de la siguiente manera:

**Señal:**  
Se observa una alerta asociada a posible escaneo de puertos.

**Evidencia:**  
Los eventos muestran múltiples conexiones desde una misma IP hacia diferentes puertos del sistema.

**Interpretación:**  
El comportamiento es consistente con una fase de reconocimiento activo, ya que el origen intenta identificar servicios disponibles.

**Decisión:**  
Se aplica bloqueo sobre la IP origen debido a la repetición del patrón observado.

**Verificación:**  
Se revisa el listado de IPs bloqueadas para confirmar que la medida fue aplicada correctamente.

---

## 7. Errores de interpretación

Los errores más comunes al trabajar con evidencia en este nivel son:

- asumir que toda alerta confirma automáticamente un ataque,
- bloquear sin revisar eventos,
- interpretar un evento aislado como incidente completo,
- confundir IP origen con servicio afectado,
- omitir la verificación posterior,
- no explicar el patrón observado.

Estos errores reducen la calidad del análisis porque impiden demostrar un procedimiento técnico defendible.

---

## 8. Evidencia defendible en contexto académico

Desde una perspectiva universitaria, una evidencia es defendible cuando puede ser revisada, explicada y relacionada con una decisión concreta.

No basta con decir:

“Había una alerta, entonces bloqueé la IP.”

Una explicación defendible sería:

“Se revisó la alerta inicial y luego se analizaron los eventos asociados. Estos mostraron múltiples conexiones desde una misma IP hacia distintos puertos, lo que es consistente con reconocimiento activo. Por ello se aplicó una medida de contención y posteriormente se verificó el bloqueo.”

Esta segunda respuesta demuestra método, evidencia e interpretación técnica.

---

## 9. Relación con el reporte

La evidencia obtenida durante el laboratorio debe servir como base para el reporte final del escenario. El reporte no debe limitarse a listar acciones, sino que debe explicar:
- qué se detectó,
- qué evidencia lo sostuvo,
- qué acción se aplicó,
- y cómo se verificó el resultado.

De esta manera, el ejercicio no se evalúa solo por completar el escenario, sino por demostrar capacidad de análisis y comunicación técnica.

---

## 10. Síntesis

En el Nivel 2, la evidencia permite diferenciar una reacción impulsiva de un procedimiento profesional. El estudiante debe observar señales, validar eventos, interpretar patrones y justificar cada acción aplicada.

El objetivo formativo es fortalecer la capacidad de análisis frente a actividades de reconocimiento ofensivo, manteniendo siempre una relación clara entre evidencia, decisión y verificación.