# Nivel 5 — Fundamentos técnicos de la post-explotación

## 1. El modelo CIA en post-explotación

La post-explotación se evalúa siempre en términos del impacto sobre las tres dimensiones del modelo CIA:

**Confidencialidad:** ¿a qué datos puede acceder el atacante? Esto incluye contraseñas, documentos, bases de datos, correos, configuraciones y cualquier información que no debería estar accesible desde el punto de compromiso.

**Integridad:** ¿puede el atacante modificar datos, configuraciones o el comportamiento del sistema? La capacidad de alterar logs, modificar archivos de configuración o cambiar datos es un impacto de integridad.

**Disponibilidad:** ¿puede el atacante interrumpir el servicio? Esto incluye la capacidad de eliminar datos críticos, detener servicios esenciales o causar denegación de servicio desde el sistema comprometido.

Un compromiso que afecta las tres dimensiones es el más severo. Un análisis de post-explotación profesional debe evaluar el impacto en cada dimensión por separado.

## 2. Técnicas fundamentales de post-explotación

### 2.1. Enumeración interna
Una vez dentro del sistema, el primer paso es enumerar el entorno interno: usuarios existentes, grupos, procesos activos, servicios corriendo, archivos de configuración accesibles, historial de comandos, credenciales en memoria o en archivos.

### 2.2. Escalada de privilegios
Si el acceso inicial es como usuario de bajos privilegios, la escalada busca obtener permisos de administrador o root. Los vectores típicos incluyen:
- Explotación de servicios corriendo como root/SYSTEM.
- SUID/SGID mal configurados en Linux.
- Abuso de permisos de escritura en archivos de configuración del sistema.
- Credenciales de administrador en archivos de configuración.
- Vulnerabilidades del kernel.

### 2.3. Movimiento lateral
El movimiento lateral utiliza el acceso obtenido como trampolín para acceder a otros sistemas en la misma red. Técnicas comunes:
- Pass-the-hash: uso de hashes de contraseñas capturadas para autenticarse en otros sistemas.
- Pass-the-ticket: abuso de tickets Kerberos en entornos Windows.
- Credenciales reutilizadas: uso de las mismas credenciales en múltiples sistemas.
- Abuso de confianzas SSH: uso de claves SSH configuradas para acceso entre hosts.

### 2.4. Persistencia
La persistencia garantiza que el atacante mantenga acceso incluso si el vector de entrada original es detectado y eliminado. Técnicas:
- Creación de usuarios backdoor.
- Tareas programadas (cron jobs, tareas de Windows).
- Modificación de archivos de inicio del sistema.
- Instalación de webshells en servidores web.
- Modificación de claves SSH autorizadas.

### 2.5. Extracción de información sensible
Identificar y acceder a datos de valor: bases de datos de usuarios, credenciales almacenadas, documentos confidenciales, claves de API, configuraciones de sistemas adicionales.

## 3. El concepto de "radio de explosión"

El radio de explosión (blast radius) es la medida del daño que puede producirse a partir de un único punto de compromiso inicial. Una vulnerabilidad en un servidor con acceso mínimo a otros sistemas tiene un radio pequeño. Una vulnerabilidad en un servidor de directorio activo o de autenticación centralizada puede tener un radio que abarca toda la organización.

Calcular el radio de explosión de un compromiso es uno de los objetivos principales de la post-explotación en una evaluación profesional.

## 4. Técnicas de evasión de detección

En un entorno real, el atacante intentará realizar acciones de post-explotación sin ser detectado por los sistemas de monitoreo del objetivo. Técnicas de evasión comunes:

- **Living off the land (LoTL):** usar herramientas legítimas del sistema en vez de herramientas ofensivas que puedan ser detectadas por antivirus (PowerShell, WMI, PsExec en Windows; bash, python, curl en Linux).
- **Operación en memoria:** ejecutar código directamente en memoria sin escribir archivos en disco, evitando detección basada en archivos.
- **Modificación de logs:** eliminar o alterar registros de actividad para ocultar las acciones realizadas.
- **Temporización:** espaciar las acciones para evitar detección por umbral (muchas acciones en poco tiempo disparan alertas).

En CyberLab, el análisis de qué acciones son detectadas (mediante `show alerts`) permite comprender qué técnicas son más silenciosas.

## 5. Documentación en post-explotación

La documentación de post-explotación es la más compleja y valiosa del análisis:

- **Qué acceso se obtuvo:** descripción técnica del punto de compromiso.
- **Qué se pudo hacer desde ese acceso:** inventario de acciones posibles y realizadas.
- **Qué datos fueron accesibles:** clasificación de información disponible.
- **Cuál es el radio de explosión:** alcance del compromiso hacia otros sistemas.
- **Cómo se podría haber detectado:** análisis de la visibilidad defensiva.
- **Recomendaciones de remediación:** qué cambios específicos reducirían el impacto.
