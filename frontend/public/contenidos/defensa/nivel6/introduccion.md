# Nivel 6 — Análisis multi-vector defensivo

## 1. La complejidad del atacante avanzado

En los niveles anteriores, cada escenario presentaba un tipo de ataque predominante: fuerza bruta SSH, escaneo de puertos, acceso web. En la realidad, los atacantes avanzados rara vez usan un único vector. Lanzan múltiples ataques simultáneos con objetivos complementarios: uno distrae al analista mientras el otro opera silenciosamente.

El Nivel 6 replica este escenario: múltiples atacantes o múltiples vectores desde distintas IPs actúan al mismo tiempo. El analista debe identificar todos los vectores, no solo el más visible.

## 2. La dificultad del análisis multi-vector

En un incidente de vector único, el análisis es lineal: encontrar la IP, caracterizar el ataque, bloquear. En multi-vector:

- Los logs mezclan eventos de múltiples atacantes.
- Una búsqueda genérica (`grep failed`) devuelve resultados de varios orígenes.
- Bloquear un vector no detiene el otro.
- La correlación entre vectores puede revelar si están coordinados (mismo actor) o son independientes (distintos actores).

## 3. Las técnicas disponibles en el Nivel 6

El Nivel 6 no introduce comandos nuevos. Todos los comandos de los niveles anteriores están disponibles. La diferencia está en cómo aplicarlos:

- `grep failed /var/log/auth.log` puede mostrar resultados de varias IPs.
- `netstat -an` puede mostrar conexiones activas desde múltiples atacantes.
- `iptables -A INPUT -s <ip> -j DROP` se aplica a cada IP maliciosa identificada.
- `iptables -L INPUT -n` permite verificar múltiples bloqueos simultáneos.

La habilidad del Nivel 6 es la gestión paralela de múltiples vectores: identificar, priorizar, responder y verificar para cada uno.

## 4. Priorización bajo presión

Con múltiples vectores activos, el analista no puede responder a todos al mismo tiempo. Debe priorizar:

- ¿Qué vector está más avanzado en su progresión?
- ¿Qué vector tiene mayor impacto potencial?
- ¿Algún vector ya obtuvo acceso al sistema?

La priorización correcta bajo presión es la marca del analista avanzado.

## 5. La coordinación como señal

Si dos IPs distintas ejecutan ataques complementarios (una hace escaneo, otra hace brute-force) de forma coordinada, puede indicar que son parte de la misma operación. Esta correlación es relevante para el informe: describe un ataque coordinado, no dos incidentes independientes.
