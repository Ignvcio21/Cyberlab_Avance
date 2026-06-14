# Nivel 4 — Procedimiento paso a paso

## 1. Antes de comenzar

Verifica que tienes clara la información acumulada en niveles anteriores:

- ¿Qué hosts identificaste como activos en el reconocimiento?
- ¿Qué servicios y versiones detectaste en la enumeración?
- ¿Hay algún servicio con versión desactualizada o configuración inusual?

Si no tienes esta información fresca, revisa el historial de sesión con `history` antes de continuar. La explotación mal informada es el error más costoso en pentesting.

---

## 2. Paso 1 — Identificar vulnerabilidades del entorno

Ejecuta el comando principal del nivel:

```
show vulnerabilities
```

Lee la salida completa. No actúes sobre la primera entrada visible. Analiza todas las vulnerabilidades listadas y registra mentalmente (o en papel):

- cuáles afectan servicios accesibles,
- cuáles tienen mayor severidad,
- cuáles parecen tener condiciones de explotación cumplidas.

**No ejecutes ninguna técnica de explotación todavía.** Este paso es únicamente de análisis.

---

## 3. Paso 2 — Investigar el objetivo antes de intervenir

Ejecuta en orden:

```
resolve host
trace ip
```

Interpreta los resultados:

- ¿Cuál es el contexto de red del objetivo?
- ¿Hay dispositivos intermedios visibles en el trace?
- ¿La IP tiene historial de actividad relevante?

Esta información puede afectar la selección de técnica. Un objetivo detrás de un firewall activo puede requerir una técnica diferente a uno directamente accesible.

---

## 4. Paso 3 — Seleccionar la vulnerabilidad prioritaria

Con la información de los pasos 1 y 2, selecciona la vulnerabilidad que vas a explotar primero. El criterio de selección debe ser:

1. **Mayor severidad** entre las que tengan condiciones cumplidas.
2. **Vector remoto** preferido sobre local.
3. **Servicio accesible** confirmado en enumeración previa.

Si tienes dudas entre dos vulnerabilidades similares, selecciona la que produce mayor impacto potencial (acceso a datos, ejecución de código, escalada de privilegios).

---

## 5. Paso 4 — Ejecutar la técnica de explotación

Aplica la técnica correspondiente a la vulnerabilidad seleccionada. Dentro del entorno de CyberLab, los comandos disponibles modelan las técnicas de explotación más representativas del nivel.

Ejecuta una acción a la vez. Después de cada comando, revisa la salida antes de continuar.

Si la técnica no produce el resultado esperado, analiza la salida para entender por qué antes de intentar una alternativa. Las causas más frecuentes de fallo son:

- condiciones del entorno no cumplidas (versión diferente a la esperada),
- control de seguridad activo que bloqueó la técnica,
- error en el formato del comando.

---

## 6. Paso 5 — Verificar el resultado con evidencia

Inmediatamente después de la explotación, ejecuta:

```
show events
```

Analiza si la actividad de la explotación generó eventos registrables. Luego:

```
show alerts
```

Verifica si el sistema objetivo generó alertas como respuesta a la técnica aplicada. La presencia de alertas indica que el sistema tiene capacidad de detección activa — este es un hallazgo secundario relevante que debe incluirse en el informe.

---

## 7. Paso 6 — Revisar el flujo completo

Antes de generar el reporte, ejecuta:

```
history
```

Revisa que el procedimiento ejecutado es coherente con la metodología: identificación → contexto → selección → ejecución → verificación. Si hay pasos omitidos, considera si es necesario completarlos antes del cierre.

---

## 8. Paso 7 — Documentar y cerrar

Cuando hayas verificado el resultado y estés satisfecho con la calidad del análisis:

```
export report
```

Este comando genera el reporte de cierre. Revisa que la salida incluya la información relevante: eventos registrados, alertas detectadas, acciones ejecutadas.

El reporte es el entregable formal del ejercicio. Un procedimiento técnico sin reporte equivale a un análisis sin resultado documentado.

---

## 9. Verificación final del procedimiento

Antes de marcar el ejercicio como completo, confirma:

- [ ] `show vulnerabilities` ejecutado y analizado.
- [ ] `resolve host` y `trace ip` ejecutados para contextualizar el objetivo.
- [ ] Técnica de explotación aplicada sobre la vulnerabilidad seleccionada.
- [ ] `show events` revisado para verificar evidencia.
- [ ] `show alerts` revisado para evaluar detección del sistema.
- [ ] `history` revisado para confirmar coherencia del flujo.
- [ ] `export report` ejecutado como cierre formal.

Si todos los ítems están completados, el procedimiento del Nivel 4 está finalizado.
