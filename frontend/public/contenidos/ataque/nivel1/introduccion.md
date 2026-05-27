# Nivel 1 — Introducción

## 1. Contexto y finalidad del nivel
El Nivel 1 introduce los fundamentos conceptuales y metodológicos del laboratorio CyberLab, una plataforma orientada al entrenamiento práctico en análisis de eventos, simulación de escenarios y respuesta ante incidentes en entornos controlados. Este nivel cumple una función estructural: establecer el “lenguaje común” (conceptos y definiciones) y el “método mínimo” (secuencia de trabajo) que se reutilizarán en los niveles posteriores, donde la complejidad técnica y el volumen de información aumentan progresivamente.

Desde una perspectiva académica, la motivación principal es abordar una brecha frecuente en la formación universitaria: la enseñanza de pentesting y respuesta a incidentes suele apoyarse en documentos y contenidos teóricos, pero la adquisición de competencias prácticas requiere entrenamiento sistemático, retroalimentación y criterios verificables. CyberLab se presenta como una solución didáctica que integra teoría y práctica en un mismo flujo: el estudiante revisa un contenido formativo, aplica acciones mediante una terminal interactiva, valida resultados con evidencia del sistema y consolida el cierre del caso a través de un reporte.

## 2. Enfoque del laboratorio: aprendizaje basado en evidencia
En ciberseguridad, el criterio profesional se sustenta en evidencia observable. Por ello, CyberLab estructura el aprendizaje en torno a dos elementos principales: **alertas** y **eventos**. Las alertas cumplen un rol de señal y priorización (indican que podría existir un riesgo relevante), mientras que los eventos constituyen evidencia primaria (registros detallados que permiten confirmar qué ocurrió, desde dónde y con qué patrón). Esta distinción es esencial para el Nivel 1, ya que el objetivo no es “reaccionar” ante una alerta, sino aprender a **validar** y **argumentar** una decisión defensiva mediante datos del sistema.

En términos metodológicos, el estudiante debe internalizar que una respuesta defensiva se considera completa cuando cumple al menos cuatro condiciones: (i) se identifica una señal inicial, (ii) se confirma con evidencia, (iii) se aplica una acción de contención coherente con el análisis y (iv) se verifica explícitamente el resultado. El laboratorio refuerza esta lógica mediante un avance medible y un checklist de objetivos, evitando que el aprendizaje se reduzca a memorización de comandos.

## 3. Entorno controlado y alcance formativo
El laboratorio opera en un entorno controlado. Esto significa que los escenarios se diseñan para simular condiciones típicas de incidentes sin interactuar con sistemas externos ni exponer infraestructura real a riesgos operacionales o legales. El propósito formativo es entrenar competencias de observación, análisis y respuesta dentro de un marco seguro y reproducible. En consecuencia, CyberLab no busca promover acciones ofensivas en entornos reales, sino facilitar la comprensión de procedimientos y fundamentos que se aplican en análisis y defensa.

El uso de un entorno controlado ofrece ventajas pedagógicas: permite repetir escenarios, comparar resultados, medir tiempos de respuesta, registrar progreso por usuario y consolidar evidencia de desempeño. Estas características son relevantes para procesos de evaluación por competencias, donde se espera medir no solo el resultado final (porcentaje o completitud), sino también la coherencia del procedimiento y la capacidad de explicación técnica.

## 4. Estructura general de aprendizaje
El trabajo en CyberLab se organiza en capítulos y niveles secuenciales, con un enfoque incremental: desde conceptos básicos de observabilidad y control de acceso, hasta escenarios más complejos de análisis y defensa. Cada nivel combina:
- **Contenido didáctico** (material estructurado por secciones).
- **Actividad práctica** (terminal interactiva y ejecución de acciones).
- **Progreso medible** (porcentaje de lectura y porcentaje de completitud del escenario).
- **Registro** (historial de acciones y reporte de cierre).

A nivel de método, el Nivel 1 introduce el ciclo mínimo de respuesta ante incidentes:
1) **Detección:** identificación de señales relevantes (alertas).
2) **Análisis:** confirmación con evidencia (eventos), identificación de origen y patrón.
3) **Contención:** aplicación de una medida defensiva inmediata (por ejemplo, bloqueo de IP).
4) **Verificación:** confirmación explícita de que la medida quedó aplicada.
5) **Documentación:** generación de reporte para trazabilidad y revisión.

Este ciclo será la base común para niveles posteriores, aunque cambien los escenarios, tipos de incidentes y criterios específicos.

## 5. Criterio de avance y evaluación
El avance en la parte teórica se registra por sección y se marca automáticamente al completar el recorrido total del contenido (medición por desplazamiento hasta el final). Este mecanismo busca garantizar exposición suficiente al material, reduciendo la posibilidad de “marcado manual” sin lectura. En la parte práctica, la aprobación se define por el logro de objetivos dentro del tiempo establecido y por la completitud del checklist (100%), sin invalidar el resultado final si existieron errores intermedios corregidos.

En una revisión académica, se considera especialmente relevante la coherencia entre evidencia consultada, acción aplicada y verificación. Por ello, el Nivel 1 orienta al estudiante a justificar decisiones y a desarrollar comunicación técnica precisa, evitando respuestas ambiguas o subjetivas.

## 6. Síntesis del nivel
En síntesis, el Nivel 1 cumple el rol de fundación conceptual y metodológica del laboratorio: define los conceptos mínimos (evento, alerta, patrón, contención, verificación), introduce el ciclo de respuesta ante incidentes y establece la lógica de progreso basada en evidencia. El objetivo formativo final es que el estudiante sea capaz de operar el laboratorio con criterio, ejecutar acciones coherentes y explicar técnicamente el procedimiento realizado.

## 7. Autoevaluación breve
1) ¿Por qué una alerta no es evidencia suficiente para aplicar contención?  
2) ¿Qué información mínima debe aportar un evento para ser útil en análisis de incidentes?  
3) ¿Por qué la verificación es un requisito metodológico en ciberseguridad aplicada?  
4) ¿Qué ventaja formativa aporta un entorno controlado frente a un sistema real?  
5) ¿Cuál es el ciclo mínimo de respuesta que se utiliza como base en el laboratorio?