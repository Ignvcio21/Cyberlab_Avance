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
  eventos:           { cmd: "eventos",               desc: "Consultar eventos del sistema" },
  eventosRecientes:  { cmd: "eventos recientes",     desc: "Revisar eventos recientes" },
  eventosFB:         { cmd: "eventos fuerza-bruta",  desc: "Filtrar eventos de fuerza bruta" },
  eventosEscaneo:    { cmd: "eventos escaneo",       desc: "Filtrar eventos de escaneo" },
  eventosRed:        { cmd: "eventos red",           desc: "Revisar eventos de red" },
  // Alertas
  alertas:           { cmd: "alertas",               desc: "Consultar alertas activas" },
  alertasCriticas:   { cmd: "alertas criticas",      desc: "Revisar alertas críticas" },
  alertasActivas:    { cmd: "alertas activas",       desc: "Listar alertas en curso" },
  // Análisis de IPs
  analizarIp:        { cmd: "analizar-ip <IP>",      desc: "Analizar IP sospechosa" },
  historialIp:       { cmd: "historial-ip <IP>",     desc: "Revisar historial de IP" },
  traficoIp:         { cmd: "trafico-ip <IP>",       desc: "Analizar tráfico de IP" },
  // Bloqueo
  bloquearIp:        { cmd: "bloquear-ip <IP>",      desc: "Bloquear IP atacante" },
  desbloquearIp:     { cmd: "desbloquear-ip <IP>",   desc: "Desbloquear IP" },
  ipsBloqueadas:     { cmd: "ips-bloqueadas",        desc: "Verificar IPs bloqueadas" },
  // Logs
  logs:              { cmd: "logs",                  desc: "Consultar logs del sistema" },
  logsAuth:          { cmd: "logs auth",             desc: "Revisar logs de autenticación" },
  logsFirewall:      { cmd: "logs firewall",         desc: "Revisar logs del firewall" },
  logsSsh:           { cmd: "logs ssh",              desc: "Revisar logs SSH" },
  logsWeb:           { cmd: "logs web",              desc: "Revisar logs del servidor web" },
  // Estado
  estadoSistema:     { cmd: "estado-sistema",        desc: "Verificar estado del sistema" },
  estadoFirewall:    { cmd: "estado-firewall",       desc: "Verificar estado del firewall" },
  estadoServidor:    { cmd: "estado-servidor",       desc: "Verificar estado del servidor" },
  // Reporte
  generarReporte:    { cmd: "generar-reporte",       desc: "Generar reporte de incidente" },
  // Extras
  whoami:            { cmd: "whoami",                desc: "Identificar usuario activo" },
  estadoRed:         { cmd: "estado-red",            desc: "Verificar estado de la red" },
  correlacionar:     { cmd: "correlacionar",         desc: "Correlacionar eventos y alertas" },
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
  "eventos":              "eventos",
  "eventos recientes":    "eventosRecientes",
  "eventos fuerza-bruta": "eventosFB",
  "eventos escaneo":      "eventosEscaneo",
  "eventos red":          "eventosRed",
  "alertas":              "alertas",
  "alertas criticas":     "alertasCriticas",
  "alertas activas":      "alertasActivas",
  "ips-bloqueadas":       "ipsBloqueadas",
  "logs":                 "logs",
  "logs auth":            "logsAuth",
  "logs firewall":        "logsFirewall",
  "logs ssh":             "logsSsh",
  "logs web":             "logsWeb",
  "estado-sistema":       "estadoSistema",
  "estado-firewall":      "estadoFirewall",
  "estado-servidor":      "estadoServidor",
  "generar-reporte":      "generarReporte",
  "whoami":               "whoami",
  "estado-red":           "estadoRed",
  "correlacionar":        "correlacionar",
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

  const claveLS = useMemo(() =>
    nombreUsuario ? `cyberlab_defensa_${nombreUsuario}` : null,
  [nombreUsuario])

  // Derivados
  const ejActual   = ejercicios[nivelActivo]?.actual || 1
  const defActual  = NIVELES_DEFENSA[nivelActivo]?.ejercicios?.[ejActual]
  const pct        = calcularPct(checklist)
  const cTimer     = tiempoRest <= 60 ? "#ef4444" : tiempoRest <= 120 ? "#f59e0b" : "#00daf3"

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

    // Comandos con IP — caso especial
    if (cmdN.startsWith("bloquear-ip ") && def.checklist.includes("bloquearIp")) {
      if (sal.includes("bloqueada") || sal.includes("blocked") || sal.includes("aplicada")) clave = "bloquearIp"
    } else if (cmdN.startsWith("analizar-ip ") && def.checklist.includes("analizarIp")) {
      clave = "analizarIp"
    } else if (cmdN.startsWith("historial-ip ") && def.checklist.includes("historialIp")) {
      clave = "historialIp"
    } else if (cmdN.startsWith("trafico-ip ") && def.checklist.includes("traficoIp")) {
      clave = "traficoIp"
    } else if (cmdN.startsWith("desbloquear-ip ") && def.checklist.includes("desbloquearIp")) {
      clave = "desbloquearIp"
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
    const iv = setInterval(cargarStats, 5000)
    return () => clearInterval(iv)
  }, [nombreUsuario])

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

            {/* ── Header ── */}
            <header className="hero-panel">
              <div className="hero-left">
                <div className="hero-badge" style={{ background: "rgba(0,218,243,0.10)", borderColor: "rgba(0,218,243,0.25)", color: "var(--terciario-dim)" }}>
                  🛡 MODO DEFENSA — CYBERLAB SOC
                </div>
                <h1 style={{ margin: "8px 0 4px", fontSize: 22, color: "#fff", fontFamily: "var(--sans)", fontWeight: 700 }}>
                  Centro de Operaciones Defensivas
                </h1>
                <p className="hero-subtitle">
                  Analista activo: <strong style={{ color: "var(--terciario-dim)" }}>{nombreUsuario}</strong>
                </p>
                <div className="hero-meta">
                  <span className="meta-chip">⏱ Sesión: {tiempoSes}s</span>
                  <span className="meta-chip" style={{ background: "rgba(0,218,243,0.10)", borderColor: "rgba(0,218,243,0.25)", color: "var(--terciario-dim)" }}>
                    🛡 Nivel {nivelActivo}: {NIVELES_DEFENSA[nivelActivo]?.nombre} — Ej. {ejActual}/5
                  </span>
                  {ayudas > 0 && (
                    <span className="meta-chip meta-chip-warn">⚠ Ayudas: {ayudas} (-{Math.min(ayudas * 5, 30)}%)</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => router.push("/dashboard")} className="boton-secundario" style={{ fontSize: 13 }}>
                  ⚔ Modo Ataque
                </button>
                <button onClick={() => {
                  localStorage.removeItem("nombre_usuario")
                  if (claveLS) localStorage.removeItem(claveLS)
                  router.push("/")
                }} className="logout-button">Cerrar sesión</button>
              </div>
            </header>

            {/* ── Progreso por nivel ── */}
            <section className="ejercicios-panel">
              <div className="ejercicios-titulo">🛡 Progreso defensivo por nivel</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8 }}>
                {[1,2,3,4,5,6,7].map(n => {
                  const ej    = ejercicios[n] || { actual: 1, completados: 0 }
                  const desl  = !nivelDesbloqueado(n)
                  const activo = nivelActivo === n
                  return (
                    <button
                      key={n}
                      onClick={() => !desl && setNivelActivo(n)}
                      disabled={desl}
                      style={{
                        padding: "10px 6px", borderRadius: 10,
                        border: activo ? "1.5px solid var(--terciario)" : "1px solid rgba(255,255,255,0.08)",
                        background: activo ? "rgba(0,218,243,0.10)" : desl ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
                        color: desl ? "var(--texto-apagado)" : activo ? "var(--terciario-dim)" : "var(--texto-secundario)",
                        cursor: desl ? "not-allowed" : "pointer",
                        textAlign: "center", fontSize: 11, fontWeight: 700,
                        opacity: desl ? 0.4 : 1, transition: "all .18s",
                      }}
                    >
                      <div style={{ fontSize: 16, marginBottom: 4 }}>
                        {desl ? "🔒" : ej.completados >= 5 ? "✅" : `D${n}`}
                      </div>
                      <div style={{ fontSize: 10, marginBottom: 4, fontFamily: "var(--mono)", lineHeight: 1.3 }}>
                        {NIVELES_DEFENSA[n]?.nombre}
                      </div>
                      <div style={{ fontSize: 10, color: ej.completados >= 5 ? "var(--terciario-dim)" : "var(--texto-apagado)", fontFamily: "var(--mono)" }}>
                        {ej.completados}/5 ej.
                      </div>
                      <div style={{ marginTop: 5, height: 3, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 999,
                          background: ej.completados >= 5 ? "var(--terciario)" : "linear-gradient(90deg,#00daf3,#00a3ff)",
                          width: `${ej.completados / 5 * 100}%`, transition: "width .4s"
                        }} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* ── Objetivo del ejercicio ── */}
            <section className="learning-panel">
              <h2 style={{ margin: "0 0 14px" }}>
                🛡 Nivel {nivelActivo} — {NIVELES_DEFENSA[nivelActivo]?.nombre}
              </h2>
              <p style={{ color: "var(--texto-secundario)", margin: "0 0 14px", fontSize: 13 }}>
                {NIVELES_DEFENSA[nivelActivo]?.descripcion}
              </p>
              <div className="learning-grid">
                <div className="learning-box">
                  <strong style={{ color: "#fff", display: "block", marginBottom: 8 }}>
                    {defActual?.titulo || "Inicia una simulación defensiva"}
                  </strong>
                  <p style={{ marginTop: 0, marginBottom: 10, fontSize: 13, color: "var(--texto-secundario)" }}>
                    {defActual?.contexto?.slice(0, 180)}{"..."}
                  </p>
                  {defActual && (
                    <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                      {defActual.checklist.map((p, i) => (
                        <li key={p} style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--texto-secundario)" }}>
                          {i + 1}. {DESC_PASO(p)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="learning-box">
                  <strong style={{ color: "#fff", display: "block", marginBottom: 8 }}>Comandos defensivos disponibles</strong>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                    {[
                      "eventos", "eventos recientes", "alertas", "alertas criticas",
                      "logs auth", "logs firewall", "logs ssh",
                      "analizar-ip <IP>", "historial-ip <IP>", "trafico-ip <IP>",
                      "bloquear-ip <IP>", "ips-bloqueadas",
                      "estado-sistema", "estado-firewall", "estado-servidor",
                    ].map(c => (
                      <code key={c} style={{
                        background: "rgba(0,218,243,0.08)", color: "var(--terciario-dim)",
                        padding: "2px 6px", borderRadius: 5, fontSize: 11, fontFamily: "var(--mono)"
                      }}>{c}</code>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ── Botón de inicio ── */}
            <section className="action-panel">
              <h2 style={{ margin: "0 0 4px" }}>Simulación Defensiva — Nivel {nivelActivo}</h2>
              <p style={{ color: "var(--texto-secundario)", fontSize: 13 }}>
                El sistema generará un incidente real que debes detectar, analizar y mitigar paso a paso.
              </p>
              <div className="status-box">
                <span className="status-label">Estado</span>
                <span className="status-value">{mensaje || "Esperando acción del analista..."}</span>
              </div>
              <div className="attack-buttons">
                <button
                  className="attack-button"
                  style={{ background: "linear-gradient(135deg,#00daf3,#00a3ff)" }}
                  onClick={() => {
                    if (!nivelDesbloqueado(nivelActivo)) {
                      setMensaje(`Completa el Nivel ${nivelActivo - 1} de defensa primero.`); return
                    }
                    simular()
                  }}
                >
                  🛡 Iniciar Ejercicio Defensivo {ejActual}/5 — {NIVELES_DEFENSA[nivelActivo]?.nombre}
                </button>
                <button className="report-button" onClick={generarReporte}>
                  Generar reporte
                </button>
              </div>
            </section>

            {/* ── Escenario activo ── */}
            <section className="mission-panel">
              <div className="panel-header">
                <h2 style={{ margin: 0 }}>🛡 Escenario defensivo activo</h2>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="tag" style={{
                    background: estadoEsc === "resuelto" ? "rgba(0,218,243,0.10)" : "rgba(0,163,255,0.10)",
                    color: estadoEsc === "resuelto" ? "var(--terciario-dim)" : "var(--primario-dim)",
                    border: `1px solid ${estadoEsc === "resuelto" ? "rgba(0,218,243,0.25)" : "rgba(0,163,255,0.25)"}`,
                    padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: "var(--mono)"
                  }}>
                    {estadoEsc === "resuelto" ? "✅ MITIGADO" : "🔴 INCIDENTE ACTIVO"}
                  </span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 18, fontWeight: 700, color: cTimer }}>
                    {fmt(tiempoRest)}
                  </span>
                  {escenario && estadoEsc !== "resuelto" && (
                    <button className="boton-ayuda" onClick={pedirAyuda} disabled={cargandoAyuda}>
                      {cargandoAyuda ? "..." : ayudas > 0 ? `💡 Ayuda (${ayudas}x)` : "💡 Pedir ayuda"}
                    </button>
                  )}
                </div>
              </div>

              {mostrarHint && hint && (
                <div className="hint-box">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <strong style={{ color: "#fbbf24", fontSize: 12 }}>
                      💡 Pista #{ayudas} — -{Math.min(ayudas * 5, 30)}% penalización
                    </strong>
                    <button onClick={() => setMostrarHint(false)} style={{ background: "none", border: "none", color: "var(--texto-apagado)", cursor: "pointer", fontSize: 16 }}>✕</button>
                  </div>
                  <p>{hint}</p>
                </div>
              )}

              <pre className="mission-text">{textoEsc}</pre>

              <div className="progress-wrapper">
                <div className="progress-top">
                  <span style={{ color: "var(--texto-secundario)" }}>Progreso del ejercicio defensivo</span>
                  <strong style={{ color: pct === 100 ? "var(--terciario-dim)" : "var(--primario-dim)" }}>{pct}%</strong>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${pct}%`,
                    background: pct === 100 ? "var(--terciario)" : "linear-gradient(90deg,#00daf3,#00a3ff)"
                  }} />
                </div>
              </div>

              <div className="mission-progress" style={{
                gridTemplateColumns: `repeat(${Math.min(Object.keys(checklist).length, 4)}, 1fr)`
              }}>
                {Object.entries(checklist).map(([k, v]) => (
                  <div key={k} className={`mission-step ${v ? "done" : ""}`}>
                    {v ? "✓" : "○"} {DESC_PASO(k)}
                  </div>
                ))}
              </div>
            </section>

            {/* ── Terminal SOC ── */}
            <section className="terminal-panel">
              <div className="panel-header">
                <h2 style={{ margin: 0 }}>Terminal SOC — Defensa</h2>
                <span className="tag cyan-tag">SOC MODE</span>
              </div>
              <div className="terminal-window" ref={termRef}>
                {historial.map((l, i) => (
                  <div key={i} className={`terminal-line ${l.startsWith("soc@cyberlab") ? "terminal-cmd" : ""}`}>
                    {l}
                  </div>
                ))}
              </div>
              <form onSubmit={ejecutarComando} className="terminal-form">
                <span className="terminal-prefix" style={{ color: "var(--terciario)" }}>soc@cyberlab:~$</span>
                <input
                  className="terminal-input"
                  value={comando}
                  onChange={e => setComando(e.target.value)}
                  placeholder="Escribe un comando defensivo..."
                  autoComplete="off"
                  spellCheck={false}
                />
              </form>
            </section>

            {/* ── Stats ── */}
            <section className="panel">
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 14 }}>
                  {[
                    { label: "EVENTOS", valor: stats.total_eventos, color: "var(--primario-dim)" },
                    { label: "ALERTAS", valor: stats.total_alertas, color: "#ffb4ab" },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: "center", padding: "10px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.valor}</div>
                      <div style={{ fontSize: 11, color: "var(--texto-apagado)", fontFamily: "var(--mono)" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "var(--texto-apagado)" }}>
                  Usa <code style={{ background: "rgba(0,218,243,0.10)", color: "var(--terciario-dim)", padding: "2px 6px", borderRadius: 4, fontFamily: "var(--mono)" }}>eventos</code> y{" "}
                  <code style={{ background: "rgba(0,218,243,0.10)", color: "var(--terciario-dim)", padding: "2px 6px", borderRadius: 4, fontFamily: "var(--mono)" }}>alertas</code> para iniciar el análisis.
                </div>
              </div>
            </section>

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