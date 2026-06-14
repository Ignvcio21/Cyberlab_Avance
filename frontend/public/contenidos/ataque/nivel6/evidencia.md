# Nivel 6 — Evidencia en análisis multi-vector

## 1. La complejidad de la evidencia en multi-vector

En escenarios de vector único, la evidencia puede organizarse de forma lineal: eventos de una IP, alertas de un tipo, bloqueo de una dirección. En multi-vector, la evidencia debe organizarse por vector y luego correlacionarse. Un reporte que mezcla evidencia de ambos vectores sin distinguirlos es confuso y menos útil para el cliente.

## 2. Tipos de evidencia específicos del Nivel 6

### 2.1. Evidencia de identificación de vectores
- Listado de IPs que generaron alertas y eventos, con la frecuencia y tipo de actividad de cada una.
- Resultado de `resolve host` para cada IP maliciosa identificada, confirmando su naturaleza.
- Comparación entre IPs maliciosas y tráfico legítimo: qué los diferencia.

### 2.2. Evidencia de correlación inter-vector
- Análisis temporal: ¿cuándo comenzó la actividad de cada vector?
- Análisis de objetivo: ¿a qué hosts apunta cada vector?
- Análisis de técnica: ¿qué métodos usa cada vector?
- Conclusión de correlación: ¿coordinados o independientes? Con qué base.

### 2.3. Evidencia de contención
- Listado de IPs bloqueadas con `show blocked`.
- Verificación post-bloqueo: ausencia de alertas y eventos de las IPs bloqueadas.

### 2.4. Evidencia de impacto combinado
- Qué daño podría haber producido cada vector individualmente.
- Qué daño adicional produce la combinación de ambos vectores (efecto multiplicador o efecto independiente).

## 3. Organización de la evidencia en el reporte

El reporte de un incidente multi-vector debe organizarse claramente:

**Sección 1: Vector A**
- Identificación
- Técnicas usadas
- Objetivos atacados
- Evidencia de detección y contención

**Sección 2: Vector B**
- Idem Vector A

**Sección 3: Correlación**
- Relación entre Vector A y B
- Impacto combinado

Esta estructura permite al lector del reporte entender cada vector de forma independiente antes de comprender cómo se relacionan.

## 4. La evidencia de lo que NO es malicioso

En multi-vector, documentar qué tráfico es legítimo es tan importante como documentar qué es malicioso. Esto demuestra que el análisis fue completo y que no hubo falsos positivos que llevaron a bloquear actividad legítima.
