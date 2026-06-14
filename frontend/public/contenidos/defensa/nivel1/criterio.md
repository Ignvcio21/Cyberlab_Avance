# Nivel 1 — Criterio de evaluación

## 1. Descripción del nivel

El Nivel 1 evalúa la capacidad del estudiante para orientarse en el entorno de análisis defensivo y ejecutar la inspección inicial básica del sistema usando los comandos disponibles.

---

## 2. Criterios de evaluación

### 2.1. Uso de comandos de inspección (40%)
- Ejecutó `whoami` para identificar el usuario analista.
- Ejecutó `systemctl status` para revisar el estado de servicios.
- Ejecutó `journalctl` o `journalctl -n <N>` para inspeccionar el diario del sistema.
- Ejecutó `cat /var/log/syslog` para leer el log general.

### 2.2. Cobertura de la inspección (30%)
- La inspección cubrió al menos tres de los cuatro comandos básicos.
- Los comandos se ejecutaron en un orden lógico (de general a específico).
- No se saltó la inspección panorámica para ir directamente a búsquedas específicas.

### 2.3. Capacidad de interpretar la salida (30%)
- El estudiante puede describir lo que muestra cada comando.
- Identifica al menos un campo relevante en la salida de cada comando (timestamp, servicio, mensaje).
- Puede describir el estado del sistema en términos generales al finalizar la inspección.

---

## 3. Indicadores de desempeño destacado

- Ejecutó los cuatro comandos en orden lógico y leyó la salida de cada uno con atención.
- Puede formular una descripción del estado baseline del sistema basada en lo observado.
- Usó `journalctl -n <N>` con un parámetro apropiado para el volumen de eventos observado.

## 4. Indicadores de desempeño insuficiente

- No ejecutó al menos tres de los cuatro comandos básicos.
- Ejecutó los comandos sin leer su salida (evidenciado por incapacidad de describir lo que mostraron).
- Saltó la inspección panorámica para ir directamente a comandos de búsqueda específica.

---

## 5. Nota mínima de aprobación

Se requiere ejecutar correctamente al menos tres de los cuatro comandos básicos y ser capaz de describir lo que muestra cada uno para aprobar el nivel.
