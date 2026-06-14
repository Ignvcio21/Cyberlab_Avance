# Nivel 4 — Análisis de red y tráfico

## 1. Más allá de los logs del sistema

Los niveles anteriores se centraron en el análisis de archivos de log del sistema operativo. El Nivel 4 introduce una dimensión adicional: el análisis del tráfico de red a nivel de paquetes y puertos.

Los logs del sistema registran lo que ocurre dentro del servidor. El análisis de red captura lo que ocurre entre el servidor y el exterior: qué puertos están expuestos, qué tráfico entra y sale, qué protocolos se usan. Esta visión complementaria es esencial para una defensa completa.

## 2. tcpdump: captura de tráfico de red

`tcpdump` es la herramienta estándar de captura de tráfico en Linux. Permite ver los paquetes de red en tiempo real o filtrar capturas anteriores. A diferencia de las herramientas GUI como Wireshark, `tcpdump` opera completamente en línea de comandos y es fundamental en entornos de servidor sin interfaz gráfica.

En el contexto del análisis defensivo, `tcpdump` permite:
- Ver qué tráfico está llegando al servidor ahora mismo.
- Capturar tráfico de una IP específica para análisis detallado.
- Identificar tráfico inusual (protocolo incorrecto, puerto inesperado, volumen anómalo).

## 3. nmap: reconocimiento de la propia red

En el Nivel 4, el analista defensivo usa `nmap` no para atacar, sino para tener la misma visión que tendría un atacante sobre su propia red. Esto permite:
- Verificar qué servicios están expuestos al exterior.
- Detectar servicios que no deberían estar activos.
- Comparar el inventario de servicios esperado con el real.

Un servidor que tiene el puerto 3389 (RDP) abierto cuando solo debería tener el 22 (SSH) y el 80 (HTTP) es un indicador de compromiso o configuración incorrecta.

## 4. netstat -tulpn: puertos en escucha

`netstat -tulpn` muestra qué servicios están escuchando en qué puertos y qué proceso los controla. Esta información es fundamental para:
- Verificar que los servicios activos son los esperados.
- Detectar servicios inesperados abiertos por malware o configuración incorrecta.
- Relacionar los puertos abiertos con los procesos que los controlan.

## 5. La perspectiva de red complementa la de logs

Los logs del sistema muestran lo que el servidor registró. El análisis de red muestra lo que realmente está ocurriendo en la capa de comunicaciones. Un atacante sofisticado puede intentar borrar sus huellas en los logs, pero el tráfico de red es más difícil de ocultar. Combinar ambas perspectivas da una visión más completa y robusta del incidente.
