# Nivel 7 — Evidencia en la operación completa de SOC

## 1. La evidencia como producto central

En el Nivel 7, la evidencia no es un subproducto del análisis: es el producto central. Un analista que detectó y bloqueó un ataque pero no puede demostrar cómo lo hizo ni qué encontró ha producido la mitad del valor esperado.

El `export-report` captura la evidencia de la sesión, pero la calidad del reporte depende de la calidad del análisis previo. Sin evidencia suficiente recopilada durante el análisis, el reporte será incompleto.

## 2. Tipos de evidencia en el ciclo completo

### 2.1. Evidencia de triage
- Qué servicios estaban activos al inicio (systemctl status).
- Cuántos y qué tipo de eventos había en los logs al momento del análisis.
- Estado de las conexiones de red en el momento del triage (netstat -an).

### 2.2. Evidencia de análisis por vector
Para cada vector:
- IP de origen, tipo de ataque, comandos que lo evidenciaron.
- Cronología (primer y último evento).
- Magnitud (número de intentos para brute-force).
- Estado (con acceso exitoso o sin él).

### 2.3. Evidencia de correlación
- Si los vectores comparten origen temporal o técnicas complementarias.
- Qué evidencia soporta la conclusión de coordinación o independencia.

### 2.4. Evidencia de respuesta
- Qué IPs se bloquearon y cuándo.
- Confirmación de que las reglas se aplicaron (iptables -L INPUT -n).
- Confirmación de que la actividad cesó (tail -f /var/log/syslog).

### 2.5. Evidencia post-respuesta
- Estado del sistema después de la respuesta.
- Indicadores de compromiso residual detectados o descartados.
- Evaluación de si el incidente está completamente resuelto.

## 3. La estructura del reporte como organizador de la evidencia

El reporte de un incidente completo organiza la evidencia en una narrativa coherente:

```
[RESUMEN EJECUTIVO]
En lenguaje no técnico: qué pasó, quién fue afectado, cómo se resolvió.

[CRONOLOGÍA DEL INCIDENTE]
Lista temporal de eventos clave con timestamps.

[ANÁLISIS POR VECTOR]
Vector 1: [descripción, evidencia, impacto]
Vector 2: [descripción, evidencia, impacto]

[CORRELACIÓN]
[Coordinados / Independientes] — basado en [evidencia específica]

[RESPUESTA EJECUTADA]
[IP bloqueada, timestamp, evidencia que justificó el bloqueo]

[ESTADO FINAL]
[El sistema está completamente contenido / Riesgos residuales: ...]

[RECOMENDACIONES]
1. [Acción específica de remediación]
2. [Medida preventiva adicional]
```

## 4. La evidencia negativa también tiene valor

Si el análisis no encontró acceso exitoso del atacante, documentarlo explícitamente: "Se verificó con `netstat -an` y `top -bn1` que no hay conexiones activas ni procesos anómalos del atacante. El brute-force fue bloqueado sin éxito para el atacante." Esta conclusión negativa es tan valiosa como un hallazgo positivo.
