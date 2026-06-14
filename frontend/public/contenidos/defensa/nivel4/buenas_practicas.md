# Nivel 4 — Buenas prácticas de análisis de red

## 1. Comenzar con el inventario antes que con la captura

Antes de lanzar tcpdump, conocer el inventario de servicios del sistema con `netstat -tulpn`. Esto proporciona el baseline contra el que comparar el tráfico capturado.

## 2. Usar filtros en tcpdump desde el inicio

En un análisis de incidente, siempre filtrar el tráfico de tcpdump por IP sospechosa o puerto relevante. El tráfico sin filtrar puede ser abrumador en producción. El objetivo no es capturar todo: es capturar lo relevante para el análisis.

## 3. Correlacionar la IP de red con la IP de los logs

La pregunta más importante en cualquier análisis de red en el contexto de un incidente es: "¿Es esta la misma IP que vi en los logs?". La correlación de IPs entre evidencias es lo que convierte datos aislados en un caso coherente.

## 4. Prestar especial atención a los procesos que escuchan en puertos no estándar

Un proceso legítimo en el puerto 22 (SSH) o 80 (HTTP) es lo esperado. Un proceso en el puerto 4444, 1337 o cualquier puerto arbitrario por encima de 1024 sin explicación clara es sospechoso. Investigar siempre el nombre del proceso antes de concluir.

## 5. Verificar si hay tráfico saliente sospechoso

En un análisis de red, no solo mirar el tráfico entrante. Si el servidor está enviando datos hacia IPs externas en horarios inusuales o en volúmenes anómalos, puede indicar exfiltración de datos o comunicación con un servidor de comando y control (C2).

## 6. Documentar la secuencia de análisis con los resultados de red

El análisis de red en el Nivel 4 agrega una capa de complejidad al informe. Documentar explícitamente: qué capturó tcpdump, qué mostró nmap, qué encontró netstat. Sin esta documentación, la evidencia de red queda solo en la memoria del analista.

## 7. Nmap es una herramienta de verificación, no de ataque

En el contexto defensivo del Nivel 4, nmap se usa para verificar qué está expuesto en el propio servidor, no para atacar otros sistemas. Esta perspectiva "del atacante sobre mi propio servidor" es valiosa porque muestra exactamente lo que un adversario vería antes de atacar.
