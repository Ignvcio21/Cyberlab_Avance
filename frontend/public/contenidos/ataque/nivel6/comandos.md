# Nivel 6 — Comandos para análisis multi-vector

## 1. Contexto operacional

En el Nivel 6, todos los comandos anteriores están disponibles. La diferencia está en cómo usarlos: en vez de ejecutarlos secuencialmente para un único vector, deben usarse para analizar múltiples fuentes de actividad simultánea, discriminar entre ellas y correlacionar la evidencia.

El desafío no es aprender comandos nuevos, sino aplicar los comandos conocidos con mayor criterio analítico bajo mayor complejidad.

---

## 2. Comandos de triage inicial

### `show alerts`
En multi-vector, la salida de `show alerts` puede contener alertas de múltiples IPs simultáneamente. El analista debe identificar cuántas IPs distintas generan alertas y qué tipo de alerta genera cada una.

**Uso en Nivel 6:** ejecutar al inicio para triage. Luego ejecutar periódicamente para detectar nuevas alertas que indiquen escalada de algún vector.

### `show events`
Con múltiples vectores, `show events` mostrará eventos de varias IPs. El analista debe agrupar mentalmente los eventos por IP de origen para separar los vectores.

**Uso en Nivel 6:** ejecutar al inicio para volumetría y luego para verificar resultados de acciones específicas.

### `show traffic`
En multi-vector, el tráfico proviene de múltiples fuentes. Identificar cuáles flujos corresponden a actividad maliciosa requiere comparar las IPs visibles en el tráfico con las IPs identificadas en eventos y alertas.

**Uso en Nivel 6:** análisis de flujos para separar tráfico maliciosa de tráfico legítimo.

---

## 3. Comandos de caracterización por vector

### `resolve host`
Ejecutar para cada IP sospechosa identificada en los eventos. La información de reputación y resolución DNS permite confirmar si una IP corresponde a un vector maliciosa real o a tráfico legítimo.

**Uso en Nivel 6:** ejecutar para cada IP relevante identificada en el triage, no solo para una.

### `trace ip`
Permite analizar el camino de red de cada vector. Vectores de un mismo actor coordinado pueden mostrar rutas similares; vectores independientes tendrán rutas completamente distintas.

**Uso en Nivel 6:** puede revelar si dos vectores comparten infraestructura de red (indicador de coordinación).

---

## 4. Comandos de respuesta y contención

### `block ip <ip>`
En multi-vector, se aplica a cada IP maliciosa confirmada. El orden importa: bloquear primero el vector más activo o peligroso, luego el secundario.

**Uso en Nivel 6:** después de confirmar la identidad de cada IP maliciosa con evidencia.

```
block ip <ip-vector-1>
block ip <ip-vector-2>
```

### `show blocked`
Verifica que todos los vectores maliciosos fueron bloqueados correctamente.

```
show blocked
```

---

## 5. Comandos de verificación post-respuesta

### `show alerts` (segunda ejecución)
Después del bloqueo, verifica que ya no se generan alertas de las IPs bloqueadas. Si siguen apareciendo alertas de una IP bloqueada, puede indicar un problema de aplicación del bloqueo o la presencia de un tercer vector.

### `show events` (segunda ejecución)
Confirma que los eventos de las IPs bloqueadas cesaron.

---

## 6. Documentación

### `history`
Revisar el historial es especialmente importante en multi-vector porque la sesión puede ser más larga y compleja que en niveles anteriores.

### `export report`
El reporte del Nivel 6 debe reflejar el análisis de múltiples vectores, no solo el resultado final. La estructura del reporte debe permitir entender qué pasó con cada vector de forma separada y luego en conjunto.

---

## 7. Secuencia recomendada para análisis multi-vector

```
[TRIAGE]
show alerts            → identificar cuántos vectores generan alertas
show events            → agrupar eventos por IP de origen
show traffic           → separar tráfico malicioso de legítimo

[CARACTERIZACIÓN]
resolve host           → para cada IP sospechosa
trace ip               → para analizar si los vectores comparten infraestructura

[CORRELACIÓN]
show hosts             → confirmar qué hosts son objetivo de cada vector
show sessions          → sesiones activas por vector

[RESPUESTA]
block ip <ip1>         → bloquear primer vector confirmado
block ip <ip2>         → bloquear segundo vector confirmado
show blocked           → verificar contención

[VERIFICACIÓN]
show alerts            → confirmar que cesó la actividad maliciosa
show events            → confirmar ausencia de nuevos eventos maliciosos

[DOCUMENTACIÓN]
history                → revisar coherencia del flujo
export report          → documentar el incidente multi-vector completo
```
