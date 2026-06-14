# Nivel 4 — Errores frecuentes en análisis de red

## 1. Error 1 — No correlacionar la evidencia de red con la de logs

**Descripción:** el estudiante analiza el tráfico de red con tcpdump pero no lo relaciona con los eventos del auth.log o syslog.

**Consecuencias:** tiene dos conjuntos de evidencia independientes pero no puede demostrar que son parte del mismo incidente. La narrativa del ataque queda fragmentada.

**Corrección:** siempre verificar si la IP del tráfico sospechoso en tcpdump coincide con la IP de los eventos en los logs. La convergencia de evidencia en múltiples fuentes es la firma de un análisis completo.

---

## 2. Error 2 — Ignorar `netstat -tulpn` como herramienta de detección de compromiso

**Descripción:** el estudiante usa netstat solo para ver conexiones activas (`-an`) y no usa `-tulpn` para ver los servicios en escucha.

**Consecuencias:** puede perderse un servicio malicioso (backdoor, shell reversa) que está en escucha esperando una conexión del atacante, que no aparecería en las conexiones activas si el atacante aún no se conectó.

**Corrección:** usar `netstat -tulpn` además de `netstat -an`. Los servicios en escucha revelan backdoors; las conexiones activas revelan acceso en curso.

---

## 3. Error 3 — No interpretar los códigos de respuesta HTTP

**Descripción:** el estudiante lee el log de Nginx pero no presta atención a los códigos de respuesta.

**Consecuencias:** puede ver 50 peticiones a rutas sensibles y no identificar cuál tuvo éxito (código 200) vs. cuáles fueron bloqueadas (403) o no encontradas (404).

**Corrección:** en el análisis del log de Nginx, los códigos 200 en rutas que deberían devolver 403 son el hallazgo más importante. Siempre buscar los 200 en las peticiones sospechosas.

---

## 4. Error 4 — Usar tcpdump sin filtro y perder el foco

**Descripción:** el estudiante ejecuta `tcpdump` sin filtro de IP o puerto y se pierde en el volumen de tráfico general.

**Consecuencias:** el tráfico legítimo (peticiones de usuarios normales) contamina el análisis y hace difícil identificar el tráfico malicioso.

**Corrección:** en el análisis de un incidente con IP sospechosa conocida, siempre usar `tcpdump host <ip-sospechosa>` para aislar el tráfico relevante.

---

## 5. Error 5 — Confundir un servicio legítimo con uno malicioso

**Descripción:** el estudiante ve un proceso inusual en `netstat -tulpn` y lo marca como malicioso sin verificar si es un servicio instalado legítimamente.

**Consecuencias:** posibles falsos positivos que generan trabajo innecesario.

**Corrección:** antes de clasificar un proceso como malicioso, verificar si está instalado como parte del sistema. Procesos corriendo desde `/tmp`, `/dev/shm` o con nombres aleatorizados tienen alta probabilidad de ser maliciosos. Procesos corriendo desde `/usr/bin`, `/usr/sbin` o `/opt` son probablemente legítimos.
