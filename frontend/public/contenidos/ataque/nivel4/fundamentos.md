# Nivel 4 — Fundamentos técnicos de la explotación

## 1. La vulnerabilidad como concepto central

Una vulnerabilidad técnica es una debilidad en el diseño, implementación o configuración de un sistema que puede ser utilizada para causar un comportamiento no deseado. Las vulnerabilidades pueden originarse en múltiples fuentes:

- **Errores de programación:** desbordamiento de buffer, inyecciones (SQL, comandos, código), manejo incorrecto de memoria.
- **Configuraciones incorrectas:** servicios expuestos innecesariamente, credenciales por defecto, permisos excesivos.
- **Versiones obsoletas:** software con vulnerabilidades conocidas y públicamente documentadas (CVE).
- **Diseño inseguro:** arquitecturas que no aplican principios de mínimo privilegio, separación de funciones o validación de entradas.

Para el analista ofensivo, identificar una vulnerabilidad no es el fin del análisis, sino el comienzo de una evaluación más profunda: ¿es explotable en este entorno?, ¿qué condiciones se requieren?, ¿cuál es el impacto real?

## 2. Clasificaciones fundamentales de vulnerabilidades

### 2.1. Por vector de acceso

- **Local:** requiere acceso previo al sistema para ser explotada.
- **Remota:** puede explotarse desde la red sin acceso previo al sistema.
- **Física:** requiere acceso físico al equipo.

En pentesting de red, las vulnerabilidades remotas tienen mayor relevancia inicial, ya que permiten obtener acceso sin privilegios previos.

### 2.2. Por impacto potencial

El estándar CVSS (Common Vulnerability Scoring System) clasifica el impacto en tres dimensiones: **confidencialidad**, **integridad** y **disponibilidad**. Un sistema de puntuación numérica (0 a 10) permite priorizar cuáles vulnerabilidades representan mayor riesgo. Las vulnerabilidades con puntuación CVSS ≥ 9.0 se consideran críticas.

### 2.3. Por tipo de debilidad

El sistema CWE (Common Weakness Enumeration) categoriza los tipos de debilidades técnicas. Algunas de las más relevantes en explotación:

- **CWE-89:** Inyección SQL.
- **CWE-79:** Cross-site scripting (XSS).
- **CWE-119:** Desbordamiento de buffer.
- **CWE-287:** Autenticación incorrecta.
- **CWE-200:** Exposición de información sensible.

## 3. El ciclo de explotación profesional

La explotación profesional no consiste en ejecutar herramientas sin criterio. Sigue un ciclo estructurado:

### Fase 1: Identificación
Determinar qué vulnerabilidades existen en el entorno mediante análisis de servicios, versiones y configuraciones detectadas en etapas previas.

### Fase 2: Validación
Confirmar que la vulnerabilidad identificada es explotable en el entorno específico analizado. No toda vulnerabilidad documentada es explotable en todas las versiones o configuraciones.

### Fase 3: Selección de técnica
Elegir la técnica o herramienta adecuada según la naturaleza de la vulnerabilidad, el servicio afectado y las condiciones del entorno.

### Fase 4: Ejecución controlada
Aplicar la técnica dentro del alcance autorizado, con el mínimo impacto colateral posible y verificando resultados en cada paso.

### Fase 5: Verificación de resultado
Confirmar que la explotación fue exitosa mediante evidencia observable: acceso obtenido, respuesta del sistema, logs generados.

### Fase 6: Documentación
Registrar la vulnerabilidad, el vector utilizado, la evidencia obtenida, el impacto real y las recomendaciones de remediación.

## 4. Conceptos clave: exploit, payload y vector

### Exploit
Un exploit es el código, técnica o procedimiento que aprovecha una vulnerabilidad específica para lograr un efecto en el sistema objetivo. Puede ser público (disponible en bases de datos como ExploitDB o Metasploit) o privado (desarrollado específicamente para el análisis en curso).

### Payload
El payload es la acción que se ejecuta una vez que el exploit ha logrado comprometer el sistema. Puede ser tan simple como confirmar la ejecución de un comando o tan complejo como establecer una conexión persistente inversa.

### Vector de ataque
El vector es el camino por el cual se realiza la explotación. En pentesting de red, los vectores más comunes son: servicios web (HTTP/HTTPS), servicios de autenticación (SSH, RDP, SMB), APIs expuestas y servicios de bases de datos.

## 5. Principios éticos en la explotación

Dentro de cualquier evaluación formal de seguridad, la explotación se rige por principios fundamentales:

- **Autorización:** nunca realizar explotación sin autorización documentada del propietario del sistema.
- **Alcance:** mantener las acciones dentro del alcance definido en el contrato o acuerdo de evaluación.
- **Mínimo impacto:** aplicar técnicas que confirmen la vulnerabilidad sin causar daño permanente al sistema.
- **Confidencialidad:** mantener la información obtenida durante la evaluación estrictamente confidencial.
- **Documentación:** registrar todas las acciones realizadas para garantizar trazabilidad y reproducibilidad.

Estos principios no son restricciones sobre la técnica, sino el estándar profesional que diferencia al analista de seguridad del atacante malicioso.

## 6. Herramientas representativas en explotación profesional

Aunque CyberLab utiliza su terminal propia, en entornos reales el analista ofensivo dispone de herramientas especializadas como:

- **Metasploit Framework:** plataforma de explotación modular con exploits y payloads organizados.
- **sqlmap:** automatización de inyección SQL.
- **Burp Suite:** análisis y manipulación de tráfico HTTP/HTTPS.
- **Hydra / Medusa:** ataques de diccionario a servicios de autenticación.
- **searchsploit:** búsqueda en la base de datos de ExploitDB directamente desde la terminal.

Conocer estas herramientas es parte de la formación ofensiva, aunque el laboratorio las abstrae en comandos educativos para facilitar el aprendizaje metodológico sin depender de la instalación de software externo.
