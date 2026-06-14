# Nivel 5 — Metodología de post-explotación

## 1. Principio metodológico central

La post-explotación requiere mayor disciplina metodológica que cualquier fase anterior, porque el acceso obtenido amplifica el impacto de cada acción. Un error metodológico en reconocimiento produce información incompleta. Un error metodológico en post-explotación puede producir daño real al sistema, evidencia destruida o alertas que exponen el análisis prematuramente.

El principio central de la metodología del Nivel 5 es: **mínimo impacto, máxima información**.

## 2. Etapa 1 — Estabilizar el acceso

El primer paso tras obtener acceso es estabilizar la posición. Esto significa:

- Verificar qué nivel de privilegios tiene el acceso obtenido.
- Confirmar que el acceso es estable (no será cerrado por timeout u otro mecanismo).
- Evaluar qué herramientas del sistema están disponibles desde este acceso.

Ejecutar acciones agresivas inmediatamente tras el acceso inicial es un error frecuente que puede resultar en detección temprana o pérdida del acceso.

## 3. Etapa 2 — Mapeo del entorno interno

Con el acceso estabilizado, el siguiente paso es construir un mapa del entorno interno:

- **Hosts accesibles:** `show hosts` desde el contexto del sistema comprometido.
- **Sesiones activas:** `show sessions` para identificar conexiones existentes.
- **Tráfico interno:** `show traffic` para detectar comunicaciones entre sistemas.
- **Intentos de autenticación:** `show failed logins` para comprender los patrones de acceso.

Este mapeo es el reconocimiento interno: la contraparte del reconocimiento externo realizado en el Nivel 2, pero ahora desde dentro del perímetro.

## 4. Etapa 3 — Identificar oportunidades de escalada

Con el mapa del entorno construido, el analista evalúa posibles vectores de escalada de privilegios:

- ¿Hay servicios corriendo con privilegios elevados que puedan explotarse?
- ¿Hay credenciales almacenadas en archivos de configuración accesibles?
- ¿Hay tareas programadas con permisos incorrectos?
- ¿El sistema tiene vulnerabilidades conocidas en componentes del kernel o servicios locales?

En CyberLab, `show vulnerabilities` puede revelar vulnerabilidades locales que no eran visibles desde el exterior.

## 5. Etapa 4 — Evaluar movimiento lateral

Con el entorno mapeado, el analista evalúa qué tan lejos puede llegar desde el punto de compromiso:

- ¿Qué otros hosts son accesibles desde este sistema?
- ¿Hay credenciales o tokens que permitan autenticación en otros hosts?
- ¿Hay configuraciones de confianza (claves SSH, credenciales compartidas) que faciliten el acceso lateral?

Esta evaluación define el radio de explosión del compromiso.

## 6. Etapa 5 — Verificar detección

Durante o después de cada acción de post-explotación, el analista debe verificar si fue detectada:

```
show alerts
show events
```

La capacidad de detectar acciones de post-explotación es un indicador importante de la madurez del sistema de seguridad del objetivo. Un entorno que no genera alertas ante post-explotación activa tiene una capacidad defensiva significativamente inferior a uno que sí lo hace.

## 7. Etapa 6 — Documentar y reportar

La documentación de post-explotación debe ser la más detallada del análisis:

- Descripción del acceso inicial y su alcance.
- Inventario del entorno interno mapeado.
- Vectores de escalada identificados (y probados si aplica).
- Alcance del movimiento lateral posible.
- Datos accesibles desde el punto de compromiso.
- Análisis de detección (qué fue detectado, qué no).
- Impacto en CIA (confidencialidad, integridad, disponibilidad).
- Recomendaciones de remediación específicas.

```
export report
```

## 8. Secuencia metodológica recomendada

```
show sessions          → mapear conexiones desde el punto de acceso
show hosts             → identificar hosts accesibles internamente
show traffic           → analizar tráfico interno
show failed logins     → detectar patrones de autenticación
show vulnerabilities   → identificar vectores de escalada local
show alerts            → evaluar detección de acciones realizadas
show events            → verificar evidencia generada
history                → revisar coherencia del flujo
export report          → documentar el análisis completo
```
