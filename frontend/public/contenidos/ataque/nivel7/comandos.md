# Nivel 7 — Comandos disponibles: síntesis operacional

## 1. El inventario de comandos como decisión estratégica

En el Nivel 7, todos los comandos disponibles en los niveles anteriores están activos. La decisión no es "¿qué comando existe para esto?" sino "¿qué comando necesito ahora y por qué?". Esta sección organiza los comandos por rol operacional dentro de un pentest completo.

---

## 2. Comandos de reconocimiento e inventario

| Comando | Rol en pentest |
|---|---|
| `show hosts` | Inventario inicial de activos en alcance |
| `show events` | Actividad histórica y en curso |
| `show alerts` | Alertas activas por prioridad |
| `show traffic` | Flujos de red en tiempo real |
| `show sessions` | Conexiones activas por vector |
| `show blocked` | Verificar estado de bloqueos activos |

**Cuándo usarlos:** al inicio de la operación para mapeo del entorno. Periódicamente para verificar cambios de estado.

---

## 3. Comandos de análisis y caracterización

| Comando | Rol en pentest |
|---|---|
| `resolve host` | Caracterizar una IP (reputación, DNS reverso) |
| `trace ip` | Analizar ruta de red de un vector |

**Cuándo usarlos:** cuando se necesita confirmar o refutar la hipótesis de que una IP es maliciosa. Siempre antes de tomar acciones de bloqueo.

---

## 4. Comandos de respuesta y contención

| Comando | Rol en pentest |
|---|---|
| `block ip <ip>` | Bloquear un vector malicioso confirmado |

**Cuándo usarlos:** después de que la evidencia confirme actividad maliciosa. Nunca como primera acción. Siempre verificar con `show blocked` después.

---

## 5. Comandos de documentación

| Comando | Rol en pentest |
|---|---|
| `history` | Revisar la secuencia completa de la operación |
| `export report` | Generar reporte del pentest |

**Cuándo usarlos:** al finalizar la operación, antes de cerrar la sesión.

---

## 6. Secuencia típica de un pentest en Nivel 7

```
[PLANIFICACIÓN]
(definición mental del alcance y orden de fases)

[RECONOCIMIENTO]
show hosts
show events
show alerts
show traffic

[ANÁLISIS Y CARACTERIZACIÓN]
resolve host       → para cada IP sospechosa
trace ip           → para correlacionar vectores
show sessions      → para entender conexiones activas

[CONTENCIÓN]
block ip <ip1>
show blocked
block ip <ip2>     → si hay más de un vector
show blocked

[VERIFICACIÓN]
show alerts
show events
show sessions

[DOCUMENTACIÓN]
history
export report
```

---

## 7. Sobre el orden de los comandos

No hay un único orden correcto. El orden depende de lo que el reconocimiento revela:

- Si el triage muestra alertas críticas activas, el análisis de esas alertas tiene prioridad.
- Si el triage muestra tráfico anómalo sin alertas, el análisis de tráfico tiene prioridad.
- Si el triage muestra pocos eventos pero sospechosos, la caracterización de IPs tiene prioridad.

La capacidad de decidir el orden según la evidencia disponible es el criterio central del Nivel 7.
