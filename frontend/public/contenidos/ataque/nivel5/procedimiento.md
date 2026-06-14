# Nivel 5 — Procedimiento paso a paso

## 1. Antes de comenzar

La post-explotación comienza desde una posición de acceso ya obtenido. Antes de ejecutar cualquier comando, confirma:

- ¿Qué nivel de acceso tienes en el sistema comprometido?
- ¿Cuál fue el vector de explotación que produjo este acceso?
- ¿El acceso tiene alguna limitación visible (tiempo, permisos, alcance)?

Con esto claro, comienza el mapeo del entorno interno.

---

## 2. Paso 1 — Mapear sesiones y conexiones

```
show sessions
```

Identifica qué conexiones existen desde y hacia el sistema comprometido. Anota:

- Conexiones activas con otros hosts internos.
- Sesiones de usuarios autenticados.
- Protocolos de sesión en uso.

---

## 3. Paso 2 — Identificar hosts accesibles internamente

```
show hosts
```

Construye el inventario de hosts visibles desde el punto de acceso. Este inventario define el radio de explosión potencial del compromiso.

Pregunta clave: ¿cuántos sistemas adicionales son accesibles desde aquí?

---

## 4. Paso 3 — Analizar tráfico interno

```
show traffic
```

Analiza las comunicaciones entre sistemas internos. Identifica:

- Protocolos en uso (¿hay protocolos inseguros?).
- Frecuencia de comunicación entre hosts (¿hay sistemas que se comunican constantemente?).
- Patrones inusuales que puedan indicar servicios críticos de infraestructura.

---

## 5. Paso 4 — Analizar autenticación en el entorno

```
show failed logins
```

Revisa los intentos de autenticación fallidos. Identifica:

- Servicios que reciben intentos de autenticación.
- Cuentas específicas que han sido probadas.
- Si hay actividad de enumeración de credenciales en curso.

---

## 6. Paso 5 — Identificar vectores de escalada

```
show vulnerabilities
```

Analiza si hay vulnerabilidades en el entorno que podrían permitir:

- Escalada de privilegios en el sistema comprometido.
- Explotación de sistemas accesibles desde este punto.

Prioriza vulnerabilidades locales o en hosts de la red interna.

---

## 7. Paso 6 — Evaluar la detección del entorno

```
show alerts
show events
```

Verifica si las acciones realizadas en esta sesión han generado alertas. Documenta:

- Qué acciones fueron detectadas.
- Con qué severidad se clasificaron.
- Qué acciones no generaron alertas (esto es un hallazgo relevante).

---

## 8. Paso 7 — Revisar el flujo completo

```
history
```

Revisa todos los comandos ejecutados en la sesión. Verifica que el procedimiento cubre:

- Mapeo de sesiones y hosts.
- Análisis de tráfico y autenticación.
- Identificación de vectores de escalada.
- Evaluación de detección.

---

## 9. Paso 8 — Documentar el análisis completo

```
export report
```

El reporte de cierre del Nivel 5 debe reflejar el alcance completo del análisis post-explotación. Antes de generarlo, confirma que tienes evidencia de:

- Hosts accesibles desde el punto de compromiso.
- Sesiones y tráfico analizado.
- Vectores de escalada identificados.
- Respuesta del sistema defensivo.

---

## 10. Verificación final

- [ ] `show sessions` ejecutado y sesiones documentadas.
- [ ] `show hosts` ejecutado y radio de explosión evaluado.
- [ ] `show traffic` analizado y patrones identificados.
- [ ] `show failed logins` revisado.
- [ ] `show vulnerabilities` ejecutado para escalada.
- [ ] `show alerts` y `show events` ejecutados para evaluar detección.
- [ ] `history` revisado para confirmar coherencia.
- [ ] `export report` ejecutado con el análisis completo.
