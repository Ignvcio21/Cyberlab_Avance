# Nivel 5 — Comandos de post-explotación

## 1. Contexto operacional

En el Nivel 5, todos los comandos de niveles anteriores siguen disponibles. El foco se amplía hacia los comandos que permiten mapear el entorno interno y analizar el alcance real del acceso obtenido. Los comandos de post-explotación buscan responder: ¿qué puede hacer un atacante desde aquí?

---

## 2. Comando: `show sessions`

### Propósito operacional
Lista las sesiones de red activas en el entorno. En post-explotación, permite identificar qué conexiones existen desde y hacia el sistema comprometido, qué usuarios están autenticados y qué servicios mantienen sesiones abiertas.

### Sintaxis
```
show sessions
```

### Interpretación en post-explotación
- Conexiones activas revelan qué sistemas están comunicando con el host comprometido.
- Usuarios autenticados pueden indicar cuentas con acceso que podrían ser aprovechadas.
- Sesiones de administración abiertas son especialmente relevantes: si un administrador tiene sesión activa, puede haber credenciales o tokens accesibles en memoria.

### Uso recomendado
Ejecutar inmediatamente después de obtener acceso para mapear el entorno de conexiones antes de realizar cualquier otra acción.

---

## 3. Comando: `show traffic`

### Propósito operacional
Muestra el tráfico de red observable en el entorno. En post-explotación, permite analizar las comunicaciones internas entre sistemas, identificar protocolos en uso y detectar patrones de infraestructura.

### Sintaxis
```
show traffic
```

### Interpretación en post-explotación
- Tráfico entre hosts internos revela la topología de red interna.
- Comunicaciones periódicas (backups, monitoreo, sincronización) pueden indicar otros sistemas de la infraestructura.
- Protocolos inseguros en uso interno (telnet, FTP, HTTP sin cifrado) son hallazgos relevantes que se reportan como riesgo adicional.

### Uso recomendado
Analizar el tráfico interno como parte del mapeo del entorno. Correlacionar con `show hosts` para construir una imagen de la red interna.

---

## 4. Comando: `show hosts`

### Propósito operacional
Lista los hosts identificados en el entorno. En post-explotación, se usa para determinar qué otros sistemas son visibles y potencialmente accesibles desde el punto de compromiso.

### Sintaxis
```
show hosts
```

### Interpretación en post-explotación
- Hosts adicionales al objetivo inicial representan posibles destinos de movimiento lateral.
- La cantidad de hosts accesibles define el radio de explosión del compromiso.
- Hosts con servicios de administración visibles (SSH, RDP, WinRM) son candidatos prioritarios para movimiento lateral.

---

## 5. Comando: `show failed logins`

### Propósito operacional
Lista intentos de autenticación fallidos en el entorno. En post-explotación, permite detectar qué cuentas han sido probadas, qué servicios de autenticación están activos y si hay actividad de enumeración o fuerza bruta en curso.

### Sintaxis
```
show failed logins
```

### Interpretación en post-explotación
- Intentos fallidos en múltiples servicios pueden indicar que otro actor está realizando reconocimiento en el mismo entorno.
- Cuentas específicamente probadas pueden ser objetivos de interés para el análisis.
- Servicios que aparecen frecuentemente en intentos fallidos son candidatos para análisis de autenticación.

---

## 6. Comando: `show vulnerabilities`

### Propósito operacional
En el contexto de post-explotación, `show vulnerabilities` puede revelar vulnerabilidades locales en el sistema comprometido que permiten escalada de privilegios, o vulnerabilidades en otros sistemas visibles desde el punto de acceso.

### Sintaxis
```
show vulnerabilities
```

### Interpretación en post-explotación
- Vulnerabilidades locales en el sistema comprometido son vectores de escalada de privilegios.
- Vulnerabilidades en sistemas accesibles desde el host comprometido son oportunidades de movimiento lateral asistido por explotación.

---

## 7. Comando: `show alerts`

### Propósito operacional
Verifica si las acciones de post-explotación generaron alertas en el sistema defensivo del entorno.

### Sintaxis
```
show alerts
```

### Importancia en post-explotación
La presencia o ausencia de alertas durante la post-explotación es un indicador crítico de la madurez defensiva del entorno. Un sistema que no genera alertas ante post-explotación activa tiene una brecha defensiva que debe reportarse como hallazgo independiente.

---

## 8. Comando: `export report`

### Propósito en post-explotación
El reporte de cierre del Nivel 5 debe ser el más completo del ciclo. Incluye no solo la explotación inicial sino el alcance completo del compromiso: mapeo interno, escalada, movimiento lateral evaluado e impacto en CIA.

### Sintaxis
```
export report
```

---

## 9. Secuencia recomendada

```
show sessions          → mapear conexiones activas
show hosts             → identificar hosts accesibles internamente
show traffic           → analizar comunicaciones internas
show failed logins     → detectar patrones de autenticación
show vulnerabilities   → identificar vectores de escalada local
show alerts            → evaluar respuesta defensiva
show events            → verificar evidencia generada
history                → revisar coherencia del flujo
export report          → documentar el análisis completo
```
