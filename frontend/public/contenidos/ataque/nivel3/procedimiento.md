# Nivel 3 — Procedimiento paso a paso

## 1. Antes de comenzar

Antes de ejecutar cualquier comando de enumeración, verifica que tienes clara la información del reconocimiento inicial:

- ¿Qué hosts identificaste como activos?
- ¿Qué puertos detectaste abiertos?
- ¿Hay algún host que presentó comportamiento inusual en el tráfico?

Si no tienes esa información disponible, ejecuta primero `show hosts` para confirmar qué objetivos existen en el entorno.

---

## 2. Paso 1 — Identificar hosts activos

```
show hosts
```

Lee la salida completa. Identifica cuántos hosts están activos y cuál es su comportamiento visible. No asumas que todos los hosts tienen el mismo nivel de interés ofensivo.

**Pregunta clave:** ¿cuál de estos hosts parece tener más servicios activos o más exposición?

---

## 3. Paso 2 — Enumerar servicios expuestos

```
show services
```

Analiza cada servicio listado:

- ¿Qué protocolo utiliza?
- ¿Qué puerto ocupa?
- ¿Qué banner o información visible ofrece?
- ¿Qué tecnología sugiere?

No ejecutes el siguiente paso hasta haber interpretado al menos parcialmente la salida de este comando.

---

## 4. Paso 3 — Analizar tráfico de red observable

```
show traffic
```

El tráfico observable puede revelar:

- protocolos activos entre hosts,
- comunicaciones periódicas que sugieren servicios automatizados,
- patrones de comportamiento que indican la función de cada host.

Relaciona lo que ves en el tráfico con los servicios identificados en el paso anterior.

---

## 5. Paso 4 — Investigar el host objetivo

```
resolve host
```

Obtén información de contexto sobre el host principal identificado:

- ¿Tiene nombre de dominio registrado?
- ¿Qué información de red es visible?
- ¿El host parece parte de una infraestructura más amplia?

---

## 6. Paso 5 — Analizar la ruta de acceso

```
trace ip
```

Analiza el camino de red hacia el objetivo:

- ¿Cuántos saltos hay?
- ¿Hay dispositivos intermedios visibles (routers, firewalls)?
- ¿La latencia sugiere que el objetivo está en otra red?

Esta información es relevante para determinar qué técnicas de acceso son viables en fases posteriores.

---

## 7. Paso 6 — Revisar sesiones activas

```
show sessions
```

Las sesiones activas revelan qué conexiones existen en el entorno actualmente. En enumeración, esto permite:

- identificar usuarios o servicios que están comunicando activamente,
- detectar patrones de autenticación,
- observar qué protocolos de sesión están en uso.

---

## 8. Paso 7 — Revisar intentos de acceso fallidos

```
show failed logins
```

Los intentos de autenticación fallidos revelan:

- qué servicios de autenticación están activos y accesibles,
- si hay actividad de enumeración previa en el entorno,
- qué cuentas o credenciales han sido probadas.

---

## 9. Paso 8 — Correlacionar y documentar

Con toda la información recopilada, realiza la correlación:

- ¿Qué servicios están asociados a cada host?
- ¿Hay servicios que sugieren tecnologías vulnerables?
- ¿Qué combinación de servicios produce mayor superficie de ataque?

Revisa el flujo completo:

```
history
```

Confirma que el procedimiento es coherente y no tiene pasos omitidos.

---

## 10. Paso 9 — Generar el reporte de enumeración

```
export report
```

Cierra la sesión con el reporte formal. El reporte debe reflejar todos los hallazgos de la enumeración: servicios identificados, tecnologías detectadas, correlaciones realizadas.

---

## 11. Verificación final

- [ ] `show hosts` ejecutado y analizado.
- [ ] `show services` ejecutado con interpretación de cada servicio.
- [ ] `show traffic` revisado y correlacionado con servicios.
- [ ] `resolve host` y `trace ip` ejecutados para el objetivo principal.
- [ ] `show sessions` y `show failed logins` revisados.
- [ ] `history` revisado para confirmar coherencia del flujo.
- [ ] `export report` ejecutado como cierre formal.
