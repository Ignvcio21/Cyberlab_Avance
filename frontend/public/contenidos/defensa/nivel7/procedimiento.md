# Nivel 7 — Procedimiento de la operación completa

## 1. Antes de comenzar

El Nivel 7 no tiene un punto de entrada prescrito. El analista decide cómo comenzar basándose en el contexto del ejercicio. La única obligación es seguir el ciclo completo: triage → análisis → contención → verificación → reporte.

---

## 2. Paso 1 — Triage panorámico del sistema

```
systemctl status
journalctl -n 50
grep failed /var/log/auth.log
grep scan /var/log/syslog
grep -i crit /var/log/syslog
netstat -an
top -bn1
```

Al terminar, responder:
- ¿Cuántos vectores de ataque están activos?
- ¿Hay acceso activo confirmado en alguno?
- ¿Cuál es el de mayor severidad?

---

## 3. Paso 2 — Análisis profundo por vector

Para cada vector identificado, ejecutar los comandos de análisis apropiados:

```
lastb -n 20                         → para brute-force SSH
grep <ip> /var/log/auth.log         → actividad completa de la IP
tcpdump host <ip>                   → tráfico de la IP
tail -100 /var/log/nginx/access.log → acceso web
netstat -tulpn                      → servicios en escucha (¿backdoors?)
```

Para cada vector: tipo, fase, acceso obtenido, severidad.

---

## 4. Paso 3 — Correlación y narrativa del incidente

¿Los vectores están coordinados? Formular la hipótesis del incidente en una frase. Esta hipótesis es el núcleo del reporte.

---

## 5. Paso 4 — Contención priorizada

```
iptables -A INPUT -s <ip-max-severidad> -j DROP
iptables -L INPUT -n
```

Para cada vector malicioso adicional:

```
iptables -A INPUT -s <ip-siguiente> -j DROP
iptables -L INPUT -n
```

---

## 6. Paso 5 — Verificación de contención completa

```
tail -f /var/log/syslog         → confirmar cese de actividad
netstat -an                     → confirmar ausencia de conexiones activas
netstat -tulpn                  → verificar si hay backdoors en escucha
top -bn1                        → verificar ausencia de procesos anómalos
iptables -L                     → estado completo del firewall
```

¿El incidente está completamente contenido? ¿Hay indicadores de compromiso residual?

---

## 7. Paso 6 — Generar el reporte formal

```
export-report
```

El reporte debe cubrir:

1. **Resumen ejecutivo:** qué ocurrió, cuándo, qué impacto tuvo y cómo se resolvió. En lenguaje no técnico.
2. **Análisis técnico:** vectores, IPs, tipos de ataque, cronología, evidencia.
3. **Correlación:** si el incidente fue coordinado o múltiple.
4. **Acciones tomadas:** qué se bloqueó, cuándo, con qué evidencia.
5. **Estado post-respuesta:** el sistema está contenido / hay riesgos residuales.
6. **Recomendaciones:** qué cambios evitarían este tipo de incidente en el futuro.

---

## 8. Checkpoint de completitud

- [ ] Triage panorámico completado (todos los comandos de inspección).
- [ ] Todos los vectores identificados y caracterizados.
- [ ] Correlación entre vectores establecida.
- [ ] Todos los vectores maliciosos bloqueados con verificación.
- [ ] Cese de actividad maliciosa confirmado.
- [ ] Indicadores de compromiso residual investigados.
- [ ] Reporte formal generado con `export-report`.
- [ ] El reporte incluye resumen ejecutivo, análisis técnico y recomendaciones.
