# Nivel 2 — Fundamentos

## 1. Reconocimiento dentro del pentesting

El reconocimiento constituye una de las primeras etapas dentro de un proceso de pentesting o análisis ofensivo de seguridad. Su objetivo principal es recopilar información sobre el objetivo antes de intentar cualquier tipo de explotación o acceso. En términos prácticos, esta fase permite identificar:
- servicios activos,
- puertos abiertos,
- tecnologías utilizadas,
- posibles vectores de entrada,
- y superficie expuesta del sistema.

En operaciones reales, un atacante rara vez inicia directamente una explotación sin información previa. El reconocimiento reduce incertidumbre y permite seleccionar técnicas más precisas sobre el objetivo. Por esta razón, muchas metodologías de pentesting consideran esta etapa como fundamental para comprender el entorno evaluado.

---

## 2. Reconocimiento activo y pasivo

Dentro de ciberseguridad, el reconocimiento puede clasificarse en:
- reconocimiento pasivo,
- y reconocimiento activo.

### Reconocimiento pasivo
Corresponde a la obtención de información sin interacción directa con el objetivo. Incluye búsqueda de dominios, información pública, filtraciones, redes sociales o motores de búsqueda especializados.

### Reconocimiento activo
Implica interacción directa con el sistema objetivo mediante consultas, conexiones o escaneos. El escaneo de puertos pertenece a esta categoría, ya que genera tráfico observable por la infraestructura monitoreada.

En el laboratorio CyberLab, el foco principal del Nivel 2 se centra en reconocimiento activo mediante patrones compatibles con enumeración de servicios.

---

## 3. Puertos y servicios

Un puerto representa un punto lógico de comunicación utilizado por servicios de red. Cada servicio suele asociarse a un puerto determinado:
- HTTP → 80/tcp
- HTTPS → 443/tcp
- SSH → 22/tcp
- RDP → 3389/tcp
- FTP → 21/tcp

Cuando un puerto se encuentra “abierto”, significa que existe un servicio escuchando conexiones sobre dicho canal. Desde una perspectiva ofensiva, los puertos abiertos representan posibles puntos de entrada o superficie de ataque.

El objetivo del escaneo de puertos es precisamente identificar qué servicios están expuestos y cuáles podrían ser utilizados posteriormente durante una intrusión.

---

## 4. Escaneo de puertos

El escaneo de puertos consiste en enviar solicitudes hacia múltiples puertos de un sistema objetivo para determinar cuáles responden. Herramientas como Nmap automatizan este proceso y permiten identificar:
- puertos abiertos,
- puertos cerrados,
- servicios activos,
- versiones,
- sistemas operativos,
- y posibles configuraciones vulnerables.

En un entorno defensivo, este comportamiento suele generar eventos relacionados con múltiples conexiones en un periodo reducido. Cuando el patrón supera ciertos umbrales, pueden generarse alertas automáticas dentro de sistemas de monitoreo.

---

## 5. Eventos y patrones de reconocimiento

Una conexión aislada rara vez constituye evidencia suficiente para asumir actividad maliciosa. El análisis profesional se basa principalmente en patrones:
- repetición,
- frecuencia,
- distribución de puertos,
- origen común,
- comportamiento temporal.

Por ejemplo:
- múltiples conexiones desde una misma IP hacia distintos puertos,
- conexiones secuenciales en pocos segundos,
- intentos sistemáticos sobre servicios conocidos.

Estos comportamientos permiten inferir actividades compatibles con reconocimiento ofensivo.

En el laboratorio, los eventos generados buscan representar precisamente este tipo de comportamiento observable.

---

## 6. Alertas y correlación

Las alertas representan señales generadas automáticamente por reglas del sistema. Normalmente se activan cuando se detecta un comportamiento considerado anómalo o riesgoso.

Sin embargo, una alerta por sí sola no constituye evidencia definitiva. En seguridad operacional, las alertas deben validarse mediante eventos y correlación de información.

Por esta razón, la metodología del laboratorio exige:
1) revisar alertas,
2) consultar eventos,
3) interpretar el patrón,
4) decidir una acción.

Este flujo evita respuestas impulsivas y fortalece el análisis basado en evidencia.

---

## 7. Contención inicial

Cuando existe evidencia suficiente de actividad sospechosa, pueden aplicarse medidas de contención. Una de las más comunes corresponde al bloqueo de direcciones IP.

En entornos reales, estas acciones pueden implementarse mediante:
- firewall,
- ACL,
- WAF,
- listas de denegación,
- herramientas de protección automatizada.

En CyberLab, esta contención se representa mediante comandos ejecutados desde la terminal interactiva.

El objetivo pedagógico no consiste únicamente en “bloquear”, sino en justificar técnicamente:
- por qué se bloquea,
- qué evidencia lo respalda,
- y cómo se verifica posteriormente el resultado.

---

## 8. Verificación posterior

Una práctica fundamental en ciberseguridad consiste en verificar el resultado de las acciones aplicadas. Implementar una medida sin comprobar el cambio de estado puede generar errores operacionales o falsa sensación de seguridad.

Por ello, el laboratorio considera obligatorio:
- revisar el estado posterior,
- confirmar la acción aplicada,
- y validar que la medida surtió efecto.

La verificación forma parte del ciclo metodológico mínimo:
señal → evidencia → interpretación → contención → verificación.

---

## 9. Importancia académica del nivel

El Nivel 2 representa una transición entre ejercicios básicos y escenarios más complejos. El estudiante comienza a interpretar comportamientos ofensivos menos evidentes y a desarrollar criterio técnico frente a actividades de reconocimiento.

Desde una perspectiva formativa, este nivel fortalece:
- análisis de evidencia,
- interpretación de patrones,
- comprensión de superficie expuesta,
- y metodología de respuesta basada en evidencia.

Estas habilidades servirán como base para niveles posteriores donde se incorporarán escenarios ofensivos más avanzados y análisis de mayor complejidad.