# Nivel 1 — Buenas prácticas de inspección inicial

## 1. Comenzar siempre con el contexto antes que con el detalle

La inspección inicial correcta va de lo general a lo específico: primero el estado del sistema completo, luego los logs, luego los eventos específicos. Invertir este orden es un error frecuente que produce análisis incompletos.

## 2. Leer la salida completa antes del siguiente comando

Ejecutar comandos rápidamente sin leer la salida no es eficiencia: es descuido. La información más relevante a veces aparece al final de una salida larga. Desarrollar el hábito de leer completa la salida antes de ejecutar el siguiente comando.

## 3. Conocer el baseline del sistema

El análisis defensivo efectivo requiere conocer qué es normal. Un servicio que aparece en `failed` es anómalo solo si ese servicio debería estar activo. Sin baseline, cualquier anomalía es difícil de identificar.

En el Nivel 1, el objetivo es comenzar a construir ese baseline. Aprende cómo se ve el sistema en un estado normal para poder reconocer cuándo algo cambia.

## 4. Anotar los timestamps

Los timestamps en los logs son información crítica. No te quedes solo con el mensaje: anota cuándo ocurrió. La secuencia temporal de los eventos es frecuentemente más reveladora que los eventos individuales.

## 5. No confundir actividad con amenaza

Un sistema activo genera muchos logs. Muchos logs no significa que algo esté mal. La clave es aprender a distinguir entre la actividad normal (alta frecuencia de mensajes INFO) y las anomalías reales (mensajes ERR o CRIT, o volúmenes inusualmente altos de autenticación fallida).

## 6. Usar `journalctl -n <N>` para limitar la salida

En un sistema con muchos eventos, `journalctl` sin argumentos puede devolver cientos de líneas. Usar `journalctl -n 50` limita la salida a las últimas 50 entradas, que en el contexto del laboratorio suelen ser suficientes para la inspección inicial.

## 7. El objetivo del Nivel 1 es la familiarización, no el análisis profundo

En el Nivel 1, no es necesario encontrar un ataque ni resolver un incidente. El objetivo es ejecutar los comandos básicos correctamente, entender lo que muestran y desarrollar el hábito de la inspección sistemática. Todo lo que aprendas aquí será la base de todos los niveles siguientes.
