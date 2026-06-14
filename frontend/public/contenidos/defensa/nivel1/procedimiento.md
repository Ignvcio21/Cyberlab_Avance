# Nivel 1 — Procedimiento paso a paso

## 1. Objetivo del procedimiento

Completar la inspección inicial del sistema utilizando los comandos básicos disponibles en el Nivel 1, desarrollando el hábito de comenzar cualquier análisis defensivo con una visión panorámica del entorno.

---

## 2. Paso 1 — Identificarse en el sistema

```
whoami
```

Lee la salida y verifica:
- ¿Cuál es el nombre de usuario activo?
- ¿A qué grupos pertenece?
- ¿Tiene acceso sudo?

El analista de CyberLab opera como `soc-analyst` con acceso al grupo `sudo`.

---

## 3. Paso 2 — Revisar el estado de los servicios

```
systemctl status
```

Lee la salida y verifica:
- ¿Cuántos servicios están activos?
- ¿Hay algún servicio en estado `failed`?
- ¿Cuándo fue el último inicio del sistema?

Un sistema sano muestra todos sus servicios críticos en estado `active (running)`.

---

## 4. Paso 3 — Inspeccionar el diario del sistema

```
journalctl -n 50
```

Lee las últimas 50 entradas del diario y busca:
- Mensajes de error o advertencia.
- Eventos de autenticación (SSH, sudo).
- Eventos de red inusuales.

Si el volumen de eventos es bajo, ejecuta también:
```
journalctl
```

---

## 5. Paso 4 — Leer el log general del sistema

```
cat /var/log/syslog
```

Complementa la información del diario con una lectura directa del log general. Presta atención a:
- Timestamps de los eventos (¿cuándo ocurrieron?).
- Servicios que generaron los eventos (¿cuáles son los más activos?).
- Mensajes que contengan palabras como `error`, `failed`, `denied`, `refused`.

---

## 6. Verificación de completitud

- [ ] Ejecuté `whoami` y verifiqué la identidad del analista.
- [ ] Ejecuté `systemctl status` y revisé el estado de los servicios.
- [ ] Ejecuté `journalctl` y leí los eventos recientes del sistema.
- [ ] Ejecuté `cat /var/log/syslog` y leí el log general.
- [ ] Puedo describir el estado actual del sistema en una o dos frases.

---

## 7. Qué hacer si no encuentras nada anómalo

En el Nivel 1, es posible que el sistema parezca estar en un estado completamente normal. Eso también es información: significa que el sistema está en estado baseline, lo que en niveles posteriores te permitirá identificar cuándo algo cambia.

No busques problemas que no existen. Documenta lo que observaste y avanza.
