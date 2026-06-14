# Nivel 6 — Procedimiento paso a paso

## 1. Antes de comenzar

El Nivel 6 requiere mayor disciplina procedimental que los niveles anteriores porque la información es más abundante y puede ser engañosa. Define antes de empezar:

- ¿Cuántos vectores espero encontrar? (En el laboratorio, el nivel avanzado introduce dos IPs atacantes)
- ¿Cuál es mi criterio para clasificar una IP como maliciosa vs. legítima?
- ¿En qué orden priorizaré los vectores si son de severidad similar?

---

## 2. Paso 1 — Triage inicial

Ejecuta los tres comandos de triage en secuencia:

```
show alerts
show events
show traffic
```

No analices en profundidad todavía. El objetivo es tener una visión de alto nivel:

- ¿Cuántas IPs distintas aparecen en alertas y eventos?
- ¿Qué tipos de actividad están ocurriendo?
- ¿Hay un volumen claramente mayor en un vector que en otro?

Anota mentalmente las IPs que aparecen con mayor frecuencia o mayor severidad.

---

## 3. Paso 2 — Caracterizar cada IP sospechosa

Para cada IP identificada en el triage, ejecuta:

```
resolve host
```

Analiza si la información de reputación y DNS indica actividad maliciosa real o podría ser tráfico legítimo. Una IP con hostname de ISP estándar y sin reputación negativa puede ser ruido legítimo. Una IP con hostname de hosting malicioso es candidata a vector real.

---

## 4. Paso 3 — Separar los vectores

Con la caracterización hecha, clasifica cada IP en:

- **Vector malicioso confirmado:** evidencia clara de actividad atacante.
- **Vector malicioso probable:** evidencia parcial, requiere más análisis.
- **Tráfico legítimo:** no presenta indicadores de amenaza.

Mantén esta clasificación provisional: puede cambiar con evidencia adicional.

---

## 5. Paso 4 — Analizar cada vector individualmente

Para cada vector malicioso identificado, analiza:

```
show hosts
show sessions
```

¿Qué hosts está atacando este vector? ¿Qué servicios? ¿En qué fase del ataque parece estar?

Repite para el segundo vector. ¿Es la misma técnica o diferente? ¿El mismo objetivo o diferente?

---

## 6. Paso 5 — Correlacionar los vectores

Con ambos vectores analizados individualmente, busca la relación entre ellos:

- ¿Atacan el mismo host? ¿O uno es distractor del otro?
- ¿La actividad de uno comenzó antes que la del otro?
- ¿El vector "menor" parece estar preparando algo para el vector "mayor"?

Esta correlación define la narrativa del incidente.

---

## 7. Paso 6 — Contener los vectores en orden de prioridad

Bloquea primero el vector de mayor impacto o más avanzado en su progresión:

```
block ip <ip-vector-principal>
show blocked
```

Verifica que el bloqueo se aplicó antes de proceder con el segundo:

```
block ip <ip-vector-secundario>
show blocked
```

---

## 8. Paso 7 — Verificar que la contención es efectiva

```
show alerts
show events
```

Confirma que ya no se generan alertas ni eventos de las IPs bloqueadas. Si hay actividad residual, investiga si hay un tercer vector o si hay un error en el bloqueo.

---

## 9. Paso 8 — Revisar y documentar

```
history
export report
```

El reporte del Nivel 6 debe describir cada vector, la correlación entre ellos y el impacto combinado del incidente.

---

## 10. Verificación final

- [ ] Triage inicial completado (alerts, events, traffic).
- [ ] Cada IP sospechosa caracterizada con `resolve host`.
- [ ] Vectores separados y clasificados.
- [ ] Cada vector analizado individualmente.
- [ ] Correlación entre vectores establecida.
- [ ] Ambas IPs maliciosas bloqueadas y verificadas.
- [ ] Contención verificada post-bloqueo.
- [ ] Reporte generado con análisis multi-vector.
