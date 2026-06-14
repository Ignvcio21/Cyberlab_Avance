# Nivel 4 — Comandos de explotación y verificación

## 1. Introducción operacional

El Nivel 4 introduce el comando central de la fase de explotación: `show vulnerabilities`. A diferencia de los comandos de reconocimiento y enumeración de niveles anteriores, los comandos de este nivel están orientados a identificar debilidades concretas, contextualizar el objetivo antes de intervenir y documentar el resultado formal del análisis.

Los comandos del nivel anterior (`show hosts`, `show services`, `show sessions`, entre otros) siguen disponibles y pueden utilizarse como parte del flujo, especialmente en la etapa de revisión previa a la explotación.

---

## 2. Comando principal: `show vulnerabilities`

### Propósito operacional

`show vulnerabilities` lista las vulnerabilidades detectadas por el sistema en el entorno analizado. Cada entrada incluye el servicio afectado, la descripción técnica de la debilidad y su nivel de severidad.

Este es el comando más importante del Nivel 4. Marca la transición del análisis pasivo (observar servicios) al análisis activo (identificar debilidades explotables).

### Sintaxis

```
show vulnerabilities
```

### Interpretación de resultados

La salida de `show vulnerabilities` presenta entradas organizadas por severidad o servicio. El analista debe interpretar cada entrada considerando:

- **¿Qué servicio está afectado?** Relacionar con los servicios detectados en etapas previas.
- **¿Cuál es la naturaleza de la debilidad?** ¿Configuración incorrecta, versión vulnerable, credenciales débiles?
- **¿Cuál es el vector de acceso?** ¿La vulnerabilidad es remota o requiere acceso previo?
- **¿Cuál es el impacto potencial?** ¿Permite acceso de lectura, escritura, ejecución de código, escalada de privilegios?

### Uso recomendado

Ejecutar al comienzo de la sesión de explotación, tras revisar la información de reconocimiento y enumeración. La salida debe analizarse en su totalidad antes de tomar decisiones de priorización.

### Error común

Ejecutar el primer exploit visible sin analizar todas las vulnerabilidades listadas. Es frecuente que la vulnerabilidad de mayor severidad no sea la más explotable en el entorno específico, y que una de menor puntuación sea más accesible y produzca mayor impacto real.

---

## 3. Comando: `resolve host`

### Propósito operacional

Proporciona información de resolución DNS, reputación y contexto de red del host objetivo. En la fase de explotación, se utiliza para confirmar la identidad técnica del objetivo antes de intervenir.

### Sintaxis

```
resolve host
```

### Interpretación en contexto de explotación

La información de `resolve host` es útil para:

- Confirmar que el host objetivo es el correcto antes de ejecutar técnicas agresivas.
- Identificar si la IP presenta reputación negativa en bases de datos externas (lo que podría indicar actividad maliciosa previa o que el host ya está comprometido).
- Contextualizar el activo dentro de la infraestructura antes de intervenir.

### Uso recomendado

Ejecutar antes de aplicar la primera técnica de explotación. No requiere repetición en la misma sesión salvo que se cambie de objetivo.

---

## 4. Comando: `trace ip`

### Propósito operacional

Analiza el camino de red entre el punto de origen del análisis y el host objetivo. Permite identificar saltos intermedios, posibles dispositivos de filtrado (firewalls, proxies, IDS/IPS) y la posición del objetivo dentro de la topología de red.

### Sintaxis

```
trace ip
```

### Interpretación en contexto de explotación

En explotación, `trace ip` ayuda a:

- Identificar si existe algún dispositivo intermedio que podría bloquear el vector de ataque seleccionado.
- Estimar la latencia de red, que puede afectar técnicas dependientes de tiempo.
- Comprender la topología general antes de seleccionar un vector de explotación remoto.

### Uso recomendado

Ejecutar cuando la explotación planificada depende de conectividad directa con el objetivo. Complementa la información de `resolve host`.

---

## 5. Comando: `show events`

### Propósito operacional

Lista los eventos generados en el entorno durante la sesión activa. En el contexto de explotación, permite verificar si la técnica ejecutada produjo actividad observable en el sistema objetivo.

### Sintaxis

```
show events
```

### Uso en explotación

Después de ejecutar cualquier técnica de explotación, `show events` permite:

- Confirmar que la acción produjo actividad registrada en el sistema.
- Identificar si el sistema generó alertas de detección como respuesta a la técnica aplicada.
- Obtener evidencia observable del resultado de la explotación.

Este comando es parte obligatoria de la verificación post-explotación.

---

## 6. Comando: `show alerts`

### Propósito operacional

Lista las alertas generadas por el sistema durante la sesión. En explotación, permite identificar si el sistema objetivo tiene mecanismos de detección activos que respondieron a las técnicas aplicadas.

### Sintaxis

```
show alerts
```

### Interpretación

Si el sistema genera alertas durante la explotación, el analista puede evaluar:

- Qué técnica fue detectada.
- Con qué severidad fue clasificada la detección.
- Qué tipo de control de seguridad está activo en el objetivo.

En una evaluación profesional, la capacidad del sistema para detectar la explotación es un hallazgo relevante por sí mismo, independientemente de si la explotación fue exitosa.

---

## 7. Comando: `history`

### Propósito operacional

Muestra el historial de comandos ejecutados en la sesión actual.

### Sintaxis

```
history
```

### Uso en explotación

En una sesión de explotación, `history` permite:

- Revisar el flujo de trabajo ejecutado hasta el momento.
- Identificar si algún paso fue omitido.
- Preparar la documentación del procedimiento para el informe final.

---

## 8. Comando: `export report`

### Propósito operacional

Genera el reporte de cierre de la sesión. Consolida datos de la sesión activa: eventos registrados, alertas detectadas, IPs analizadas, acciones ejecutadas y resumen general.

### Sintaxis

```
export report
```

### Importancia en el Nivel 4

En este nivel, `export report` no es solo el cierre formal del ejercicio: es el entregable principal. La calidad del análisis de explotación se mide también por la calidad del reporte generado. El analista debe ejecutarlo después de completar todas las etapas del ciclo metodológico, no antes.

### Error común

Ejecutar `export report` antes de haber verificado los resultados de la explotación. Un reporte generado antes de la verificación puede carecer de evidencia suficiente y resultar incompleto para una evaluación formal.

---

## 9. Secuencia de comandos recomendada para el nivel

```
show vulnerabilities        → identificar vulnerabilidades del entorno
resolve host                → contextualizar el objetivo
trace ip                    → analizar conectividad y topología
[técnica según nivel]       → ejecución de la explotación
show events                 → verificar evidencia generada
show alerts                 → evaluar detección del sistema
history                     → revisar flujo de trabajo
export report               → documentar y cerrar el análisis
```

Esta secuencia implementa las seis etapas metodológicas del nivel. Cada paso tiene un propósito específico dentro del ciclo y no debe omitirse sin justificación técnica.
