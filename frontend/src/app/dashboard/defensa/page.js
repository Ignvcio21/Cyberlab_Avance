"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import GuardSesion from "../../componentes/GuardSesion"
import BarraSuperior from "../../componentes/BarraSuperior"
import TransicionPagina from "../../componentes/TransicionPagina"

// ================================================================
// CONSTANTES
// ================================================================
const LIMITE_SEG  = 360   // 6 minutos por ejercicio
const TOTAL_EJ    = 5
const API = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"

const getAuthHeaders = () => ({
  "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
  "Content-Type": "application/json"
})

// ================================================================
// POOL DE COMANDOS DEFENSIVOS
// cmd  = lo que escribe el estudiante
// desc = descripción en el checklist (sin revelar el comando)
// ================================================================
const POOL_DEF = {
  // Eventos
  eventos:           { cmd: "journalctl -n 50",                      desc: "Consultar eventos del sistema" },
  eventosRecientes:  { cmd: "journalctl -n 10",                      desc: "Revisar eventos recientes" },
  eventosFB:         { cmd: "grep Failed /var/log/auth.log",         desc: "Filtrar eventos de fuerza bruta" },
  eventosEscaneo:    { cmd: "grep scan /var/log/syslog",             desc: "Filtrar eventos de escaneo" },
  eventosRed:        { cmd: "netstat -an",                           desc: "Revisar eventos de red" },
  // Alertas
  alertas:           { cmd: "tail -50 /var/log/syslog",              desc: "Consultar alertas activas" },
  alertasCriticas:   { cmd: "grep -i crit /var/log/syslog",         desc: "Revisar alertas críticas" },
  alertasActivas:    { cmd: "tail -f /var/log/syslog",               desc: "Listar alertas en curso" },
  // Análisis de IPs
  analizarIp:        { cmd: "nmap -sV <IP>",                         desc: "Analizar IP sospechosa" },
  historialIp:       { cmd: "grep <IP> /var/log/auth.log",           desc: "Revisar historial de IP" },
  traficoIp:         { cmd: "tcpdump host <IP> -c 20",               desc: "Analizar tráfico de IP" },
  // Bloqueo
  bloquearIp:        { cmd: "iptables -A INPUT -s <IP> -j DROP",     desc: "Bloquear IP atacante" },
  desbloquearIp:     { cmd: "iptables -D INPUT -s <IP> -j DROP",     desc: "Desbloquear IP" },
  ipsBloqueadas:     { cmd: "iptables -L INPUT -n",                  desc: "Verificar IPs bloqueadas" },
  // Logs
  logs:              { cmd: "cat /var/log/syslog",                   desc: "Consultar logs del sistema" },
  logsAuth:          { cmd: "cat /var/log/auth.log",                 desc: "Revisar logs de autenticación" },
  logsFirewall:      { cmd: "iptables -L -v",                        desc: "Revisar logs del firewall" },
  logsSsh:           { cmd: "grep sshd /var/log/auth.log",           desc: "Revisar logs SSH" },
  logsWeb:           { cmd: "tail -50 /var/log/nginx/access.log",    desc: "Revisar logs web" },
  // Estado
  estadoSistema:     { cmd: "systemctl status",                      desc: "Verificar estado del sistema" },
  estadoFirewall:    { cmd: "iptables -L -n -v",                     desc: "Verificar estado del firewall" },
  estadoServidor:    { cmd: "top -bn1",                              desc: "Verificar estado del servidor" },
  // Reporte
  generarReporte:    { cmd: "export-report",                         desc: "Generar reporte de incidente" },
  // Extras
  whoami:            { cmd: "whoami",                                desc: "Identificar usuario activo" },
  estadoRed:         { cmd: "netstat -tulpn",                        desc: "Verificar estado de la red" },
  correlacionar:     { cmd: "lastb -n 20",                           desc: "Correlacionar eventos y alertas" },
}

// ================================================================
// 7 NIVELES × 5 EJERCICIOS — MODO DEFENSA
// ================================================================
const NIVELES_DEFENSA = {

  // ─────────────────────────────────────────────
  // NIVEL 1 — Monitoreo básico y orientación
  // ─────────────────────────────────────────────
  1: {
    nombre:          "Monitoreo Básico",
    tipo_simulacion: "fuerza_bruta",
    descripcion:     "Aprende a navegar el sistema de monitoreo, interpretar eventos y alertas básicas.",
    ejercicios: {
      1: {
        titulo:   "Ejercicio 1 — Primera revisión del sistema (guiado)",
        contexto: "Acabas de iniciar turno como analista defensivo. Antes de cualquier acción, un buen analista conoce el estado general del sistema. Tu primera tarea es verificar el estado operativo del entorno y luego consultar qué eventos han ocurrido recientemente.",
        checklist: ["estadoSistema", "eventos"],
        guiado: true,
      },
      2: {
        titulo:   "Ejercicio 2 — Consulta de alertas activas",
        contexto: "El sistema de detección reportó actividad. Tu tarea es revisar las alertas activas del IDS para entender qué tipo de incidente está ocurriendo y cuál es su severidad antes de tomar decisiones.",
        checklist: ["alertas", "alertasActivas"],
        guiado: false,
      },
      3: {
        titulo:   "Ejercicio 3 — Identificación de IP sospechosa",
        contexto: "Las alertas indican actividad desde una fuente externa. Debes consultar los eventos del sistema para identificar la IP que genera el tráfico anómalo y luego analizarla para entender su comportamiento.",
        checklist: ["eventos", "analizarIp"],
        guiado: false,
      },
      4: {
        titulo:   "Ejercicio 4 — Revisión de logs básicos",
        contexto: "Para complementar el análisis de alertas y eventos, los logs del sistema contienen información detallada sobre cada actividad registrada. Consulta los logs generales y luego los de autenticación para detectar anomalías.",
        checklist: ["logs", "logsAuth"],
        guiado: false,
      },
      5: {
        titulo:   "Ejercicio 5 — Primera contención autónoma",
        contexto: "Evaluación del nivel. Detectaste actividad sospechosa desde una IP externa. Sin asistencia: consulta el estado del sistema, revisa las alertas activas, identifica la IP que genera el problema, bloquéala y verifica que el bloqueo quedó registrado.",
        checklist: ["estadoSistema", "alertas", "analizarIp", "bloquearIp", "ipsBloqueadas"],
        guiado: false,
      },
    },
  },

  // ─────────────────────────────────────────────
  // NIVEL 2 — Detección de fuerza bruta
  // ─────────────────────────────────────────────
  2: {
    nombre:          "Fuerza Bruta — Defensa",
    tipo_simulacion: "fuerza_bruta",
    descripcion:     "Detecta y neutraliza ataques de autenticación por fuerza bruta contra servicios expuestos.",
    ejercicios: {
      1: {
        titulo:   "Ejercicio 1 — Detección de intentos masivos (guiado)",
        contexto: "El servidor SSH reporta una cantidad anormal de intentos de autenticación fallidos. Este patrón es la firma clásica de un ataque de fuerza bruta. Filtra los eventos de fuerza bruta, revisa los logs de autenticación para confirmar el patrón y analiza la IP responsable.",
        checklist: ["eventosFB", "logsAuth", "analizarIp"],
        guiado: true,
      },
      2: {
        titulo:   "Ejercicio 2 — Bloqueo del atacante",
        contexto: "Ya identificaste la IP que realiza los intentos de autenticación masivos. El siguiente paso es aplicar el bloqueo y verificar que el firewall registró la regla correctamente para detener los intentos.",
        checklist: ["bloquearIp", "estadoFirewall", "ipsBloqueadas"],
        guiado: false,
      },
      3: {
        titulo:   "Ejercicio 3 — Análisis post-bloqueo",
        contexto: "Después de bloquear al atacante, es fundamental verificar que la amenaza se detuvo. Consulta los eventos de fuerza bruta para confirmar que no hay nuevos intentos y revisa el estado general del sistema.",
        checklist: ["eventosFB", "estadoSistema", "alertas"],
        guiado: false,
      },
      4: {
        titulo:   "Ejercicio 4 — Fuerza bruta en múltiples servicios",
        contexto: "Se detectan intentos de autenticación fallidos no solo en SSH sino también en el panel web. El atacante está probando múltiples vectores simultáneamente. Analiza los logs SSH y web, revisa el historial de la IP para confirmar el patrón distribuido y aplica la contención.",
        checklist: ["logsSsh", "logsWeb", "historialIp", "bloquearIp"],
        guiado: false,
      },
      5: {
        titulo:   "Ejercicio 5 — Respuesta completa a fuerza bruta",
        contexto: "Evaluación del nivel. Ataque de fuerza bruta activo en curso. Sin asistencia: detecta los eventos, revisa los logs de autenticación, analiza la IP atacante, consulta su historial, bloquéala y verifica el estado del firewall.",
        checklist: ["eventosFB", "logsAuth", "analizarIp", "historialIp", "bloquearIp", "estadoFirewall"],
        guiado: false,
      },
    },
  },

  // ─────────────────────────────────────────────
  // NIVEL 3 — Reconocimiento y escaneo
  // ─────────────────────────────────────────────
  3: {
    nombre:          "Escaneo de Red — Defensa",
    tipo_simulacion: "escaneo_puertos",
    descripcion:     "Detecta actividad de reconocimiento activo y neutraliza al atacante antes de que avance.",
    ejercicios: {
      1: {
        titulo:   "Ejercicio 1 — Detección de reconocimiento (guiado)",
        contexto: "El IDS detectó conexiones repetitivas hacia distintos puertos desde una misma IP externa. Este patrón indica reconocimiento activo. Filtra los eventos de escaneo y analiza el tráfico de la IP sospechosa para confirmar el comportamiento.",
        checklist: ["eventosEscaneo", "traficoIp"],
        guiado: true,
      },
      2: {
        titulo:   "Ejercicio 2 — Identificación de puertos objetivo",
        contexto: "El atacante está sondeando tu infraestructura buscando servicios abiertos. Revisa los logs del firewall para identificar qué puertos están siendo probados y luego analiza la IP para entender el alcance del reconocimiento.",
        checklist: ["logsFirewall", "analizarIp"],
        guiado: false,
      },
      3: {
        titulo:   "Ejercicio 3 — Bloqueo de origen de escaneo",
        contexto: "Ya tienes evidencia suficiente del reconocimiento activo. Bloquea la IP que realiza el escaneo, verifica el estado del firewall tras el bloqueo y consulta la lista de IPs bloqueadas para confirmar.",
        checklist: ["bloquearIp", "estadoFirewall", "ipsBloqueadas"],
        guiado: false,
      },
      4: {
        titulo:   "Ejercicio 4 — Análisis de impacto del escaneo",
        contexto: "Una vez bloqueado el origen, es crítico entender qué información pudo haber obtenido el atacante durante el reconocimiento. Revisa los logs del firewall y del servidor, consulta el historial de la IP y verifica el estado del sistema.",
        checklist: ["logsFirewall", "estadoServidor", "historialIp", "estadoSistema"],
        guiado: false,
      },
      5: {
        titulo:   "Ejercicio 5 — Respuesta completa a reconocimiento",
        contexto: "Evaluación del nivel. Reconocimiento activo detectado desde IP externa. Sin asistencia: filtra los eventos de escaneo, analiza el tráfico de la IP, revisa los logs del firewall, bloquea el origen, verifica el estado del sistema y confirma el bloqueo.",
        checklist: ["eventosEscaneo", "traficoIp", "logsFirewall", "bloquearIp", "estadoSistema", "ipsBloqueadas"],
        guiado: false,
      },
    },
  },

  // ─────────────────────────────────────────────
  // NIVEL 4 — Investigación de incidentes
  // ─────────────────────────────────────────────
  4: {
    nombre:          "Investigación de Incidentes",
    tipo_simulacion: "fuerza_bruta",
    descripcion:     "Correlaciona múltiples fuentes de evidencia para reconstruir la línea de tiempo de un incidente.",
    ejercicios: {
      1: {
        titulo:   "Ejercicio 1 — Análisis de alertas múltiples (guiado)",
        contexto: "El sistema generó varias alertas en un intervalo corto. Esto puede indicar un ataque coordinado o múltiples vectores simultáneos. Revisa todas las alertas activas y las críticas para establecer la prioridad de respuesta.",
        checklist: ["alertas", "alertasCriticas"],
        guiado: true,
      },
      2: {
        titulo:   "Ejercicio 2 — Correlación de eventos",
        contexto: "Con las alertas identificadas, el siguiente paso es correlacionar los eventos del sistema para construir una línea de tiempo del incidente. Consulta los eventos generales, luego filtra por red y fuerza bruta para identificar patrones.",
        checklist: ["eventos", "eventosRed", "eventosFB"],
        guiado: false,
      },
      3: {
        titulo:   "Ejercicio 3 — Investigación de IP reincidente",
        contexto: "Durante la correlación identificaste una IP que aparece en múltiples tipos de eventos. Este comportamiento reincidente es indicador de un atacante persistente. Analiza esa IP, revisa su historial completo y consulta el tráfico que genera.",
        checklist: ["analizarIp", "historialIp", "traficoIp"],
        guiado: false,
      },
      4: {
        titulo:   "Ejercicio 4 — Construcción del timeline",
        contexto: "Para documentar correctamente el incidente necesitas revisar todas las fuentes de log disponibles. Consulta los logs de autenticación, firewall y SSH para reconstruir la secuencia completa de acciones del atacante.",
        checklist: ["logsAuth", "logsFirewall", "logsSsh"],
        guiado: false,
      },
      5: {
        titulo:   "Ejercicio 5 — Investigación y mitigación completa",
        contexto: "Evaluación del nivel. Incidente complejo en curso con múltiples alertas y eventos correlacionados. Sin asistencia: analiza las alertas críticas, correlaciona eventos, investiga la IP reincidente con su historial, revisa los logs, bloquea al responsable y verifica el estado del sistema.",
        checklist: ["alertasCriticas", "correlacionar", "historialIp", "logsAuth", "bloquearIp", "estadoSistema"],
        guiado: false,
      },
    },
  },

  // ─────────────────────────────────────────────
  // NIVEL 5 — Respuesta defensiva activa
  // ─────────────────────────────────────────────
  5: {
    nombre:          "Respuesta Defensiva",
    tipo_simulacion: "escaneo_puertos",
    descripcion:     "Aplica medidas defensivas completas bajo presión: bloqueo, verificación y restauración del entorno.",
    ejercicios: {
      1: {
        titulo:   "Ejercicio 1 — Detección de amenaza activa (guiado)",
        contexto: "El sistema de monitoreo indica que hay una amenaza activa en este momento. Debes actuar con rapidez. Verifica el estado del sistema para evaluar la situación general y luego revisa las alertas activas para determinar el tipo y severidad de la amenaza.",
        checklist: ["estadoSistema", "alertasActivas"],
        guiado: true,
      },
      2: {
        titulo:   "Ejercicio 2 — Bloqueo y contención rápida",
        contexto: "La amenaza fue identificada. Tienes que aplicar el bloqueo de la IP atacante, verificar inmediatamente el estado del firewall para confirmar que la regla fue aplicada y revisar la lista de IPs bloqueadas.",
        checklist: ["bloquearIp", "estadoFirewall", "ipsBloqueadas"],
        guiado: false,
      },
      3: {
        titulo:   "Ejercicio 3 — Verificación del entorno post-contención",
        contexto: "Después de contener la amenaza, debes verificar que el entorno volvió a un estado seguro. Revisa el estado del servidor, el estado de la red y consulta los logs del firewall para confirmar que no quedan actividades residuales.",
        checklist: ["estadoServidor", "estadoRed", "logsFirewall"],
        guiado: false,
      },
      4: {
        titulo:   "Ejercicio 4 — Validación integral de la respuesta",
        contexto: "Una respuesta defensiva completa requiere validar que todos los vectores fueron cubiertos. Consulta los eventos recientes para verificar que no hay nueva actividad, revisa las alertas y confirma el estado general del sistema.",
        checklist: ["eventosRecientes", "alertas", "estadoSistema"],
        guiado: false,
      },
      5: {
        titulo:   "Ejercicio 5 — Respuesta bajo presión total",
        contexto: "Evaluación del nivel. Amenaza activa con múltiples indicadores. Sin asistencia: verifica el estado del sistema, revisa alertas críticas, analiza la IP atacante, aplica el bloqueo, verifica el firewall, confirma que los eventos se detuvieron y valida el estado del servidor.",
        checklist: ["estadoSistema", "alertasCriticas", "analizarIp", "bloquearIp", "estadoFirewall", "eventosRecientes", "estadoServidor"],
        guiado: false,
      },
    },
  },

  // ─────────────────────────────────────────────
  // NIVEL 6 — Escenarios complejos multi-vector
  // ─────────────────────────────────────────────
  6: {
    nombre:          "Escenarios Complejos",
    tipo_simulacion: "fuerza_bruta",
    descripcion:     "Enfrenta incidentes con múltiples atacantes, priorización de amenazas y análisis avanzado.",
    ejercicios: {
      1: {
        titulo:   "Ejercicio 1 — Múltiples IPs atacantes (guiado)",
        contexto: "El dashboard muestra alertas críticas provenientes de más de una fuente. Esto indica un ataque coordinado desde múltiples orígenes. Revisa las alertas críticas para identificar todos los actores involucrados, luego analiza la IP más activa.",
        checklist: ["alertasCriticas", "analizarIp"],
        guiado: true,
      },
      2: {
        titulo:   "Ejercicio 2 — Priorización de amenazas",
        contexto: "Con múltiples atacantes identificados, necesitas priorizar. Correlaciona los eventos de fuerza bruta y escaneo, revisa el tráfico de las IPs más activas y determina cuál representa mayor riesgo antes de actuar.",
        checklist: ["eventosFB", "eventosEscaneo", "traficoIp", "historialIp"],
        guiado: false,
      },
      3: {
        titulo:   "Ejercicio 3 — Mitigación escalonada",
        contexto: "Has priorizado las amenazas. Ahora aplica la mitigación de forma ordenada: bloquea la IP de mayor riesgo, verifica el estado del firewall, revisa si los eventos de esa IP se detuvieron y confirma la lista de bloqueados.",
        checklist: ["bloquearIp", "estadoFirewall", "eventosFB", "ipsBloqueadas"],
        guiado: false,
      },
      4: {
        titulo:   "Ejercicio 4 — Análisis de logs complejos",
        contexto: "El incidente dejó trazas en múltiples fuentes de log. Para un análisis forense completo debes revisar los logs de autenticación, firewall y SSH de forma correlacionada para reconstruir el ataque multi-vector.",
        checklist: ["logsAuth", "logsFirewall", "logsSsh", "correlacionar"],
        guiado: false,
      },
      5: {
        titulo:   "Ejercicio 5 — Gestión de incidente complejo",
        contexto: "Evaluación del nivel. Ataque coordinado desde múltiples IPs con vectores simultáneos. Sin asistencia: identifica todas las amenazas, prioriza, aplica mitigación completa, analiza los logs, correlaciona los eventos, verifica el estado del sistema y confirma la estabilidad del entorno.",
        checklist: ["alertasCriticas", "historialIp", "traficoIp", "bloquearIp", "logsAuth", "correlacionar", "estadoSistema"],
        guiado: false,
      },
    },
  },

  // ─────────────────────────────────────────────
  // NIVEL 7 — Defensa integral autónoma
  // ─────────────────────────────────────────────
  7: {
    nombre:          "Defensa Integral",
    tipo_simulacion: "escaneo_puertos",
    descripcion:     "Operación defensiva completa sin asistencia: detección, investigación, mitigación y reporte.",
    ejercicios: {
      1: {
        titulo:   "Ejercicio 1 — Detección integral del incidente (guiado)",
        contexto: "Inicio de operación defensiva completa. El primer paso es obtener una visión total del estado del sistema: verifica el estado operativo, consulta todos los eventos activos y revisa las alertas para entender el panorama completo antes de actuar.",
        checklist: ["estadoSistema", "eventos", "alertas"],
        guiado: true,
      },
      2: {
        titulo:   "Ejercicio 2 — Investigación profunda del origen",
        contexto: "Con el panorama identificado, debes investigar en profundidad el origen del incidente. Analiza la IP principal, revisa su historial completo, consulta el tráfico que genera y correlaciona los hallazgos con los logs del firewall.",
        checklist: ["analizarIp", "historialIp", "traficoIp", "logsFirewall"],
        guiado: false,
      },
      3: {
        titulo:   "Ejercicio 3 — Análisis de impacto completo",
        contexto: "Para determinar el daño potencial del incidente debes revisar exhaustivamente todas las fuentes de log disponibles: autenticación, SSH y servidor web. Esto permite identificar si el atacante logró acceso, qué recursos sondeó y qué información obtuvo.",
        checklist: ["logsAuth", "logsSsh", "logsWeb", "estadoServidor"],
        guiado: false,
      },
      4: {
        titulo:   "Ejercicio 4 — Mitigación y verificación completa",
        contexto: "Con el análisis completo en mano, aplica la mitigación definitiva: bloquea todas las IPs involucradas, verifica el estado del firewall, confirma la lista de bloqueados, revisa que los eventos se detuvieron y valida el estado integral del sistema.",
        checklist: ["bloquearIp", "estadoFirewall", "ipsBloqueadas", "eventosRecientes", "estadoSistema"],
        guiado: false,
      },
      5: {
        titulo:   "Ejercicio 5 — Operación defensiva completa con reporte",
        contexto: "Evaluación final del curso defensivo. Incidente real complejo: múltiples atacantes, vectores mixtos, logs con trazas en todas las fuentes. Sin ninguna asistencia: detecta, investiga, correlaciona, mitiga completamente, valida el estado del entorno y genera el reporte técnico oficial del incidente.",
        checklist: ["eventos", "alertasCriticas", "analizarIp", "historialIp", "logsAuth", "bloquearIp", "ipsBloqueadas", "estadoSistema", "generarReporte"],
        guiado: false,
      },
    },
  },
}

// ================================================================
// HELPERS
// ================================================================
const DESC_PASO  = (clave) => POOL_DEF[clave]?.desc || clave
const CMD_PASO   = (clave, ip) => {
  const p = POOL_DEF[clave]
  if (!p) return clave
  return ip ? p.cmd.replace("<IP>", ip) : p.cmd
}

const checklistVacio = (nivel, num) => {
  const def = NIVELES_DEFENSA[nivel]?.ejercicios?.[num]
  if (!def) return {}
  return Object.fromEntries(def.checklist.map(k => [k, false]))
}

const checklistCompleto = (cl) => Object.keys(cl).length > 0 && Object.values(cl).every(Boolean)
const calcularPct       = (cl) => {
  const t = Object.keys(cl).length
  if (!t) return 0
  return Math.round(Object.values(cl).filter(Boolean).length / t * 100)
}

const siguientePaso = (cl, nivel, num) => {
  const def = NIVELES_DEFENSA[nivel]?.ejercicios?.[num]
  if (!def) return null
  return def.checklist.find(p => !cl[p]) ?? null
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

// Mapeo exacto comando → clave checklist (defensa)
const CMD_A_CLAVE_DEF = {
  "journalctl -n 50":                    "eventos",
  "journalctl -n 10":                    "eventosRecientes",
  "grep failed /var/log/auth.log":       "eventosFB",
  "grep scan /var/log/syslog":           "eventosEscaneo",
  "netstat -an":                         "eventosRed",
  "tail -50 /var/log/syslog":           "alertas",
  "grep -i crit /var/log/syslog":       "alertasCriticas",
  "tail -f /var/log/syslog":            "alertasActivas",
  "iptables -l input -n":               "ipsBloqueadas",
  "cat /var/log/syslog":                "logs",
  "cat /var/log/auth.log":              "logsAuth",
  "iptables -l -v":                     "logsFirewall",
  "grep sshd /var/log/auth.log":        "logsSsh",
  "tail -50 /var/log/nginx/access.log": "logsWeb",
  "systemctl status":                   "estadoSistema",
  "iptables -l -n -v":                  "estadoFirewall",
  "top -bn1":                           "estadoServidor",
  "export-report":                      "generarReporte",
  "whoami":                             "whoami",
  "netstat -tulpn":                     "estadoRed",
  "lastb -n 20":                        "correlacionar",
}

// ================================================================
// COMPONENTE PRINCIPAL
// ================================================================
export default function DefensaDashboard() {
  const router  = useRouter()
  const termRef = useRef(null)

  const [nombreUsuario, setNombreUsuario] = useState("")
  const [comando,       setComando]       = useState("")
  const [historial,     setHistorial]     = useState([
    "CyberLab Defensa — Modo analista SOC",
    "Escribe 'ayuda' para ver los comandos disponibles.",
  ])
  const [mensaje,       setMensaje]       = useState("")

  // Nivel y ejercicio
  const [nivelActivo,  setNivelActivo]  = useState(1)
  const [ejercicios,   setEjercicios]   = useState({
    1: { actual: 1, completados: 0 },
    2: { actual: 1, completados: 0 },
    3: { actual: 1, completados: 0 },
    4: { actual: 1, completados: 0 },
    5: { actual: 1, completados: 0 },
    6: { actual: 1, completados: 0 },
    7: { actual: 1, completados: 0 },
  })

  // Escenario activo
  const [escenario,   setEscenario]   = useState(null)
  const [estadoEsc,   setEstadoEsc]   = useState("inactivo")
  const [textoEsc,    setTextoEsc]    = useState("No hay ejercicio activo.\nEjecuta una simulación defensiva para comenzar.")
  const [checklist,   setChecklist]   = useState({})
  const [inicioEsc,   setInicioEsc]   = useState(null)
  const [tiempoRest,  setTiempoRest]  = useState(LIMITE_SEG)
  const [intentoReg,  setIntentoReg]  = useState(false)
  const [ayudas,      setAyudas]      = useState(0)
  const [hint,        setHint]        = useState("")
  const [mostrarHint, setMostrarHint] = useState(false)
  const [cargandoAyuda, setCargandoAyuda] = useState(false)
  const [reporte,     setReporte]     = useState(null)
  const [modalReporte,setModalReporte]= useState(false)
  const [modalNivel,  setModalNivel]  = useState(1)
  const [modalAbierto,setModalAbierto]= useState(false)
  const [inicioSes,   setInicioSes]   = useState(null)
  const [tiempoSes,   setTiempoSes]   = useState(0)
  const [stats,       setStats]       = useState({ total_eventos: 0, total_alertas: 0 })

  // ── Modo ejercicios docente ──
  const [ejerciciosDocente,  setEjerciciosDocente]  = useState([])
  const [ejDocenteActivo,    setEjDocenteActivo]    = useState(null)
  const [checklistManual,    setChecklistManual]    = useState({})
  const [timerDocente,       setTimerDocente]       = useState(0)
  const [timerDocenteActivo, setTimerDocenteActivo] = useState(false)
  const [ayudasDocente,      setAyudasDocente]      = useState(0)
  const [pistaDocente,       setPistaDocente]       = useState("")
  const [mostrarPista,       setMostrarPista]       = useState(false)
  const [cargandoPista,      setCargandoPista]      = useState(false)
  const [nivelDocenteAbierto,setNivelDocenteAbierto] = useState(1)
  const modoDocente = true
  const [confirmEjDocente, setConfirmEjDocente] = useState(null)
  // ── Popup fin de ejercicio ──
  const [popupFin,    setPopupFin]    = useState(false)
  const [popupFinPct, setPopupFinPct] = useState(0)
  const [popupGano,   setPopupGano]   = useState(false)
  // ── Ataque en tiempo real ──
  const [faseAtaqueDisparada, setFaseAtaqueDisparada] = useState([])

  const claveLS = useMemo(() =>
    nombreUsuario ? `cyberlab_defensa_${nombreUsuario}` : null,
  [nombreUsuario])

  // Derivados
  const ejActual    = ejercicios[nivelActivo]?.actual || 1
  const defActual   = NIVELES_DEFENSA[nivelActivo]?.ejercicios?.[ejActual]
  const pct         = calcularPct(checklist)
  const timerClass  = tiempoRest <= 60 ? "danger" : tiempoRest <= 120 ? "warning" : ""
  const [bannerVisible, setBannerVisible] = useState(true)

  const nivelDesbloqueado = (n) => {
    if (n === 1) return true
    return (ejercicios[n - 1]?.completados || 0) >= TOTAL_EJ
  }

  // ── LocalStorage ──────────────────────────────────────────────
  const leerLS = useCallback(() => {
    if (!claveLS) return null
    try { return JSON.parse(localStorage.getItem(claveLS) || "null") } catch { return null }
  }, [claveLS])

  const guardarLS = useCallback((data) => {
    if (!claveLS) return
    const anterior = (() => {
      try { return JSON.parse(localStorage.getItem(claveLS) || "null") } catch { return null }
    })() || {}
    localStorage.setItem(claveLS, JSON.stringify({ ...anterior, ...data }))
  }, [claveLS])

  // ── Estadísticas ───────────────────────────────────────────────
  const cargarStats = async () => {
    try {
      const d = await (await fetch(`${API}/estadisticas`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token") || ""}` }
      })).json()
      setStats({
        total_eventos: d?.total_eventos ?? 0,
        total_alertas: d?.total_alertas ?? 0,
      })
    } catch {}
  }

  // ── Texto inicial del escenario ────────────────────────────────
  const textoInicial = (datos, nivel, num) => {
    const def    = NIVELES_DEFENSA[nivel]?.ejercicios?.[num]
    const titulo = def?.titulo || "Ejercicio defensivo"
    const ctx    = def?.contexto || ""
    const narr   = datos?.texto_caso || ""

    let guia = ""
    if (def?.guiado) {
      guia = "\n\n💡 Ejercicio guiado — pasos en orden:\n"
      def.checklist.forEach((p, i) => {
        guia += `  ${i + 1}. ${DESC_PASO(p)}\n`
      })
    }
    return `━━ ${titulo} ━━\n\n${narr}\n\n🛡 Situación operacional:\n${ctx}${guia}`
  }

  // ── Iniciar escenario ──────────────────────────────────────────
  const iniciarEscenario = (datos, nivel, num) => {
    const vars = Array.isArray(datos?.variables) ? datos.variables : []
    const ov   = k => vars.find(v => v.clave === k)?.valor || ""
    const ip   = datos?.ip || ov("ip_atacante") || ov("ip_origen") || "—"

    const nuevo = {
      id: datos?.id || null,
      ejercicio_id: datos?.ejercicio_id || null,
      tipo: "Defensa",
      ip, vars,
    }
    const clInicial = checklistVacio(nivel, num)
    setEscenario(nuevo)
    setEstadoEsc("iniciado")
    setChecklist(clInicial)
    setMostrarHint(false)
    setHint("")
    setAyudas(0)
    const txt = textoInicial(datos, nivel, num)
    setTextoEsc(txt)
    setInicioEsc(Date.now())
    setTiempoRest(LIMITE_SEG)
    setReporte(null)
    setIntentoReg(false)
    guardarLS({ escenario: nuevo, estadoEsc: "iniciado", textoEsc: txt, checklist: clInicial, inicioEsc: Date.now(), nivelActivo })
  }

  // ── Simular ────────────────────────────────────────────────────
  const simular = async () => {
    if (!inicioSes) { setInicioSes(Date.now()); setReporte(null) }
    const defNivel = NIVELES_DEFENSA[nivelActivo]
    const url = defNivel?.tipo_simulacion === "fuerza_bruta"
      ? `${API}/simular/fuerza-bruta`
      : `${API}/simular/escaneo-puertos`
    try {
      const r = await fetch(url, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ nombre_usuario: nombreUsuario })
      })
      const d = await r.json()
      if (!r.ok) { setMensaje(d?.detail || "Error en simulación"); return }
      setMensaje(`Nivel ${nivelActivo} — Ejercicio ${ejActual}/5 iniciado`)
      await cargarStats()
      setHistorial(p => [...p,
        `> system: escenario defensivo cargado — nivel ${nivelActivo} ej ${ejActual}/5`,
        d?.mensaje || "Escenario activo."
      ])
      iniciarEscenario(d, nivelActivo, ejActual)
    } catch { setMensaje("No se pudo conectar con el backend") }
  }

  // ── Avanzar ejercicio ──────────────────────────────────────────
  const avanzar = () => {
    setEjercicios(prev => {
      const curr = prev[nivelActivo] || { actual: 1, completados: 0 }
      const comp = Math.min(curr.completados + 1, TOTAL_EJ)
      const act  = Math.min(comp + 1, TOTAL_EJ)
      const nuevo = { ...prev, [nivelActivo]: { actual: act, completados: comp } }
      guardarLS({ ejercicios: nuevo })
      return nuevo
    })
  }

  // ── Registrar intento ──────────────────────────────────────────
  const registrarIntento = async () => {
    if (intentoReg || !nombreUsuario || !escenario) return false
    const tUsado = Math.max(0, LIMITE_SEG - tiempoRest)
    const ejId   = escenario.ejercicio_id || 1
    try {
      const r = await fetch(`${API}/intentos/crear`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({
          nombre_usuario: nombreUsuario, ejercicio_id: ejId,
          tiempo_seg: tUsado, errores: 0, porcentaje: 100, estado: "aprobado"
        })
      })
      if (r.ok) { setIntentoReg(true); return true }
    } catch {}
    return false
  }

  // ── Reiniciar por tiempo ───────────────────────────────────────
  const reiniciarPorTiempo = () => {
    setEscenario(null); setEstadoEsc("inactivo")
    setTextoEsc("Tiempo agotado.\nEl ejercicio fue reiniciado. Inicia de nuevo.")
    setChecklist({}); setInicioEsc(null); setTiempoRest(LIMITE_SEG)
    setReporte(null); setIntentoReg(false); setMostrarHint(false); setHint("")
    setHistorial(p => [...p, "> system: tiempo agotado", "Ejercicio reiniciado."])
  }

  // ── Pedir ayuda ────────────────────────────────────────────────
  const pedirAyuda = async () => {
    if (!escenario) { setMensaje("No hay ejercicio activo."); return }
    setCargandoAyuda(true)
    try {
      const r = await fetch(`${API}/escenario/pedir-ayuda`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ nombre_usuario: nombreUsuario })
      })
      const d = await r.json()
      if (r.ok) {
        const sig = siguientePaso(checklist, nivelActivo, ejActual)
        const ip  = escenario?.ip || "?"
        const h   = !sig
          ? "Ya completaste todos los pasos. Genera el reporte."
          : `Ejecuta: ${CMD_PASO(sig, ip)}`
        setHint(h); setAyudas(d.veces_pedida || 0); setMostrarHint(true)
        setHistorial(p => [...p, `> system: ayuda #${d.veces_pedida} (-${d.penalizacion_porcentaje}%)`, h])
      }
    } catch { setMensaje("No se pudo obtener la pista") }
    finally { setCargandoAyuda(false) }
  }

  // ── Actualizar checklist tras comando ──────────────────────────
  const actualizarTrasComando = useCallback(async (cmdN, salida) => {
    if (!escenario) return
    const sal = String(salida ?? "").toLowerCase()
    const def = NIVELES_DEFENSA[nivelActivo]?.ejercicios?.[ejActual]
    if (!def) return

    let clave = null

    // Comandos con IP — caso especial (sintaxis real Linux/iptables)
    if (cmdN.startsWith("iptables -a input -s ") && def.checklist.includes("bloquearIp")) {
      if (sal.includes("bloqueada") || sal.includes("blocked") || sal.includes("drop") || sal.includes("regla")) clave = "bloquearIp"
    } else if (cmdN.startsWith("iptables -d input -s ") && def.checklist.includes("desbloquearIp")) {
      clave = "desbloquearIp"
    } else if (cmdN.startsWith("nmap ") && def.checklist.includes("analizarIp")) {
      clave = "analizarIp"
    } else if (cmdN.startsWith("grep ") && cmdN.includes("/var/log/auth.log") && !cmdN.includes("failed") && !cmdN.includes("sshd") && def.checklist.includes("historialIp")) {
      clave = "historialIp"
    } else if ((cmdN.startsWith("tcpdump ") && cmdN.includes("host")) && def.checklist.includes("traficoIp")) {
      clave = "traficoIp"
    } else {
      const c = CMD_A_CLAVE_DEF[cmdN]
      if (c && def.checklist.includes(c)) clave = c
    }

    if (!clave) return

    const nuevoCL = { ...checklist, [clave]: true }
    setChecklist(nuevoCL)
    const completo = checklistCompleto(nuevoCL)
    setEstadoEsc(completo ? "resuelto" : "iniciado")
    const nuevoTexto = completo
      ? "✅ Ejercicio completado.\n\nTodos los pasos defensivos fueron ejecutados correctamente.\n\nPuedes generar el reporte o iniciar el siguiente ejercicio."
      : textoEsc
    setTextoEsc(nuevoTexto)
    guardarLS({ checklist: nuevoCL, estadoEsc: completo ? "resuelto" : "iniciado", textoEsc: nuevoTexto })
    if (completo) { await registrarIntento(); avanzar() }
  }, [escenario, checklist, nivelActivo, ejActual, textoEsc, guardarLS])

  // ── Ejecutar comando ───────────────────────────────────────────
  const ejecutarComando = async (e) => {
    e.preventDefault()
    if (!comando.trim()) return
    if (!inicioSes) { setInicioSes(Date.now()); setReporte(null) }
    const cmd  = comando.trim()
    const cmdN = cmd.toLowerCase()
    setComando("")
    const prompt = `soc@cyberlab:~$ ${cmd}`

    try {
      const r = await fetch(`${API}/defensa/terminal`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({
          nombre_usuario: nombreUsuario,
          comando: cmd,
          ip_escenario: escenario?.ip || null,
        })
      })
      const d   = await r.json()
      const sal = d?.salida ?? ""
      if (sal === "__LIMPIAR__") {
        setHistorial(["CyberLab Defensa — Modo analista SOC", "Escribe 'ayuda' para ver los comandos."])
      } else {
        setHistorial(p => [...p, prompt, ...String(sal).split("\n")])
      }
      await actualizarTrasComando(cmdN, sal)
      actualizarChecklistDocente(cmdN, sal)
      await cargarStats()
    } catch {
      setHistorial(p => [...p, prompt, "Error: no se pudo conectar con la terminal defensiva."])
    }
  }

  // ── Generar reporte ────────────────────────────────────────────
  const generarReporte = async () => {
    if (!checklistCompleto(checklist)) {
      setMensaje("Completa todos los pasos del ejercicio antes de generar el reporte.")
      return
    }
    await registrarIntento()
    const rep = {
      nombreUsuario, duracionSegundos: tiempoSes,
      totalEventos: stats.total_eventos, totalAlertas: stats.total_alertas,
      nivel: nivelActivo, ejercicio: ejActual, ayudas,
      modoDefensa: true,
    }
    try {
      const r = await fetch(`${API}/reporte?nombre_usuario=${nombreUsuario}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token") || ""}` }
      })
      if (r.ok) {
        const d = await r.json()
        rep.totalEventos  = d.total_eventos ?? rep.totalEventos
        rep.totalAlertas  = d.total_alertas ?? rep.totalAlertas
        rep.ipsBloqueadas = Array.isArray(d.ips_bloqueadas)
          ? d.ips_bloqueadas.map(x => x.direccion_ip || x) : []
      }
    } catch {}
    setReporte(rep)
    setModalReporte(true)
    setHistorial(p => [...p, "> system: reporte defensivo generado"])
  }

  // ── Efectos ────────────────────────────────────────────────────
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight
  }, [historial])

  useEffect(() => {
    const u = localStorage.getItem("nombre_usuario")
    if (!u) { router.push("/"); return }
    setNombreUsuario(u)
  }, [router])

  useEffect(() => {
    if (!nombreUsuario) return
    cargarStats()
    const g = leerLS()
    if (g) {
      setEscenario(g.escenario || null)
      setEstadoEsc(g.estadoEsc || "inactivo")
      setTextoEsc(g.textoEsc || "No hay ejercicio activo.")
      setChecklist(g.checklist || {})
      setInicioEsc(g.inicioEsc || null)
      setTiempoRest(typeof g.tiempoRest === "number" ? g.tiempoRest : LIMITE_SEG)
      setNivelActivo(g.nivelActivo || 1)
      if (g.ejercicios) setEjercicios(prev => ({ ...prev, ...g.ejercicios }))
    }
    // Cargar ejercicios del docente para modo defensa
    fetch(`${API}/ejercicios-docente/tipo/defensa`, { headers: getAuthHeaders() })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setEjerciciosDocente(d) }).catch(() => {})
    const iv = setInterval(cargarStats, 5000)
    return () => clearInterval(iv)
  }, [nombreUsuario])

  useEffect(() => {
    if (!timerDocenteActivo || !ejDocenteActivo) return
    const iv = setInterval(() => {
      setTimerDocente(p => {
        if (p <= 1) {
          clearInterval(iv); setTimerDocenteActivo(false)
          setFaseAtaqueDisparada([])
          // Auto-entregar con el progreso actual
          setChecklistManual(cl => {
            const pct = Math.round(Object.values(cl).filter(Boolean).length / Math.max(Object.keys(cl).length, 1) * 100)
            if (ejDocenteActivo) {
              fetch(`${API}/ejercicios-docente/${ejDocenteActivo.id}/entregar`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${localStorage.getItem("token") || ""}`, "Content-Type": "application/json" },
                body: JSON.stringify({ respuesta: `Tiempo agotado. Progreso: ${pct}%.`, ayudas_pedidas: 0 }),
              }).catch(() => {})
            }
            return cl
          })
          setChecklistManual(cl2 => {
            const pctFinal = Math.round(Object.values(cl2).filter(Boolean).length / Math.max(Object.keys(cl2).length, 1) * 100)
            setPopupFinPct(pctFinal); setPopupGano(false); setPopupFin(true)
            return cl2
          })
          setHistorial(prev => [...prev,
            "────────────────────────────────────────────",
            "🔴 [SISTEMA] TIEMPO AGOTADO — El ejercicio ha finalizado.",
            "   El atacante ha completado su objetivo. Ejercicio enviado automáticamente.",
          ])
          return 0
        }
        return p - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [timerDocenteActivo, ejDocenteActivo])

  const itemCompletadoPorComando = (descripcion, cmdNorm) => {
    const d = descripcion.toLowerCase(); const c = cmdNorm.toLowerCase()
    const reglas = [
      { kw: ["alertas","alerta","ids"],                     cmds: ["show alerts","alert","eventos"] },
      { kw: ["eventos","evento","log"],                     cmds: ["show events","log","eventos","journalctl"] },
      { kw: ["bloquear","bloqueo","firewall","deny"],       cmds: ["block ip","iptables","ufw","firewall"] },
      { kw: ["tráfico","trafico","sniff","captura"],        cmds: ["show traffic","tcpdump","tshark","wireshark"] },
      { kw: ["usuarios","usuario","cuentas"],               cmds: ["show users","enumerate users","whoami"] },
      { kw: ["sesiones","sesión","conexiones activas"],     cmds: ["show sessions","netstat","ss -"] },
      { kw: ["procesos","proceso"],                         cmds: ["show processes","ps aux","ps -"] },
      { kw: ["intentos fallidos","bruteforce","fuerza bruta"], cmds: ["show failed","failed logins","auth.log"] },
      { kw: ["verificar","verificación","estado"],          cmds: ["status","show blocked","verificar"] },
      { kw: ["correlac","correlación","análisis"],          cmds: ["correlacionar","correlac","analizar"] },
      { kw: ["documentar","registrar","detalles del incidente","futuros análisis","futuros analisis"], cmds: ["generar-reporte","export","logs"] },
      { kw: ["reporte","informe","reportar","reporta","dirección de seguridad","medidas tomadas"], cmds: ["generar-reporte","correlacionar","export"] },
      { kw: ["forense","artefactos","evidencia"],           cmds: ["forensic","strings","volatility","autopsy"] },
      { kw: ["malware","threat","caza"],                    cmds: ["yara","zeek","hunt","threat"] },
    ]
    for (const r of reglas) {
      if (r.kw.some(k => d.includes(k)) && r.cmds.some(cmd => c.includes(cmd))) return true
    }
    return false
  }

  const pedirPistaDocente = async () => {
    if (!ejDocenteActivo || cargandoPista) return
    const itemPendiente = ejDocenteActivo.items.find(it => !checklistManual[it.id])
    if (!itemPendiente) return
    setCargandoPista(true)
    setAyudasDocente(p => p + 1)
    try {
      const r = await fetch(`${API}/terminal`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({
          nombre_usuario: nombreUsuario,
          comando: `hint: Estoy realizando un ejercicio de defensa SOC. El paso que debo completar es: "${itemPendiente.descripcion}". Dame una pista corta (máximo 2 líneas) sobre qué comando o herramienta usar, sin revelar la solución exacta.`
        })
      })
      const d = await r.json()
      setPistaDocente(d?.salida ?? "Analiza el contexto del ejercicio y piensa qué herramienta defensiva corresponde a este paso.")
      setMostrarPista(true)
    } catch {
      setPistaDocente("Revisa el contexto del ejercicio e identifica qué herramienta de análisis corresponde a este paso.")
      setMostrarPista(true)
    } finally { setCargandoPista(false) }
  }

  const iniciarEjDocente = (ej) => {
    const cl = {}
    ej.items.forEach(it => { cl[it.id] = false })
    setEjDocenteActivo(ej)
    setChecklistManual(cl)
    setAyudasDocente(0); setPistaDocente(""); setMostrarPista(false)
    setFaseAtaqueDisparada([])
    const totalSeg = (ej.tiempo_minutos || 10) * 60
    setTimerDocente(totalSeg)
    setTimerDocenteActivo(true)
    setHistorial([
      "CyberLab SOC Terminal — Modo Defensa activa",
      `[SISTEMA] Ejercicio iniciado: ${ej.titulo}`,
      "[SISTEMA] Monitoreo en curso. El atacante está activo — responde a los eventos.",
      "────────────────────────────────────────────",
    ])
  }

  // Genera el mensaje de ataque según la descripción del ítem y la fase
  const generarMensajeAtaque = (item, faseIdx, totalFases, completado) => {
    const ts = new Date().toLocaleTimeString("es-CL", { hour:"2-digit", minute:"2-digit", second:"2-digit" })
    const desc = item.descripcion.toLowerCase()
    const severity = faseIdx >= totalFases - 1 ? "🔴 CRÍTICO" : faseIdx >= totalFases / 2 ? "🟠 ALTO" : "🟡 MEDIO"

    if (completado) {
      return [
        `[${ts}] ✅ ATAQUE BLOQUEADO — Fase ${faseIdx + 1}/${totalFases} neutralizada`,
        `         El analista respondió a tiempo. El atacante retrocede.`,
      ]
    }

    let lineas = []
    if (desc.includes("alerta") || desc.includes("tráfico") || desc.includes("ids") || desc.includes("inusual")) {
      lineas = [
        `[${ts}] ${severity} IDS: Tráfico anómalo detectado hacia servidor interno`,
        `         Paquetes/seg: ELEVADO | Fuente: múltiples IPs | Puerto: 443, 8080`,
      ]
    } else if (desc.includes("fuerza bruta") || desc.includes("login") || desc.includes("autenticación") || desc.includes("acceso")) {
      lineas = [
        `[${ts}] ${severity} BRUTE FORCE: ${30 + faseIdx * 15} intentos SSH fallidos detectados`,
        `         Fuente: 192.168.${10 + faseIdx}.${50 + faseIdx * 7} | Objetivo: srv-interno | ACCIÓN REQUERIDA`,
      ]
    } else if (desc.includes("bloquear") || desc.includes("mitigar") || desc.includes("medidas") || desc.includes("contener")) {
      lineas = [
        `[${ts}] ${severity} ESCALADA: El atacante aumenta la intensidad del ataque`,
        `         Sin respuesta del analista — acceso SSH intentado con éxito parcial`,
      ]
    } else if (desc.includes("correlac") || desc.includes("origen") || desc.includes("analizar") || desc.includes("naturaleza")) {
      lineas = [
        `[${ts}] ${severity} RECONOCIMIENTO: Escaneo de red activo desde IP externa`,
        `         Puertos mapeados: 22, 80, 443, 3306 | Fingerprinting del SO detectado`,
      ]
    } else if (desc.includes("document") || desc.includes("reporte") || desc.includes("registr") || desc.includes("reportar")) {
      lineas = [
        `[${ts}] ${severity} PERSISTENCIA: Atacante intentando instalar backdoor`,
        `         Proceso sospechoso detectado: nc -lvp 4444 | PID: ${800 + faseIdx * 11}`,
      ]
    } else {
      lineas = [
        `[${ts}] ${severity} INCIDENTE Fase ${faseIdx + 1}/${totalFases}: ${item.descripcion}`,
        `         El sistema requiere respuesta del analista SOC`,
      ]
    }
    return lineas
  }

  // useEffect: dispara fases de ataque en tiempo real según el timer del ejercicio
  useEffect(() => {
    if (!timerDocenteActivo || !ejDocenteActivo) return
    const totalSeg = (ejDocenteActivo.tiempo_minutos || 10) * 60
    const items = ejDocenteActivo.items
    if (!items.length) return
    const phaseInterval = totalSeg / items.length
    const elapsed = totalSeg - timerDocente

    items.forEach((item, idx) => {
      const faseThreshold = (idx + 1) * phaseInterval
      if (elapsed >= faseThreshold && !faseAtaqueDisparada.includes(idx)) {
        setFaseAtaqueDisparada(prev => [...prev, idx])
        const completado = checklistManual[item.id] === true
        const mensajes = generarMensajeAtaque(item, idx, items.length, completado)
        setHistorial(prev => [...prev, "────────────────────────────────────────────", ...mensajes])
      }
    })
  }, [timerDocente, timerDocenteActivo, ejDocenteActivo])

  const actualizarChecklistDocente = (cmdNorm, salida) => {
    if (!ejDocenteActivo) return
    if (String(salida).toLowerCase().includes("command not found")) return
    setChecklistManual(prev => {
      const nuevo = { ...prev }; let cambio = false
      ejDocenteActivo.items.forEach(it => {
        if (!nuevo[it.id] && itemCompletadoPorComando(it.descripcion, cmdNorm)) { nuevo[it.id] = true; cambio = true }
      })
      if (!cambio) return prev
      if (Object.values(nuevo).every(Boolean)) {
        setTimerDocenteActivo(false)
        setFaseAtaqueDisparada([])
        const tiempoUsado = (ejDocenteActivo.tiempo_minutos * 60) - timerDocente
        setPopupFinPct(100); setPopupGano(true); setPopupFin(true)
        fetch(`${API}/ejercicios-docente/${ejDocenteActivo.id}/entregar`, {
          method: "POST", headers: getAuthHeaders(),
          body: JSON.stringify({ respuesta: `Completado vía terminal defensiva. Tiempo: ${tiempoUsado}s. Ayudas: ${ayudasDocente}`, ayudas_pedidas: ayudasDocente }),
        }).catch(() => {})
      }
      return nuevo
    })
  }

  const NOMBRES_NIVELES_DEF = {1:"Monitoreo Básico",2:"Detección FB",3:"Escaneo — Defensa",4:"Investigación",5:"Respuesta Activa",6:"Multi-vector",7:"Defensa Integral"}

  const pctDocente = ejDocenteActivo
    ? Math.round(Object.values(checklistManual).filter(Boolean).length / Math.max(Object.keys(checklistManual).length, 1) * 100)
    : 0

  useEffect(() => {
    if (!inicioSes) return
    const iv = setInterval(() => setTiempoSes(Math.floor((Date.now() - inicioSes) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [inicioSes])

  useEffect(() => {
    if (!inicioEsc || estadoEsc === "inactivo") return
    const iv = setInterval(() => {
      const r = Math.max(0, LIMITE_SEG - Math.floor((Date.now() - inicioEsc) / 1000))
      setTiempoRest(r)
      if (r <= 0 && !checklistCompleto(checklist)) reiniciarPorTiempo()
    }, 1000)
    return () => clearInterval(iv)
  }, [inicioEsc, estadoEsc, checklist])

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <GuardSesion>
      <TransicionPagina>
        <div className="dashboard-page">
          <div className="dashboard-container">

            <BarraSuperior paginaActiva="defensa" />

            {/* ── BANNER ejercicio activo (verde SOC) ── */}
            {estadoEsc !== "inactivo" && bannerVisible && (
              <div className={`banner${estadoEsc === "resuelto" ? " resolved" : ""}`}
                style={estadoEsc !== "resuelto" ? { background:"rgba(48,209,88,0.10)", borderColor:"rgba(48,209,88,0.28)" } : {}}>
                <span className="banner-icon">{estadoEsc === "resuelto" ? "✅" : "🛡"}</span>
                <div>
                  {estadoEsc === "resuelto"
                    ? <><strong>¡Incidente mitigado!</strong> Nivel {nivelActivo} — Ej. {ejActual}/5. Genera el reporte de incidente.</>
                    : <><strong style={{ color:"#30d158" }}>Ejercicio activo:</strong> Nivel {nivelActivo} — Ejercicio {ejActual}/5. Timer corriendo. <strong style={{ color:"#30d158" }}>{fmt(tiempoRest)}</strong> restantes.
                      {ayudas > 0 && <span style={{ color:"#ff9f0a", marginLeft:8 }}>⚠ {ayudas} ayuda{ayudas>1?"s":""} (-{Math.min(ayudas*5,30)}%)</span>}</>
                  }
                </div>
                <button className="banner-close" onClick={() => setBannerVisible(false)}>✕</button>
              </div>
            )}

            {/* ── PAGE HEADER ── */}
            <header style={{ marginBottom:4, display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16 }}>
              <div>
                <h1 style={{ margin:"0 0 4px", fontSize:32, fontWeight:800, letterSpacing:"-1px", color:"#f5f5f7", lineHeight:1 }}>
                  Dashboard
                </h1>
                <p style={{ margin:0, fontSize:15, color:"#8e8e93" }}>
                  {nombreUsuario && <><strong style={{ color:"#aeaeb2" }}>{nombreUsuario}</strong> · </>}
                  🛡 Defensa SOC · {NOMBRES_NIVELES_DEF[nivelActivo]?.nombre || "Centro de Operaciones"} · Ej. {ejActual}/5
                </p>
              </div>
              {tiempoSes > 0 && (
                <span style={{ fontFamily:"var(--mono)", fontSize:13, color:"#8e8e93", background:"#1c1c1e", border:"1px solid #2c2c2e", padding:"6px 12px", borderRadius:8, flexShrink:0 }}>
                  ⏱ {tiempoSes}s
                </span>
              )}
            </header>

            {/* ── STATS — 3 tarjetas (verde SOC) ── */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
              {[
                { label:"EVENTOS DETECTADOS", valor: stats.total_eventos, colorClass:"blue",   sub:"eventos / eventos recientes" },
                { label:"ALERTAS ACTIVAS",    valor: stats.total_alertas, colorClass:"orange",  sub:"alertas / alertas criticas" },
                { label:"NIVEL SOC ACTIVO",   valor: `${nivelActivo}/7`,  colorClass:"green",   sub:`Ej. ${ejActual} de 5` },
              ].map(({ label, valor, colorClass, sub }) => (
                <div key={label} className="stat-card-mock">
                  <div className="stat-label-mock">{label}</div>
                  <div className={`stat-value-mock ${colorClass}`}>{valor}</div>
                  <div className="stat-delta-mock">{sub}</div>
                </div>
              ))}
            </div>

            {/* ── NIVELES DEFENSA ── */}
            {(() => {
              const porNivel = {}
              ejerciciosDocente.forEach(ej => { const n=ej.nivel||1; if(!porNivel[n]) porNivel[n]=[]; porNivel[n].push(ej) })
              const n    = nivelDocenteAbierto || 1
              const lista = porNivel[n] || []
              return (
                <div className="card-mock">
                  <div className="card-mock-header">
                    <div>
                      <div className="card-mock-title">Niveles de entrenamiento</div>
                      <div className="card-mock-subtitle">7 niveles SOC · Nivel {nivelActivo} activo</div>
                    </div>
                    <span className="card-mock-tag green">
                      {(ejercicios[nivelActivo]?.completados||0)} / 5 completados
                    </span>
                  </div>
                  <div className="card-mock-body">
                    <div className="levels-grid-mock">
                      {[1,2,3,4,5,6,7].map(lv => {
                        const comp  = ejercicios[lv]?.completados || 0
                        const act   = lv === nivelActivo
                        const done  = comp >= TOTAL_EJ
                        const desbloqueado = nivelDesbloqueado(lv)
                        const pctLv = done ? 100 : Math.round(comp/TOTAL_EJ*100)
                        return (
                          <button
                            key={lv}
                            className={`level-card-mock${act?" active":done?" done":""}`}
                            style={act ? { borderColor:"#30d158", background:"rgba(48,209,88,0.12)" } :
                                   done ? { borderColor:"rgba(48,209,88,0.35)", background:"rgba(48,209,88,0.08)" } : {}}
                            onClick={() => { setNivelActivo(lv); setNivelDocenteAbierto(lv) }}
                          >
                            <div className="level-num-mock" style={act?{color:"#30d158"}:done?{color:"#30d158"}:{}}>{lv}</div>
                            <div className="level-name-mock">{NOMBRES_NIVELES_DEF[lv]}</div>
                            <div className="level-progress-mock">
                              <div className="level-fill-mock" style={{ width:`${pctLv}%`, background: act||done ? "#30d158" : "#3a3a3c" }}/>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    {/* Ejercicios del docente */}
                    {lista.length > 0 && (
                      <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid #2c2c2e" }}>
                        <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color:"#8e8e93", marginBottom:10 }}>
                          EJERCICIOS DOCENTE — {NOMBRES_NIVELES_DEF[n]}
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                          {lista.map(ej => {
                            const activo = ejDocenteActivo?.id === ej.id
                            return (
                              <button key={ej.id} onClick={() => setConfirmEjDocente(ej)} style={{
                                textAlign:"left", padding:"11px 14px", borderRadius:10, width:"100%",
                                border: activo ? "1.5px solid #30d158" : "1px solid #2c2c2e",
                                background: activo ? "rgba(48,209,88,0.10)" : "#242426",
                                color: activo ? "#30d158" : "#f5f5f7", cursor:"pointer", transition:"all 0.15s",
                                display:"flex", alignItems:"center", gap:12,
                              }}>
                                <div style={{ flex:1 }}>
                                  <div style={{ fontWeight:700, fontSize:13, marginBottom:2 }}>{ej.titulo}</div>
                                  <div style={{ fontSize:11, color:"#8e8e93" }}>{ej.items.length} punto{ej.items.length!==1?"s":""} · {ej.tiempo_minutos} min</div>
                                </div>
                                {activo && <span style={{ fontSize:11, fontWeight:700 }}>▶ Activo</span>}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {lista.length === 0 && (
                      <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid #2c2c2e", fontSize:13, color:"#8e8e93", textAlign:"center" }}>
                        El docente aún no ha publicado ejercicios de defensa en este nivel.
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* ── EJERCICIO DOCENTE ACTIVO ── */}
            {modoDocente && ejDocenteActivo && (
              <div className="exercise-card" style={{ borderColor:"rgba(48,209,88,0.35)" }}>
                {/* Header con título + timer */}
                <div className="exercise-header">
                  <div style={{ flex:1 }}>
                    <div className="exercise-title" style={{ color:"#30d158" }}>{ejDocenteActivo.titulo}</div>
                    <div className="exercise-meta">
                      🛡 Defensa SOC · Paso {Object.values(checklistManual).filter(Boolean).length} de {ejDocenteActivo.items.length} · {ejDocenteActivo.tiempo_minutos} min
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    {ayudasDocente > 0 && (
                      <span style={{ fontFamily:"var(--mono)", fontSize:12, color:"#f59e0b" }}>
                        💡 {ayudasDocente} pista{ayudasDocente>1?"s":""}
                      </span>
                    )}
                    <div className={`timer-badge${timerDocente<=60?" danger":timerDocente<=120?" warning":""}`}
                      style={timerDocente>120?{ borderColor:"rgba(48,209,88,0.30)", color:"#30d158" }:{}}>
                      ⏱ {fmt(timerDocente)}
                    </div>
                  </div>
                </div>

                {/* Escenario / contexto generado — visible completo */}
                <pre className="mission-text" style={{ margin:"16px 24px 0" }}>
                  {ejDocenteActivo.contexto_generado || ejDocenteActivo.descripcion}
                </pre>

                {/* Barra de progreso */}
                <div className="progress-bar" style={{ margin:"16px 24px 0" }}>
                  <div className="progress-fill" style={{
                    width:`${pctDocente}%`,
                    background: pctDocente===100 ? "#30d158" : "linear-gradient(90deg,#30d158,#00b4d8)"
                  }}/>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", margin:"4px 24px 0", fontSize:11, fontFamily:"var(--mono)", color:"var(--texto-apagado)" }}>
                  <span>Progreso defensivo</span>
                  <span style={{ color: pctDocente===100?"#30d158":"var(--texto-apagado)" }}>{pctDocente}%</span>
                </div>

                {/* Checklist de pasos — grid horizontal */}
                <div style={{
                  display:"grid",
                  gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",
                  gap:10, margin:"16px 24px 0"
                }}>
                  {ejDocenteActivo.items.map((it, idx) => {
                    const done = checklistManual[it.id]
                    const bajoAtaque = faseAtaqueDisparada.includes(idx) && !done
                    return (
                      <div key={it.id} style={{
                        display:"flex", flexDirection:"column", gap:8,
                        padding:"12px 14px", borderRadius:12,
                        border: done
                          ? "1px solid rgba(48,209,88,0.35)"
                          : bajoAtaque
                            ? "1px solid rgba(255,69,58,0.40)"
                            : "1px solid rgba(255,255,255,0.08)",
                        background: done
                          ? "rgba(48,209,88,0.08)"
                          : bajoAtaque
                            ? "rgba(255,69,58,0.07)"
                            : "rgba(255,255,255,0.03)",
                        transition:"all 0.3s",
                      }}>
                        {/* Número + estado */}
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{
                            width:26, height:26, borderRadius:"50%", flexShrink:0,
                            display:"grid", placeItems:"center",
                            fontSize:12, fontWeight:800, fontFamily:"var(--mono)",
                            background: done
                              ? "rgba(48,209,88,0.20)"
                              : bajoAtaque
                                ? "rgba(255,69,58,0.20)"
                                : "rgba(255,255,255,0.06)",
                            border: done
                              ? "1.5px solid rgba(48,209,88,0.50)"
                              : bajoAtaque
                                ? "1.5px solid rgba(255,69,58,0.50)"
                                : "1.5px solid rgba(255,255,255,0.12)",
                            color: done ? "#30d158" : bajoAtaque ? "#ff453a" : "var(--texto-apagado)",
                          }}>
                            {done ? "✓" : bajoAtaque ? "!" : idx + 1}
                          </div>
                          {bajoAtaque && (
                            <span style={{ fontSize:9, fontWeight:800, fontFamily:"var(--mono)", color:"#ff453a", letterSpacing:"0.05em", textTransform:"uppercase" }}>
                              ⚠ Bajo ataque
                            </span>
                          )}
                          {done && (
                            <span style={{ fontSize:9, fontWeight:800, fontFamily:"var(--mono)", color:"#30d158", letterSpacing:"0.05em", textTransform:"uppercase" }}>
                              ✅ Neutralizado
                            </span>
                          )}
                        </div>
                        {/* Descripción */}
                        <span style={{
                          fontSize:12, lineHeight:1.5,
                          color: done ? "#30d158" : bajoAtaque ? "#ffb4ab" : "var(--texto-secundario)",
                          fontWeight: bajoAtaque ? 600 : 400,
                        }}>
                          {it.descripcion}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Acciones */}
                <div className="exercise-actions">
                  {pctDocente < 100 && (
                    <button onClick={pedirPistaDocente} disabled={cargandoPista} className="boton-ayuda">
                      {cargandoPista ? "Analizando..." : "💡 Pedir pista"}
                    </button>
                  )}
                  {pctDocente === 100 && (
                    <div style={{ padding:"8px 16px", background:"rgba(48,209,88,0.12)", border:"1px solid rgba(48,209,88,0.28)", borderRadius:980, color:"#30d158", fontWeight:700, fontSize:14 }}>
                      ✅ Todos los ataques neutralizados{ayudasDocente>0?` · ${ayudasDocente} pista${ayudasDocente>1?"s":""} usada${ayudasDocente>1?"s":""}` : ""}
                    </div>
                  )}
                  {mostrarPista && pistaDocente && (
                    <div className="hint-box" style={{ flex:1 }}>
                      <p style={{ margin:0 }}>{pistaDocente}</p>
                      <button onClick={() => setMostrarPista(false)} style={{ background:"none", border:"none", color:"#f59e0b", cursor:"pointer", fontSize:12, marginTop:4 }}>✕ Cerrar</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Estado vacío — sin ejercicios */}
            {ejerciciosDocente.length === 0 && (
              <div className="card-mock" style={{ padding:"44px 24px", textAlign:"center" }}>
                <div style={{ fontSize:40, marginBottom:14 }}>🛡</div>
                <div style={{ fontSize:16, fontWeight:700, color:"#aeaeb2", marginBottom:8 }}>
                  No hay ejercicios disponibles
                </div>
                <div style={{ fontSize:14, color:"#8e8e93" }}>
                  El docente aún no ha publicado ejercicios de defensa. Vuelve más tarde.
                </div>
              </div>
            )}

            {/* ── TERMINAL SOC — mismo estilo que ataque, acento verde ── */}
            <section style={{ background:"#0d1117", border:"1px solid rgba(48,209,88,0.18)", borderRadius:18, overflow:"hidden", boxShadow:"0 8px 40px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.04)" }}>
              <div style={{ background:"#161b22", padding:"11px 16px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display:"flex", gap:6 }}>
                  <div style={{ width:12, height:12, borderRadius:"50%", background:"#ff5f57" }}/>
                  <div style={{ width:12, height:12, borderRadius:"50%", background:"#febc2e" }}/>
                  <div style={{ width:12, height:12, borderRadius:"50%", background:"#28c840" }}/>
                </div>
                <div style={{ flex:1, textAlign:"center", fontFamily:"var(--mono)", fontSize:12, color:"rgba(255,255,255,0.40)" }}>
                  CyberLab Terminal SOC — Modo Defensa
                </div>
                <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"#30d158", background:"rgba(48,209,88,0.12)", padding:"3px 8px", borderRadius:6, border:"1px solid rgba(48,209,88,0.25)" }}>
                  ● SOC LIVE
                </div>
              </div>
              <div className="terminal-window" ref={termRef} style={{ borderRadius:0, borderLeft:"none", borderRight:"none", borderTop:"none" }}>
                {historial.map((l, i) => (
                  <div key={i} className={`terminal-line ${l.startsWith("soc@cyberlab") ? "terminal-cmd" : ""}`}>{l}</div>
                ))}
              </div>
              <form onSubmit={ejecutarComando} className="terminal-form" style={{ margin:0, borderRadius:"0 0 18px 18px", borderLeft:"none", borderRight:"none", borderBottom:"none", borderTop:"1px solid rgba(48,209,88,0.14)" }}>
                <span className="terminal-prefix" style={{ color:"#30d158" }}>soc@cyberlab:~$</span>
                <input className="terminal-input" value={comando} onChange={e => setComando(e.target.value)}
                  placeholder="Escribe un comando defensivo..." autoComplete="off" spellCheck={false}
                  style={{ color:"#c9d1d9", caretColor:"#30d158" }}/>
              </form>
            </section>


            {/* ── Popup fin de ejercicio docente ── */}
            {popupFin && (
              <div className="modal-fondo" onClick={() => setPopupFin(false)}>
                <div className="modal-tarjeta" style={{ maxWidth:480, textAlign:"center" }} onClick={e => e.stopPropagation()}>
                  <div style={{ fontSize:52, marginBottom:12 }}>{popupGano ? "🛡" : "💀"}</div>
                  <h2 style={{
                    margin:"0 0 8px", fontSize:24, fontWeight:900,
                    color: popupGano ? "#30d158" : "#ff453a"
                  }}>
                    {popupGano ? "¡Ataque neutralizado!" : "El atacante ganó"}
                  </h2>
                  <p style={{ margin:"0 0 20px", fontSize:14, color:"#8e8e93", lineHeight:1.6 }}>
                    {popupGano
                      ? `Completaste el ejercicio al 100%. Todos los vectores de ataque fueron detenidos.`
                      : `Tiempo agotado. Progreso alcanzado: ${popupFinPct}%. El atacante logró su objetivo.`}
                  </p>

                  {/* Barra de progreso */}
                  <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:999, height:10, margin:"0 0 20px", overflow:"hidden" }}>
                    <div style={{
                      height:"100%", borderRadius:999,
                      width:`${popupFinPct}%`,
                      background: popupGano ? "#30d158" : popupFinPct >= 50 ? "#f59e0b" : "#ff453a",
                      transition:"width 0.6s ease",
                    }}/>
                  </div>
                  <div style={{ fontSize:32, fontWeight:900, fontFamily:"var(--mono)", color: popupGano ? "#30d158" : "#ff453a", marginBottom:20 }}>
                    {popupFinPct}%
                  </div>

                  <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
                    <button
                      className="boton-principal"
                      style={{ background: popupGano ? "#30d158" : undefined, color: popupGano ? "#000" : undefined }}
                      onClick={() => { setPopupFin(false); setEjDocenteActivo(null) }}
                    >
                      {popupGano ? "Continuar →" : "Reintentar"}
                    </button>
                    <button className="boton-secundario" onClick={() => setPopupFin(false)}>
                      Ver terminal
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Modal confirmación ejercicio docente ── */}
            {confirmEjDocente && (
              <div className="modal-fondo" onClick={() => setConfirmEjDocente(null)}>
                <div className="modal-tarjeta" style={{ maxWidth:480 }} onClick={e => e.stopPropagation()}>
                  <div className="modal-cabecera">
                    <h3 className="modal-titulo">🛡 ¿Iniciar ejercicio?</h3>
                    <button className="boton-secundario" onClick={() => setConfirmEjDocente(null)}>✕</button>
                  </div>
                  <div className="modal-cuerpo" style={{ display:"grid", gap:16 }}>
                    {/* Info del ejercicio */}
                    <div style={{ background:"rgba(48,209,88,0.06)", border:"1px solid rgba(48,209,88,0.22)", borderRadius:14, padding:"18px 20px" }}>
                      <div style={{ fontSize:11, fontFamily:"var(--mono)", color:"#30d158", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>
                        Ejercicio SOC — Blue Team
                      </div>
                      <div style={{ fontSize:18, fontWeight:800, color:"#f5f5f7", letterSpacing:"-0.3px", marginBottom:6 }}>
                        {confirmEjDocente.titulo}
                      </div>
                      <div style={{ fontSize:13, color:"#8e8e93", lineHeight:1.5 }}>
                        {confirmEjDocente.descripcion}
                      </div>
                    </div>
                    {/* Meta chips */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                      {[
                        { l:"Modo",   v:"🛡 Defensa SOC" },
                        { l:"Nivel",  v:`Nivel ${confirmEjDocente.nivel || 1}` },
                        { l:"Tiempo", v:`${confirmEjDocente.tiempo_minutos} min` },
                      ].map(({ l, v }) => (
                        <div key={l} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:10, padding:"11px 14px" }}>
                          <div style={{ fontSize:10, fontFamily:"var(--mono)", color:"#6e6e73", letterSpacing:"0.06em", marginBottom:4 }}>{l}</div>
                          <div style={{ fontSize:14, fontWeight:700, color:"#f5f5f7" }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <p style={{ margin:0, fontSize:13, color:"#8e8e93", lineHeight:1.6, background:"rgba(255,159,10,0.06)", border:"1px solid rgba(255,159,10,0.18)", borderRadius:10, padding:"10px 14px" }}>
                      ⚠ Una vez que confirmes, el temporizador comenzará inmediatamente. Asegúrate de estar listo.
                    </p>
                    <div style={{ display:"flex", gap:10 }}>
                      <button
                        style={{ flex:1, padding:"14px 20px", fontSize:15, fontWeight:800, borderRadius:980, background:"#30d158", color:"#000", border:"none", cursor:"pointer", letterSpacing:"-0.2px" }}
                        onClick={() => { iniciarEjDocente(confirmEjDocente); setConfirmEjDocente(null) }}
                      >
                        Sí, iniciar →
                      </button>
                      <button
                        className="btn-mock-outline"
                        style={{ flex:1, padding:"14px 20px", fontSize:15 }}
                        onClick={() => setConfirmEjDocente(null)}
                      >
                        No, cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Modal reporte ── */}
            {modalReporte && reporte && (
              <div className="modal-fondo" onClick={() => setModalReporte(false)}>
                <div className="modal-tarjeta" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
                  <div className="modal-cabecera">
                    <h3 className="modal-titulo">🛡 Reporte de incidente — Modo Defensa</h3>
                    <button className="boton-secundario" onClick={() => setModalReporte(false)}>Cerrar</button>
                  </div>
                  <div className="modal-cuerpo" style={{ display: "grid", gap: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                      {[
                        { l: "Analista",       v: reporte.nombreUsuario },
                        { l: "Nivel",          v: `Nivel ${reporte.nivel} — Ej. ${reporte.ejercicio}` },
                        { l: "Tiempo total",   v: `${reporte.duracionSegundos}s` },
                        { l: "Eventos",        v: reporte.totalEventos },
                        { l: "Alertas",        v: reporte.totalAlertas },
                        { l: "Ayudas",         v: reporte.ayudas, warn: reporte.ayudas > 0 },
                        { l: "Penalización",   v: reporte.ayudas > 0 ? `-${Math.min(reporte.ayudas * 5, 30)}%` : "Sin penalización", warn: reporte.ayudas > 0 },
                        { l: "Modo",           v: "🛡 Defensa" },
                        { l: "Estado",         v: "✅ Mitigado" },
                      ].map(({ l, v, warn }) => (
                        <div key={l} style={{
                          background: warn ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${warn ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.08)"}`,
                          borderRadius: 10, padding: "10px 12px"
                        }}>
                          <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--texto-apagado)", marginBottom: 4 }}>{l}</div>
                          <div style={{ fontSize: 15, fontWeight: 900, color: warn ? "#fbbf24" : "#fff" }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: "rgba(0,218,243,0.05)", border: "1px solid rgba(0,218,243,0.14)", borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--terciario-dim)", marginBottom: 8, fontFamily: "var(--mono)", letterSpacing: "0.06em" }}>LOGROS DEFENSIVOS</div>
                      {["Incidente detectado y analizado", "Amenaza mitigada correctamente", "Análisis forense completado", "Reporte de incidente generado"].map((l, i) => (
                        <div key={i} style={{ fontSize: 13, color: "var(--texto-secundario)", marginBottom: 4 }}>✓ {l}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </TransicionPagina>
    </GuardSesion>
  )
}