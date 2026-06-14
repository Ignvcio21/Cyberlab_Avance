# Nivel 3 — Fundamentos de detección de intrusiones

## 1. Ataques de fuerza bruta: concepto y detección

Un ataque de fuerza bruta contra SSH consiste en intentar autenticarse en el servidor probando sistemáticamente combinaciones de usuario y contraseña hasta encontrar una que funcione. Los atacantes usan herramientas automatizadas (como Hydra o Medusa) que pueden intentar miles de combinaciones por minuto.

### Indicadores en logs:
- Líneas `Failed password` en `/var/log/auth.log` con la misma IP de origen.
- Intentos consecutivos con timestamps muy próximos.
- Prueba de usuarios comunes: root, admin, user, test, ubuntu.

### Herramientas de detección:
- `grep failed /var/log/auth.log` → cuenta y lista los intentos fallidos.
- `lastb -n 20` → vista directa del historial de logins fallidos con IP, usuario y timestamp.

## 2. `lastb`: el historial de logins fallidos

El comando `lastb` (last bad logins) lee el archivo `/var/log/btmp` que registra específicamente los intentos de autenticación fallidos. Tiene un formato más limpio que buscar en `auth.log`:

```
root    ssh:notty    192.168.1.100    Sun Jun 14 03:21
admin   ssh:notty    192.168.1.100    Sun Jun 14 03:21
root    ssh:notty    192.168.1.100    Sun Jun 14 03:22
```

La opción `-n 20` limita la salida a los últimos 20 intentos.

## 3. `netstat`: estado de las conexiones de red

`netstat` muestra el estado de las conexiones de red del sistema. Con la opción `-an`, muestra todas las conexiones (tanto de entrada como de salida) en formato numérico (sin resolver nombres DNS).

Una conexión activa tiene estos estados:
- `ESTABLISHED` — conexión activa en ambos sentidos.
- `LISTEN` — el servicio local está esperando conexiones entrantes.
- `TIME_WAIT` — la conexión se está cerrando.
- `SYN_SENT` / `SYN_RECV` — la conexión está en proceso de establecimiento (puede indicar un escaneo SYN activo).

Muchas conexiones en estado `SYN_RECV` desde la misma IP pueden indicar un escaneo SYN activo.

## 4. `top`: estado de los procesos del sistema

`top -bn1` produce una instantánea estática (no interactiva) del uso de recursos por proceso. En contexto de seguridad, permite detectar:

- **Procesos con alto uso de CPU inesperado:** un proceso de minería de criptomonedas o un cracker de contraseñas correrá con CPU alta.
- **Procesos con nombres inusuales:** nombres de proceso que no corresponden a servicios instalados en el sistema.
- **Procesos corriendo bajo el usuario root inesperadamente:** un proceso no autorizado con privilegios root es una señal de alarma mayor.

## 5. Diferencia entre IDS y análisis manual

Un IDS (Intrusion Detection System) automatiza la detección de intrusiones comparando el tráfico y los logs contra patrones de ataques conocidos. El análisis manual que se practica en CyberLab replica el proceso que los IDS realizan automáticamente, pero enseña los fundamentos: qué se busca, por qué, y cómo interpretarlo.

Un analista que entiende el proceso manual puede configurar, calibrar y auditar sistemas IDS. Uno que solo opera el IDS no puede diagnosticar cuando el IDS falla o da falsos positivos.
