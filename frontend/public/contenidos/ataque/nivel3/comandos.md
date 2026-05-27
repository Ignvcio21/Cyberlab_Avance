# Nivel 3 — Comandos de enumeración ofensiva y análisis de servicios

# Introducción operacional

En niveles anteriores, los comandos utilizados estuvieron enfocados principalmente en observación básica, revisión de eventos, alertas y reconocimiento inicial de actividad visible. Sin embargo, dentro de un proceso profesional de pentesting, la información obtenida durante esas etapas resulta insuficiente para comprender realmente la infraestructura analizada.

El Nivel 3 introduce comandos orientados específicamente a la enumeración ofensiva de servicios y tecnologías expuestas.

La finalidad metodológica de estos comandos no consiste únicamente en “mostrar información”, sino en permitir que el estudiante aprenda a:

- interpretar servicios;
- reconocer tecnologías;
- identificar protocolos;
- analizar banners;
- construir contexto ofensivo;
- correlacionar exposición;
- priorizar superficie de ataque.

Cada comando presente en este nivel representa una herramienta de observación técnica que posteriormente podrá formar parte de escenarios ofensivos más complejos dentro de CyberLab.

Uno de los principios más importantes del nivel es comprender que:

> ejecutar comandos no equivale automáticamente a realizar análisis ofensivo.

La capacidad profesional surge de la interpretación metodológica de las respuestas obtenidas.

---

# Consideraciones metodológicas antes de usar comandos

Antes de utilizar herramientas de enumeración, el estudiante debe considerar:

- qué información busca obtener;
- por qué esa información resulta relevante;
- cómo validará los resultados;
- qué interpretación realizará posteriormente;
- cómo correlacionará la evidencia observada.

La ejecución desordenada de comandos produce:

- ruido operacional;
- información redundante;
- falsas conclusiones;
- pérdida de contexto.

Por esta razón, CyberLab enfatiza constantemente el flujo:

> observación → enumeración → interpretación → correlación → validación

---

# Comando: show services

## Propósito operacional

El comando `show services` permite visualizar servicios identificados dentro del entorno analizado.

Representa uno de los comandos fundamentales del Nivel 3 debido a que introduce formalmente el análisis de servicios expuestos.

---

## Sintaxis

```bash
show services