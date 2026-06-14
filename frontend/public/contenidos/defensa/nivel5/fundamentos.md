# Nivel 5 — Fundamentos de respuesta con iptables

## 1. Cómo funciona iptables

`iptables` filtra el tráfico de red según reglas organizadas en cadenas y tablas.

### Cadenas principales:
- **INPUT** — tráfico entrante al servidor (el más relevante para respuesta defensiva).
- **OUTPUT** — tráfico saliente del servidor.
- **FORWARD** — tráfico que pasa a través del servidor (routing).

### Tablas:
- **filter** — filtrado de paquetes (tabla por defecto, la que se usa en respuesta a incidentes).
- **nat** — traducción de direcciones de red.
- **mangle** — modificación de cabeceras de paquetes.

En respuesta a incidentes básica, siempre se trabaja con la tabla `filter` y la cadena `INPUT`.

## 2. El comando de bloqueo

```
iptables -A INPUT -s 192.168.1.100 -j DROP
```

Desglose:
- `-A INPUT` — añadir (`-A`) una regla al final de la cadena INPUT.
- `-s 192.168.1.100` — origen (`-s source`) del tráfico: la IP del atacante.
- `-j DROP` — acción (`-j jump`): descartar el paquete silenciosamente.

`DROP` descarta el paquete sin enviar respuesta al emisor. Esto hace que el atacante no sepa si fue bloqueado o si el servidor simplemente no responde.

Alternativa: `-j REJECT` también bloquea, pero envía un mensaje de error al origen. En la práctica, `DROP` es preferible para no dar información al atacante.

## 3. Verificación de reglas

```
iptables -L INPUT -n
```

- `-L INPUT` — listar (`-L`) las reglas de la cadena INPUT.
- `-n` — formato numérico (sin resolver DNS, más rápido y más claro).

Salida típica después de un bloqueo:
```
Chain INPUT (policy ACCEPT)
target  prot  opt  source           destination
DROP    all   --   192.168.1.100    0.0.0.0/0
```

La línea `DROP all -- 192.168.1.100 0.0.0.0/0` confirma que todo el tráfico desde 192.168.1.100 será descartado.

## 4. Eliminación de una regla

```
iptables -D INPUT -s 192.168.1.100 -j DROP
```

- `-D INPUT` — eliminar (`-D delete`) una regla de la cadena INPUT.
- El resto del comando debe ser idéntico a la regla que se desea eliminar.

Se usa cuando el bloqueo fue un error (falso positivo) o cuando ya no es necesario.

## 5. Diferencia entre bloqueo y remediación

El bloqueo de una IP es contención, no remediación. Significa que el atacante específico está bloqueado, pero la vulnerabilidad que intentó explotar puede seguir existiendo. La remediación completa implica:

- Cambiar contraseñas débiles (si hubo brute-force exitoso).
- Cerrar servicios innecesarios.
- Implementar fail2ban para bloqueo automático de ataques de fuerza bruta.
- Revisar si el atacante dejó backdoors antes de ser bloqueado.

En el Nivel 5, el foco es el bloqueo como primera respuesta. La remediación completa se trabaja en niveles más avanzados.
