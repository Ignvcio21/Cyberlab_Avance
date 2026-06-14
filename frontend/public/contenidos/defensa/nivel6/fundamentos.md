# Nivel 6 — Fundamentos del análisis multi-vector defensivo

## 1. El modelo de amenaza multi-vector

Los atacantes avanzados coordinan múltiples técnicas de ataque para maximizar su probabilidad de éxito y dificultar la detección. Los patrones más comunes incluyen:

### 1.1. Distracción y ataque principal
Un vector genera ruido visible (fuerza bruta SSH con alto volumen de alertas) mientras el vector principal opera más silenciosamente (reconocimiento web, explotación de una vulnerabilidad diferente). El analista ocupado respondiendo al ruido puede perder el ataque real.

### 1.2. Reconocimiento distribuido
Múltiples IPs realizan reconocimiento sobre diferentes partes del sistema para evitar que los logs de una sola IP muestren un patrón completo.

### 1.3. Fuerza bruta paralela
Varios atacantes (o la misma herramienta desde múltiples IPs) intentan brute-force simultáneamente para acelerar el proceso y dividir la carga entre múltiples orígenes.

## 2. Cómo identificar múltiples vectores

### 2.1. Análisis de distribución de IPs en logs
```
grep failed /var/log/auth.log
```
En multi-vector, la salida mostrará múltiples IPs de origen. El analista debe agrupar mentalmente los eventos por IP para separar los vectores.

### 2.2. Análisis de netstat con múltiples conexiones
```
netstat -an
```
Conexiones activas o semiabiertas desde múltiples IPs distintas indican múltiples vectores simultáneos.

### 2.3. Análisis del syslog con múltiples tipos de evento
```
cat /var/log/syslog
grep -i crit /var/log/syslog
```
Un syslog con eventos de brute-force, escaneo Y alertas de integridad de archivos simultáneos indica múltiples vectores en diferentes fases.

## 3. Correlación inter-vector

La correlación entre vectores responde a preguntas como:

- **Coordinación temporal:** ¿comenzaron los vectores al mismo tiempo? Inicio simultáneo sugiere coordinación.
- **Técnicas complementarias:** ¿uno hace reconocimiento y otro hace explotación? Técnicas complementarias sugieren un ataque en etapas.
- **Objetivos distintos:** ¿cada vector ataca un servicio diferente? Objetivos distintos pueden indicar actores independientes.

## 4. Priorización de la respuesta

Con múltiples vectores, el analista debe priorizar:

1. **Vector con acceso activo confirmado:** conexión ESTABLISHED o proceso anómalo activo.
2. **Vector más avanzado:** más cerca de obtener acceso exitoso.
3. **Vector de mayor impacto potencial:** ataca el servicio más crítico.
4. **Vector de reconocimiento:** menor urgencia, pero debe documentarse.

## 5. La gestión del firewall en multi-vector

Con múltiples IPs maliciosas, `iptables -L INPUT -n` debe mostrar múltiples reglas DROP al finalizar la respuesta:

```
Chain INPUT (policy ACCEPT)
DROP    all   --   192.168.1.100    0.0.0.0/0
DROP    all   --   10.0.0.55        0.0.0.0/0
```

Esto confirma que todos los vectores identificados fueron contenidos.
