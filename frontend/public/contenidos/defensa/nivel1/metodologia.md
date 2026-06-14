# Nivel 1 — Metodología de inspección inicial

## 1. La inspección inicial como punto de partida

Antes de analizar un incidente específico, el analista defensivo necesita orientarse en el sistema. La inspección inicial responde a la pregunta: ¿cuál es el estado actual del sistema?

Este paso no busca encontrar problemas todavía. Busca establecer un baseline: qué servicios están corriendo, cuántos logs hay, qué tan activo ha sido el sistema recientemente. Con este baseline, cualquier anomalía posterior es más fácil de detectar.

## 2. Secuencia de inspección inicial del Nivel 1

### Paso 1 — Verificar la identidad y permisos del analista
```
whoami
```
Confirmar que el usuario activo tiene los permisos correctos para el análisis.

### Paso 2 — Verificar el estado de los servicios
```
systemctl status
```
Obtener una visión general de los servicios del sistema: cuáles están activos, cuáles fallaron, cuándo fue el último inicio del sistema.

### Paso 3 — Consultar el diario del sistema
```
journalctl
```
Acceder al registro centralizado del sistema a través de journald. Muestra eventos de todos los servicios en orden cronológico.

### Paso 4 — Leer el log general del sistema
```
cat /var/log/syslog
```
Lectura directa del log general para tener una segunda perspectiva sobre el estado del sistema.

## 3. Qué buscar durante la inspección inicial

**En `systemctl status`:**
- Servicios en estado `failed` que no deberían estar fallando.
- Fecha y hora del último inicio del sistema (indicador de reinicios inesperados).
- Servicios activos inesperados.

**En `journalctl` y `cat /var/log/syslog`:**
- Mensajes de nivel `ERR` o `CRIT`.
- Múltiples eventos de un mismo origen en un corto período de tiempo.
- Mensajes relacionados con autenticación o acceso de red.

## 4. Registrar lo observado

Un buen analista registra lo que observa durante la inspección inicial, incluso si no parece relevante inmediatamente. Lo que parece normal en el Nivel 1 puede convertirse en evidencia relevante en niveles posteriores.

La inspección inicial no es el análisis; es la preparación para el análisis.

## 5. Cuándo la inspección inicial es suficiente

En el Nivel 1, la inspección inicial es el ejercicio completo. El objetivo es que el estudiante se familiarice con los comandos, entienda lo que muestran y desarrolle el hábito de comenzar cualquier análisis con una visión panorámica del sistema.
