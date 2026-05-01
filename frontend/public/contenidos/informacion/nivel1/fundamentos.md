# Nivel 1 — Fundamentos teóricos de Pentesting (visión universitaria)

## 1. Definición de pentesting
El **pentesting** (prueba de penetración) es un proceso controlado y autorizado cuyo objetivo es **evaluar la seguridad** de un sistema, red o aplicación, mediante técnicas que simulan el comportamiento de un atacante. A diferencia de un ataque real, el pentesting se ejecuta con **permiso explícito**, alcance definido y criterios de reporte. Su finalidad académica y profesional es identificar vulnerabilidades, demostrar impacto de manera responsable y proponer medidas de mitigación.

En términos universitarios, el pentesting se comprende como una metodología aplicada que combina (i) conocimiento técnico de redes, sistemas y aplicaciones, (ii) uso de herramientas especializadas, (iii) interpretación de evidencia y (iv) documentación formal. El resultado esperado no es “entrar” a un sistema por sí mismo, sino producir evidencia y conclusiones que mejoren la postura de seguridad.

> **Concepto clave:** Pentesting no es “hackear”; es **evaluar**. La diferencia está en la **autorización**, el **alcance** y la **documentación**.

## 2. Enfoques y tipos de pentesting
Un pentest puede variar según el nivel de información entregada al evaluador:

- **Caja negra (black box):** el evaluador tiene información mínima; simula un atacante externo.
- **Caja gris (gray box):** se entrega información parcial; simula un atacante con acceso limitado o con datos internos.
- **Caja blanca (white box):** se entrega información amplia (arquitectura, credenciales de prueba, código); permite profundidad y eficiencia.

También se clasifica por objetivo:
- **Pentest de red:** servicios, puertos, configuración, segmentación, exposición.
- **Pentest de aplicaciones web:** fallos lógicos, validación de entradas, autenticación, autorización, OWASP Top 10.
- **Pentest de infraestructura/sistemas:** hardening, privilegios, servicios, parches, usuarios.
- **Pentest inalámbrico:** seguridad Wi-Fi, autenticación, cifrado, segmentación.

## 3. Fases del proceso de pentesting (metodología)
Aunque existen estándares distintos, a nivel universitario se suele enseñar un flujo similar:

### 3.1 Reconocimiento (recolección de información)
Consiste en reunir datos sobre el objetivo sin interactuar agresivamente. Ejemplos:
- dominios, subdominios
- rangos IP
- tecnologías empleadas
- huellas (fingerprinting)

**Por qué importa:** reduce incertidumbre y orienta el escaneo posterior.

### 3.2 Enumeración y escaneo
En esta fase se identifica superficie de ataque:
- puertos abiertos
- servicios activos y versiones
- endpoints web relevantes
- usuarios o rutas accesibles

**Comandos típicos (ejemplo de red):**
- `nmap -sV -p- <IP>` → descubre puertos y versiones
- `nmap -A <IP>` → detección más agresiva (usar con autorización)

**Comandos típicos (web):**
- `curl -I https://sitio` → cabeceras HTTP
- `whatweb https://sitio` → tecnologías (si se permite)

### 3.3 Análisis de vulnerabilidades
Se evalúa la información recopilada para identificar debilidades:
- servicios desactualizados
- configuraciones inseguras
- credenciales débiles
- endpoints vulnerables (SQLi/XSS, etc.)

### 3.4 Explotación controlada
Se intenta demostrar el impacto de forma limitada y responsable:
- obtener evidencia de acceso
- demostrar lectura/alteración de datos (sin daño)
- probar escalamiento controlado

### 3.5 Post-explotación (si aplica)
Se evalúa el alcance tras un acceso:
- persistencia (solo si está permitido)
- movimiento lateral (si está permitido)
- extracción de evidencia (mínima y responsable)

### 3.6 Reporte y mitigación
Se documenta:
- hallazgos
- evidencia
- impacto
- recomendación concreta (mitigación)
- prioridad (severidad)

> **Regla académica:** sin reporte, no hay pentesting completo.

## 4. Ética, autorización y alcance
En universidad es obligatorio entender que el pentesting depende de:
- **Permiso** (autorización escrita o contractual)
- **Alcance** (qué sí y qué no se puede tocar)
- **Reglas de compromiso** (horarios, límites, cuentas de prueba, herramientas permitidas)
- **Evidencia mínima** (demostrar sin causar daño)

La práctica en laboratorios controlados existe precisamente para entrenar estas competencias sin riesgos operacionales. En evaluación docente, suele considerarse error grave hablar de pentesting sin mencionar autorización y alcance.

## 5. Comandos como herramienta, no como objetivo
Los comandos (por ejemplo `nmap`, `curl`, `sqlmap`, etc.) son medios para ejecutar fases específicas. Un estudiante debe poder responder:
- **qué fase** se está realizando
- **qué resultado** se espera
- **cómo se interpreta** la salida
- **qué decisión** se toma con esa evidencia

Ejemplo (interpretación conceptual):
- Si `nmap` muestra `22/tcp open ssh`, el estudiante debe inferir:
  - hay un servicio SSH expuesto
  - se puede evaluar hardening, versiones y credenciales
  - se decide siguiente paso: enumeración del servicio o revisión de políticas (según alcance)

## 6. Ejemplo breve de lectura académica de resultados
**Salida típica resumida (conceptual):**
- Puerto 80 abierto (HTTP)
- Puerto 22 abierto (SSH)

Interpretación:
- HTTP → revisar cabeceras, endpoints, rutas, tecnologías, autenticación.
- SSH → revisar versión, configuración, políticas de acceso, intentos fallidos (posible fuerza bruta).

Decisión razonada:
- “Se prioriza HTTP si el alcance es web; se prioriza SSH si hay evidencia de intentos anómalos o si el objetivo es infraestructura.”

## 7. Errores comunes en estudiantes (y por qué son graves)
- Ejecutar herramientas sin entender fase ni objetivo (“tirar comandos”).
- No interpretar resultados: copiar/pegar salidas sin análisis.
- Confundir “puerto abierto” con “vulnerabilidad”.
- No definir alcance (lo más grave en práctica real).
- No documentar evidencia mínima y reproducible.

## 8. Buenas prácticas universitarias (lo que un profe espera escuchar)
- Definición clara de pentesting y diferencia con ataque real.
- Metodología por fases.
- Evidencia y justificación de decisiones.
- Reporte con hallazgos y mitigación.
- Consideración ética, autorización y alcance.

## 9. Mini-evaluación
1) Defina pentesting y explique qué lo diferencia de un ataque real.  
2) Nombre y describa al menos cuatro fases del proceso.  
3) ¿Por qué el reporte es parte obligatoria del pentesting?  
4) ¿Qué significa “alcance” y por qué se define antes de ejecutar herramientas?  
5) Interprete: si un escaneo muestra un servicio expuesto, ¿qué decisión se toma y por qué?