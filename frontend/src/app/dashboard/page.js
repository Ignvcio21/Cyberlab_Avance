"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import BarraSuperior from "../componentes/BarraSuperior"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"

const getAuthHeaders = () => ({
  "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
  "Content-Type": "application/json"
})

const LIMITE_SEG = 300
const TOTAL_EJ   = 5

const SECCIONES_INFO = [
  "introduccion","objetivos","fundamentos","metodologia","comandos",
  "evidencia","procedimiento","errores","buenas_practicas","criterio"
]

// ================================================================
// POOL GLOBAL DE COMANDOS
// desc = lo que ve el estudiante en el checklist (sin revelar el comando)
// cmd  = el comando real que debe escribir
// ================================================================
const POOL = {
  showAlerts:        { cmd: "show alerts",          desc: "Revisar alertas del IDS" },
  showEvents:        { cmd: "show events",          desc: "Revisar log de eventos" },
  blockIp:           { cmd: "block ip <IP>",        desc: "Bloquear IP atacante" },
  showBlocked:       { cmd: "show blocked",         desc: "Verificar bloqueos activos" },
  status:            { cmd: "status",               desc: "Verificar estado del sistema" },
  ipA:               { cmd: "ip a",                 desc: "Identificar interfaces de red" },
  ls:                { cmd: "ls",                   desc: "Listar directorio de evidencia" },
  whoami:            { cmd: "whoami",               desc: "Identificar usuario activo" },
  showServices:      { cmd: "show services",        desc: "Listar servicios detectados" },
  scanPorts:         { cmd: "scan ports",           desc: "Ejecutar escaneo de puertos" },
  showTraffic:       { cmd: "show traffic",         desc: "Analizar tráfico de red" },
  showBanners:       { cmd: "show banners",         desc: "Leer banners de servicios" },
  resolveHost:       { cmd: "resolve host",         desc: "Resolver nombre de host sospechoso" },
  showVulnerabilities:{ cmd: "show vulnerabilities",desc: "Listar vulnerabilidades detectadas" },
  traceIp:           { cmd: "trace ip",             desc: "Trazar ruta hacia IP sospechosa" },
  showUsers:         { cmd: "show users",           desc: "Listar usuarios del sistema" },
  showSessions:      { cmd: "show sessions",        desc: "Revisar sesiones activas" },
  showFailedLogins:  { cmd: "show failed logins",   desc: "Ver intentos de login fallidos" },
  showProcesses:     { cmd: "show processes",       desc: "Ver procesos activos" },
  enumerateUsers:    { cmd: "enumerate users",      desc: "Enumerar usuarios del objetivo" },
  exportReport:      { cmd: "export report",        desc: "Exportar reporte técnico" },
  showHosts:         { cmd: "show hosts",           desc: "Listar hosts activos en la red" },
  enumerateServices: { cmd: "enumerate services",   desc: "Enumerar servicios del objetivo" },
  history:           { cmd: "history",              desc: "Revisar historial de comandos" },
}

// ================================================================
// 7 NIVELES × 5 EJERCICIOS
// Cada ejercicio:
//   titulo    — nombre del ejercicio
//   contexto  — situación que se le presenta al operador (sin revelar comandos)
//   checklist — pasos en orden que debe ejecutar
//   guiado    — solo el primer ejercicio de cada nivel
//   tipo      — qué tipo de simulación lanza (para el backend)
// ================================================================
const NIVELES_EJERCICIOS = {

  // ──────────────────────────────────────────────────────────────
  // NIVEL 1 — INTRODUCCIÓN Y FUNDAMENTOS
  // Foco: alertas, eventos, bloqueo básico
  // ──────────────────────────────────────────────────────────────
  1: {
    nombre: "Fuerza Bruta — Fundamentos",
    tipo_simulacion: "fuerza_bruta",
    ejercicios: {
      1: {
        titulo: "Ejercicio 1 — Respuesta guiada a alerta básica",
        contexto: "El IDS de la organización ha generado una alerta de alta severidad. Como operador de turno, tu primera acción debe ser revisar las alertas activas del sistema para entender qué ocurrió, luego examinar el log de eventos para identificar el origen, y finalmente aplicar una medida de contención.",
        checklist: ["showAlerts", "showEvents", "blockIp"],
        guiado: true,
      },
      2: {
        titulo: "Ejercicio 2 — Diagnóstico antes de actuar",
        contexto: "Recibes un aviso de actividad inusual pero no sabes si el sistema está operativo. Antes de analizar amenazas, un buen operador siempre confirma el estado del laboratorio. Luego revisa los eventos del sistema para identificar el origen del incidente y aplica el bloqueo correspondiente.",
        checklist: ["status", "showEvents", "blockIp"],
        guiado: false,
      },
      3: {
        titulo: "Ejercicio 3 — Alertas primero, luego contención con verificación",
        contexto: "Se reporta actividad sospechosa en las últimas horas. El procedimiento estándar en este turno requiere revisar primero las alertas generadas, luego los eventos para correlacionar, bloquear la fuente identificada y confirmar que el bloqueo quedó registrado correctamente.",
        checklist: ["showAlerts", "showEvents", "blockIp", "showBlocked"],
        guiado: false,
      },
      4: {
        titulo: "Ejercicio 4 — Reconocimiento del entorno propio",
        contexto: "Antes de responder a cualquier incidente, un analista debe conocer el entorno en el que trabaja. Identifica quién eres en el sistema, qué interfaces de red están activas, revisa las alertas actuales del IDS y aplica la medida de contención necesaria.",
        checklist: ["whoami", "ipA", "showAlerts", "blockIp"],
        guiado: false,
      },
      5: {
        titulo: "Ejercicio 5 — Respuesta autónoma completa",
        contexto: "Evaluación final del nivel. Sin asistencia. Recibes una notificación de actividad maliciosa: múltiples intentos de autenticación fallidos desde una IP externa. Debes ejecutar un análisis completo del incidente, identificar el origen, aplicar la contención y verificar que fue efectiva. El procedimiento y los comandos son decisión tuya.",
        checklist: ["showAlerts", "showEvents", "blockIp", "showBlocked"],
        guiado: false,
      },
    },
  },

  // ──────────────────────────────────────────────────────────────
  // NIVEL 2 — RECONOCIMIENTO Y ESCANEO DE PUERTOS
  // Foco: interpretar escaneos, patrones repetitivos, correlación alertas/eventos
  // ──────────────────────────────────────────────────────────────
  2: {
    nombre: "Escaneo de Puertos",
    tipo_simulacion: "escaneo_puertos",
    ejercicios: {
      1: {
        titulo: "Ejercicio 1 — Primera detección de reconocimiento guiada",
        contexto: "El IDS detectó múltiples conexiones hacia distintos puertos en pocos segundos, patrón típico de reconocimiento activo. Como primer ejercicio del nivel, revisa las alertas generadas por el IDS, luego examina los eventos de red para confirmar el patrón de escaneo e identifica la IP origen para bloquearla.",
        checklist: ["showAlerts", "showEvents", "blockIp"],
        guiado: true,
      },
      2: {
        titulo: "Ejercicio 2 — Identificar servicios expuestos durante el escaneo",
        contexto: "Se detectó actividad de reconocimiento activo. El atacante parece estar buscando servicios abiertos en tu infraestructura. Antes de bloquearlo necesitas entender qué servicios están siendo sondeados: revisa los servicios detectados por el sistema, luego confirma el patrón en los eventos y procede al bloqueo.",
        checklist: ["showServices", "showEvents", "blockIp"],
        guiado: false,
      },
      3: {
        titulo: "Ejercicio 3 — Correlación alerta, tráfico y contención",
        contexto: "El sistema reporta múltiples alertas de escaneo TCP. Para este incidente el procedimiento correcto es: revisar las alertas del IDS, analizar el tráfico de red para entender el volumen y patrón del ataque, luego bloquear el origen y verificar que el bloqueo está activo.",
        checklist: ["showAlerts", "showTraffic", "blockIp", "showBlocked"],
        guiado: false,
      },
      4: {
        titulo: "Ejercicio 4 — Diagnóstico completo de reconocimiento",
        contexto: "Actividad de reconocimiento prolongada detectada. El análisis completo de este tipo de incidente requiere verificar el estado del sistema, revisar qué servicios están expuestos, analizar las alertas generadas, y finalmente ejecutar el escaneo de puertos propio para entender qué ve el atacante antes de bloquearlo.",
        checklist: ["status", "showServices", "showAlerts", "scanPorts", "blockIp"],
        guiado: false,
      },
      5: {
        titulo: "Ejercicio 5 — Respuesta autónoma a reconocimiento avanzado",
        contexto: "Evaluación final. Se detectaron sondas de red sobre puertos 22, 80, 443 y 8080. El atacante realizó reconocimiento activo sobre múltiples segmentos. Sin guía: determina el estado de tus servicios expuestos, analiza el tráfico y los eventos, identifica todos los orígenes involucrados, aplica contención y verifica el resultado.",
        checklist: ["showServices", "showTraffic", "showEvents", "blockIp", "showBlocked"],
        guiado: false,
      },
    },
  },

  // ──────────────────────────────────────────────────────────────
  // NIVEL 3 — ENUMERACIÓN DE SERVICIOS
  // Foco: banners, versiones, servicios vulnerables, correlación
  // ──────────────────────────────────────────────────────────────
  3: {
    nombre: "Enumeración de Servicios",
    tipo_simulacion: "escaneo_puertos",
    ejercicios: {
      1: {
        titulo: "Ejercicio 1 — Detección de servicio con banner sospechoso",
        contexto: "El IDS reportó actividad sobre puertos de servicios conocidos. Un atacante que enumera servicios busca identificar versiones de software para explotar vulnerabilidades conocidas. Revisa las alertas del sistema, luego lee los banners de los servicios detectados para entender qué información está siendo expuesta, e identifica la IP para bloquearla.",
        checklist: ["showAlerts", "showBanners", "blockIp"],
        guiado: true,
      },
      2: {
        titulo: "Ejercicio 2 — Resolución de host sospechoso",
        contexto: "Se detectaron conexiones provenientes de un host con nombre sospechoso en los registros. Antes de bloquear, es importante resolver el nombre del host atacante para entender si pertenece a un rango conocido de infraestructura maliciosa. Luego revisa los eventos para confirmar el comportamiento y aplica el bloqueo.",
        checklist: ["resolveHost", "showEvents", "blockIp"],
        guiado: false,
      },
      3: {
        titulo: "Ejercicio 3 — Análisis de servicios expuestos y banners",
        contexto: "Se sospecha que un agente externo está leyendo información de versión de tus servicios. Un servicio con versión desactualizada en su banner es una vulnerabilidad directa. Revisa los servicios activos, luego lee sus banners, correlaciona con los eventos del sistema y bloquea al responsable.",
        checklist: ["showServices", "showBanners", "showEvents", "blockIp"],
        guiado: false,
      },
      4: {
        titulo: "Ejercicio 4 — Identificación completa antes de contención",
        contexto: "Incidente de enumeración activa. El atacante está mapeando tu infraestructura. El procedimiento correcto para este tipo de incidente es: verificar estado del sistema, resolver el host atacante, revisar banners expuestos, examinar alertas del IDS, y finalmente bloquear y verificar la contención.",
        checklist: ["status", "resolveHost", "showBanners", "showAlerts", "blockIp", "showBlocked"],
        guiado: false,
      },
      5: {
        titulo: "Ejercicio 5 — Respuesta autónoma a enumeración completa",
        contexto: "Evaluación de nivel. El sistema detectó enumeración activa de servicios SSH, HTTP y FTP desde una IP externa. El atacante obtuvo versiones de software expuestas en los banners. Sin asistencia: analiza la situación completa, determina qué información fue expuesta, identifica el origen y aplica contención verificada.",
        checklist: ["showServices", "showBanners", "resolveHost", "showAlerts", "blockIp", "showBlocked"],
        guiado: false,
      },
    },
  },

  // ──────────────────────────────────────────────────────────────
  // NIVEL 4 — ANÁLISIS DE SUPERFICIE EXPUESTA
  // Foco: correlación múltiple, vulnerabilidades, tráfico, priorización
  // ──────────────────────────────────────────────────────────────
  4: {
    nombre: "Superficie de Ataque",
    tipo_simulacion: "escaneo_puertos",
    ejercicios: {
      1: {
        titulo: "Ejercicio 1 — Primera detección de vulnerabilidades guiada",
        contexto: "El sistema detectó actividad ofensiva sobre servicios que podrían tener vulnerabilidades conocidas. Tu objetivo es entender qué tan expuesta está tu infraestructura: revisa las alertas del IDS para conocer el tipo de actividad, luego consulta las vulnerabilidades detectadas en los servicios activos, e identifica el origen para bloquearlo.",
        checklist: ["showAlerts", "showVulnerabilities", "blockIp"],
        guiado: true,
      },
      2: {
        titulo: "Ejercicio 2 — Trazado de ruta del atacante",
        contexto: "Se detectó tráfico ofensivo desde una IP desconocida. Para entender la procedencia real del ataque y si existen intermediarios, debes trazar la ruta hacia esa IP antes de bloquearla. Luego revisa los eventos para confirmar el comportamiento malicioso y aplica la contención.",
        checklist: ["traceIp", "showEvents", "blockIp"],
        guiado: false,
      },
      3: {
        titulo: "Ejercicio 3 — Correlación de tráfico y vulnerabilidades",
        contexto: "Actividad ofensiva correlacionada detectada: tráfico anómalo dirigido hacia servicios con vulnerabilidades conocidas. Para responder correctamente debes analizar el tráfico de red para entender el volumen y destinos, consultar qué vulnerabilidades están siendo apuntadas, revisar los eventos y ejecutar el bloqueo.",
        checklist: ["showTraffic", "showVulnerabilities", "showEvents", "blockIp"],
        guiado: false,
      },
      4: {
        titulo: "Ejercicio 4 — Análisis completo de superficie",
        contexto: "Se reportan múltiples servicios bajo ataque simultáneo. El análisis de superficie expuesta requiere entender todos los vectores activos: verifica el estado del sistema, analiza el tráfico activo, revisa vulnerabilidades detectadas, luego examina los servicios expuestos, bloquea el origen y traza su ruta para documentar.",
        checklist: ["status", "showTraffic", "showVulnerabilities", "showServices", "blockIp", "traceIp"],
        guiado: false,
      },
      5: {
        titulo: "Ejercicio 5 — Respuesta autónoma a superficie crítica",
        contexto: "Evaluación de nivel. Se detectaron múltiples vectores de ataque activos: un agente externo está sondeando servicios con vulnerabilidades conocidas y generando tráfico ofensivo en varios segmentos. Sin asistencia: evalúa la superficie expuesta, prioriza la amenaza más crítica, aplica contención y verifica el resultado completo.",
        checklist: ["showVulnerabilities", "showTraffic", "showAlerts", "traceIp", "blockIp", "showBlocked"],
        guiado: false,
      },
    },
  },

  // ──────────────────────────────────────────────────────────────
  // NIVEL 5 — FUERZA BRUTA AVANZADA Y CORRELACIÓN
  // Foco: sesiones, usuarios, login fallidos, patrones distribuidos
  // ──────────────────────────────────────────────────────────────
  5: {
    nombre: "Fuerza Bruta Avanzada",
    tipo_simulacion: "fuerza_bruta",
    ejercicios: {
      1: {
        titulo: "Ejercicio 1 — Detección de patrón de fuerza bruta guiada",
        contexto: "El sistema reporta múltiples intentos fallidos de autenticación. Este patrón es característico de un ataque de fuerza bruta. Para analizarlo correctamente: revisa los intentos de login fallidos registrados, examina las sesiones activas para detectar anomalías, y bloquea la IP que está generando la actividad.",
        checklist: ["showFailedLogins", "showSessions", "blockIp"],
        guiado: true,
      },
      2: {
        titulo: "Ejercicio 2 — Identificar cuenta objetivo",
        contexto: "Se detectaron intentos repetidos de autenticación. El atacante parece estar apuntando a una cuenta específica del sistema. Revisa los usuarios del sistema para entender qué cuentas existen, luego examina los intentos fallidos para identificar la cuenta objetivo, y aplica el bloqueo al origen.",
        checklist: ["showUsers", "showFailedLogins", "blockIp"],
        guiado: false,
      },
      3: {
        titulo: "Ejercicio 3 — Correlación sesiones y tráfico",
        contexto: "Actividad de autenticación anómala detectada en horario fuera de turno. Para este incidente necesitas correlacionar múltiples fuentes: revisa las sesiones activas en el sistema, analiza el tráfico generado por las autenticaciones fallidas, examina los eventos del sistema y aplica contención.",
        checklist: ["showSessions", "showTraffic", "showEvents", "blockIp"],
        guiado: false,
      },
      4: {
        titulo: "Ejercicio 4 — Fuerza bruta distribuida",
        contexto: "El análisis de correlación indica que los intentos de autenticación provienen de múltiples orígenes coordinados, un patrón de fuerza bruta distribuida. Para responder debes: verificar el estado del sistema, revisar los usuarios bajo ataque, examinar los intentos fallidos, analizar sesiones activas, y bloquear el origen principal verificando la contención.",
        checklist: ["status", "showUsers", "showFailedLogins", "showSessions", "blockIp", "showBlocked"],
        guiado: false,
      },
      5: {
        titulo: "Ejercicio 5 — Respuesta autónoma a fuerza bruta avanzada",
        contexto: "Evaluación de nivel. Ataque de fuerza bruta avanzado en curso: múltiples intentos sobre SSH y panel web, dirigidos a cuentas privilegiadas desde distintas fuentes. Sin asistencia: identifica las cuentas bajo ataque, correlaciona sesiones y tráfico, determina los orígenes, aplica contención y documenta con verificación.",
        checklist: ["showUsers", "showFailedLogins", "showSessions", "showTraffic", "blockIp", "showBlocked"],
        guiado: false,
      },
    },
  },

  // ──────────────────────────────────────────────────────────────
  // NIVEL 6 — SIMULACIÓN OFENSIVA MULTI-ETAPA
  // Foco: procesos, enumeración, multi-vectores, export report
  // ──────────────────────────────────────────────────────────────
  6: {
    nombre: "Ataque Multi-Etapa",
    tipo_simulacion: "escaneo_puertos",
    ejercicios: {
      1: {
        titulo: "Ejercicio 1 — Detección de ataque multi-fase guiado",
        contexto: "El IDS reportó actividad que combina reconocimiento y autenticación fallida: un atacante que primero escanea y luego intenta acceso. Este patrón multi-etapa es más sofisticado. Revisa las alertas para entender ambas fases, examina los eventos para confirmar la secuencia, e identifica y bloquea el origen.",
        checklist: ["showAlerts", "showEvents", "blockIp"],
        guiado: true,
      },
      2: {
        titulo: "Ejercicio 2 — Enumeración de usuarios del objetivo",
        contexto: "Se detectó que el atacante está activamente enumerando usuarios en tu sistema antes de lanzar un ataque dirigido. Esta fase de reconocimiento de cuentas es crítica. Enumera los usuarios del objetivo para entender qué información fue expuesta, luego revisa los eventos para ver qué acciones tomó el atacante, y bloquea.",
        checklist: ["enumerateUsers", "showEvents", "blockIp"],
        guiado: false,
      },
      3: {
        titulo: "Ejercicio 3 — Procesos sospechosos y correlación",
        contexto: "El equipo de SOC reportó que además de actividad de red, se detectaron procesos inusuales en el sistema durante el incidente. Revisa los procesos activos para identificar anomalías, luego examina las sesiones abiertas, analiza las alertas generadas y aplica la contención correspondiente.",
        checklist: ["showProcesses", "showSessions", "showAlerts", "blockIp"],
        guiado: false,
      },
      4: {
        titulo: "Ejercicio 4 — Análisis completo multi-etapa",
        contexto: "Incidente complejo: se detectaron tres fases ofensivas simultáneas: reconocimiento, enumeración de usuarios y fuerza bruta. El análisis requiere: verificar el estado del sistema, revisar procesos activos, enumerar usuarios comprometidos, examinar intentos fallidos de login, analizar alertas y bloquear el origen principal.",
        checklist: ["status", "showProcesses", "enumerateUsers", "showFailedLogins", "showAlerts", "blockIp"],
        guiado: false,
      },
      5: {
        titulo: "Ejercicio 5 — Respuesta completa con reporte",
        contexto: "Evaluación de nivel. Ataque multi-etapa completo detectado: el agente realizó reconocimiento, enumeró usuarios, intentó acceso por fuerza bruta y ejecutó procesos no autorizados. Sin asistencia: analiza todas las fases, correlaciona evidencia, aplica contención, verifica el bloqueo y exporta el reporte técnico de la sesión.",
        checklist: ["showAlerts", "showProcesses", "enumerateUsers", "showFailedLogins", "blockIp", "showBlocked", "exportReport"],
        guiado: false,
      },
    },
  },

  // ──────────────────────────────────────────────────────────────
  // NIVEL 7 — OPERACIÓN COMPLETA DE PENTESTING
  // Foco: análisis integral, múltiples IPs, history, reporte final
  // ──────────────────────────────────────────────────────────────
  7: {
    nombre: "Operación Completa",
    tipo_simulacion: "fuerza_bruta",
    ejercicios: {
      1: {
        titulo: "Ejercicio 1 — Visión integral del entorno guiada",
        contexto: "Inicio de una operación completa de análisis ofensivo. El primer paso en toda operación profesional es obtener una visión completa del entorno: qué hosts están activos en la red, qué servicios expone tu infraestructura, y cuáles son las alertas actuales del sistema. Con ese contexto podrás identificar y bloquear la amenaza.",
        checklist: ["showHosts", "showServices", "showAlerts", "blockIp"],
        guiado: true,
      },
      2: {
        titulo: "Ejercicio 2 — Enumeración completa de servicios",
        contexto: "En una operación de pentesting profesional, la enumeración de servicios es fundamental para entender la superficie de ataque real. Enumera los servicios del objetivo para obtener un inventario completo, luego lee los banners para identificar versiones, examina las vulnerabilidades detectadas y aplica la contención necesaria.",
        checklist: ["enumerateServices", "showBanners", "showVulnerabilities", "blockIp"],
        guiado: false,
      },
      3: {
        titulo: "Ejercicio 3 — Correlación avanzada multi-vector",
        contexto: "El sistema reporta actividad ofensiva desde múltiples vectores simultáneos. Para una respuesta profesional a este nivel debes: revisar los hosts activos que están generando tráfico, analizar los procesos en ejecución para detectar anomalías, examinar el tráfico de red y los eventos correlacionados, y aplicar contención con verificación.",
        checklist: ["showHosts", "showProcesses", "showTraffic", "showEvents", "blockIp", "showBlocked"],
        guiado: false,
      },
      4: {
        titulo: "Ejercicio 4 — Operación con trazado y documentación",
        contexto: "Incidente avanzado con múltiples orígenes sospechosos. La metodología profesional requiere: verificar el estado del sistema, listar hosts activos, trazar la ruta de los atacantes para identificar su infraestructura, enumerar usuarios comprometidos, revisar sesiones abiertas, y ejecutar el bloqueo con documentación del historial de acciones.",
        checklist: ["status", "showHosts", "traceIp", "enumerateUsers", "showSessions", "blockIp", "history"],
        guiado: false,
      },
      5: {
        titulo: "Ejercicio 5 — Operación completa de pentesting defensivo",
        contexto: "Evaluación final del curso. Escenario complejo: múltiples atacantes coordinados realizaron reconocimiento, enumeración de servicios y usuarios, fuerza bruta distribuida y explotación de vulnerabilidades conocidas. Sin ninguna asistencia: ejecuta el análisis metodológico completo, correlaciona toda la evidencia disponible, aplica contención apropiada, verifica resultados y genera el reporte técnico final.",
        checklist: ["showHosts", "enumerateServices", "showVulnerabilities", "showFailedLogins", "showAlerts", "blockIp", "showBlocked", "exportReport"],
        guiado: false,
      },
    },
  },
}

// ================================================================
// HELPERS
// ================================================================
const ETIQUETA_DESC = (clave) => POOL[clave]?.desc || clave
const ETIQUETA_CMD  = (clave, ip) => {
  const p = POOL[clave]
  if (!p) return clave
  return ip ? p.cmd.replace("<IP>", ip) : p.cmd
}

const checklistVacio = (nivel, num) => {
  const def = NIVELES_EJERCICIOS[nivel]?.ejercicios?.[num]
  if (!def) return { showAlerts: false, showEvents: false, blockIp: false }
  return Object.fromEntries(def.checklist.map(k => [k, false]))
}

const checklistCompleto = cl => Object.values(cl).every(Boolean)

const calcularPct = cl => {
  const t = Object.keys(cl).length
  if (!t) return 0
  return Math.round(Object.values(cl).filter(Boolean).length / t * 100)
}

const siguientePaso = (cl, nivel, num) => {
  const def = NIVELES_EJERCICIOS[nivel]?.ejercicios?.[num]
  if (!def) return null
  return def.checklist.find(p => !cl[p]) ?? null
}

// ================================================================
// COMPONENTE PRINCIPAL
// ================================================================

// ── Componente: evaluaciones del propio estudiante ───────────────────────────
function MisEvaluaciones({ nombreUsuario }) {
  const [data, setData] = useState([])
  const [cargando, setCargando] = useState(false)
  const [orden, setOrden] = useState(true)

  useEffect(() => {
    if (!nombreUsuario) return
    setCargando(true)
    fetch(`${API_URL}/mis-evaluaciones?nombre_usuario=${encodeURIComponent(nombreUsuario)}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token") || ""}` }
    })
      .then(r => r.json())
      .then(d => setData(Array.isArray(d) ? d : (d?.intentos || [])))
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [nombreUsuario])

  const evaluados = [...data]
    .filter(it => it.evaluacion)
    .sort((a, b) => {
      const da = new Date(a.fecha_inicio || 0)
      const db = new Date(b.fecha_inicio || 0)
      return orden ? db - da : da - db
    })

  if (cargando) return null
  if (evaluados.length === 0) return null

  return (
    <section className="panel">
      <div className="panel-header">
        <h2 style={{ margin:0, fontSize:16 }}>Mis evaluaciones</h2>
        <button
          onClick={() => setOrden(v => !v)}
          style={{
            padding:"5px 10px", background:"rgba(255,255,255,0.06)",
            border:"1px solid rgba(255,255,255,0.10)", borderRadius:7,
            color:"var(--texto-apagado)", fontSize:11, fontWeight:700, cursor:"pointer"
          }}
        >
          {orden ? "↓ Más reciente" : "↑ Más antiguo"}
        </button>
      </div>
      <div style={{ display:"grid", gap:10 }}>
        {evaluados.map(it => (
          <div key={it.intento_id} style={{
            background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
            borderLeft:`3px solid ${it.evaluacion.nota >= 4 ? "var(--terciario)" : "#ef4444"}`,
            borderRadius:10, padding:"12px 16px"
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, marginBottom:8 }}>
              <div>
                <div style={{ fontSize:11, color:"var(--texto-apagado)", fontFamily:"var(--mono)" }}>
                  Ejercicio #{it.ejercicio_id}
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>
                  {it.descripcion_ejercicio || "—"}
                </div>
                <div style={{ fontSize:11, color:"var(--texto-apagado)", fontFamily:"var(--mono)", marginTop:2 }}>
                  {it.fecha_inicio ? new Date(it.fecha_inicio).toLocaleString("es-CL", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "—"}
                </div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{
                  fontSize:22, fontWeight:900,
                  color: it.evaluacion.nota >= 4 ? "var(--terciario-dim)" : "#ffb4ab",
                  fontFamily:"var(--mono)"
                }}>
                  {it.evaluacion.nota}
                </div>
                <div style={{ fontSize:10, color:"var(--texto-apagado)" }}>/ 7.0</div>
              </div>
            </div>
            {it.evaluacion.comentarios && (
              <div style={{
                background:"rgba(0,163,255,0.06)", border:"1px solid rgba(0,163,255,0.14)",
                borderRadius:8, padding:"8px 12px", fontSize:13,
                color:"var(--texto-secundario)", lineHeight:1.6
              }}>
                <span style={{ fontSize:11, fontFamily:"var(--mono)", color:"var(--primario-dim)", marginRight:6 }}>RETROALIMENTACIÓN:</span>
                {it.evaluacion.comentarios}
              </div>
            )}
            <div style={{ display:"flex", gap:12, marginTop:8, fontSize:11, color:"var(--texto-apagado)", fontFamily:"var(--mono)" }}>
              <span>⏱ {it.tiempo_seg}s</span>
              <span>📊 {it.porcentaje}%</span>
              {(it.ayudas_pedidas || 0) > 0 && <span>💡 {it.ayudas_pedidas} ayudas</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function Dashboard() {
  const router  = useRouter()
  const termRef = useRef(null)

  const [nombreUsuario, setNombreUsuario] = useState("")
  const [stats, setStats] = useState({
    total_eventos: 0, total_alertas: 0,
    eventos_recientes: [], alertas_recientes: []
  })
  const [mensaje,    setMensaje]    = useState("")
  const [comando,    setComando]    = useState("")
  const [inicioSes,  setInicioSes]  = useState(null)
  const [tiempoSes,  setTiempoSes]  = useState(0)
  const [reporte,    setReporte]    = useState(null)
  const [cmdValidos, setCmdValidos] = useState([])
  const [intentoReg, setIntentoReg] = useState(false)

  const [historial, setHistorial] = useState([
    "CyberLab Terminal — modo kali-like",
    "Escribe 'help' para ver los comandos disponibles.",
  ])

  const [escenario,  setEscenario]  = useState(null)
  const [estadoEsc,  setEstadoEsc]  = useState("inactivo")
  const [textoEsc,   setTextoEsc]   = useState("No hay un escenario activo.\nEjecuta una simulación para comenzar.")
  const [checklist,  setChecklist]  = useState({ showAlerts: false, showEvents: false, blockIp: false })
  const [inicioEsc,  setInicioEsc]  = useState(null)
  const [tiempoRest, setTiempoRest] = useState(LIMITE_SEG)

  // Nivel activo (1-7) y ejercicio actual (1-5)
  const [nivelActivo, setNivelActivo] = useState(1)
  const [ejercicios, setEjercicios]   = useState({
    1: { actual: 1, completados: 0 },
    2: { actual: 1, completados: 0 },
    3: { actual: 1, completados: 0 },
    4: { actual: 1, completados: 0 },
    5: { actual: 1, completados: 0 },
    6: { actual: 1, completados: 0 },
    7: { actual: 1, completados: 0 },
  })

  const [ayudas,        setAyudas]        = useState(0)
  const [hint,          setHint]          = useState("")
  const [mostrarHint,   setMostrarHint]   = useState(false)
  const [cargandoAyuda, setCargandoAyuda] = useState(false)
  const [modalNivel,    setModalNivel]    = useState(1)
  const [modalProg,     setModalProg]     = useState(0)
  const [modalAbierto,  setModalAbierto]  = useState(false)
  const [modalReporte,  setModalReporte]  = useState(false)
  const [bannerVisible, setBannerVisible] = useState(true)

  // ── Modo ejercicios docente ──
  const [ejerciciosDocente,   setEjerciciosDocente]   = useState([])
  const [ejDocenteActivo,     setEjDocenteActivo]     = useState(null)
  const [checklistManual,     setChecklistManual]     = useState({})
  const [timerDocente,        setTimerDocente]        = useState(0)
  const [timerDocenteActivo,  setTimerDocenteActivo]  = useState(false)
  const [ayudasDocente,       setAyudasDocente]       = useState(0)
  const [pistaDocente,        setPistaDocente]        = useState("")
  const [mostrarPista,        setMostrarPista]        = useState(false)
  const [cargandoPista,       setCargandoPista]       = useState(false)
  const [nivelDocenteAbierto, setNivelDocenteAbierto] = useState(1)
  const modoDocente = true  // siempre mostrar panel de niveles
  const [confirmEjDocente,     setConfirmEjDocente]     = useState(null)
  const [popupFin,             setPopupFin]             = useState(false)
  const [popupFinPct,          setPopupFinPct]          = useState(100)
  const [ejerciciosEntregados,    setEjerciciosEntregados]    = useState(new Set())
  const [entregadosCargados,      setEntregadosCargados]      = useState(false)
  const yaEntregandoRef = useRef(false)  // evita doble submit en el mismo ejercicio

  const claveLS = useMemo(() => nombreUsuario ? `cyberlab_progreso_${nombreUsuario}` : null, [nombreUsuario])

  const prefijos = useMemo(() => [
    "help","status","show alerts","show events","show blocked",
    "block ip ","unblock ip ","clear","whoami","pwd","ls","ip a","ifconfig",
    "show services","scan ports","show traffic","show banners","resolve host",
    "show vulnerabilities","trace ip","show users","show sessions",
    "show failed logins","show processes","enumerate users","export report",
    "show hosts","enumerate services","history",
  ], [])

  // Derivados del estado actual
  const ejActual    = ejercicios[nivelActivo]?.actual || 1
  const compActual  = ejercicios[nivelActivo]?.completados || 0
  const defActual   = NIVELES_EJERCICIOS[nivelActivo]?.ejercicios?.[ejActual]
  const nivelDesbloqueado = (n) => {
    if (n === 1) return true
    return (ejercicios[n - 1]?.completados || 0) >= TOTAL_EJ
  }
  const pct = calcularPct(checklist)

  const leerLS = () => {
    if (!claveLS) return null
    try { return JSON.parse(localStorage.getItem(claveLS) || "null") } catch { return null }
  }
  const guardarLS = data => {
    if (!claveLS) return
    localStorage.setItem(claveLS, JSON.stringify({ ...(leerLS() || {}), ...data }))
  }

  const cargarProgresoLecturaDesdeBackend = async (usuario) => {
    try {
      const token = localStorage.getItem("token")
      const r = await fetch(
        `${API_URL}/progreso/${encodeURIComponent(usuario)}`,
        { headers: { "Authorization": `Bearer ${token}` } }
      )
      if (!r.ok) return
      const d = await r.json()
      const registros = Array.isArray(d.progreso) ? d.progreso : []

      const nuevoMapa = {}
      for (let n = 1; n <= 7; n++) {
        nuevoMapa[`ataque_nivel${n}`] = {}
        for (const s of SECCIONES_INFO) nuevoMapa[`ataque_nivel${n}`][s] = false
      }
      registros.forEach(reg => {
        if (reg.porcentaje >= 100 || reg.completado) {
          const idx    = reg.leccion_id - 1
          const niv    = Math.floor(idx / SECCIONES_INFO.length) + 1
          const secIdx = idx % SECCIONES_INFO.length
          const sec    = SECCIONES_INFO[secIdx]
          if (niv >= 1 && niv <= 7 && sec) nuevoMapa[`ataque_nivel${niv}`][sec] = true
        }
      })
      guardarLS({ seccionesVistas: nuevoMapa })
    } catch (e) {
      console.warn("No se pudo cargar progreso de lectura:", e)
    }
  }

  const progresoLectura = nid => {
    const raw  = leerLS()
    const mapa = raw?.seccionesVistas?.[`ataque_nivel${nid}`] || raw?.seccionesVistas?.[`nivel${nid}`]
    if (!mapa) return 0
    const v = SECCIONES_INFO.filter(s => mapa[s]).length
    return Math.round(v / SECCIONES_INFO.length * 100)
  }
  const normalizar = t => typeof t === "string"
    ? t.replaceAll("ver alertas","show alerts").replaceAll("ver eventos","show events")
       .replaceAll("ver bloqueadas","show blocked").replaceAll("bloquear ip ","block ip ")
    : ""

  const cargarStats = async () => {
    try {
      const d = await (await fetch(`${API_URL}/estadisticas`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token") || ""}` }
      })).json()
      setStats({
        total_eventos:     d?.total_eventos     ?? 0,
        total_alertas:     d?.total_alertas     ?? 0,
        eventos_recientes: Array.isArray(d?.eventos_recientes) ? d.eventos_recientes : [],
        alertas_recientes: Array.isArray(d?.alertas_recientes) ? d.alertas_recientes : [],
      })
    } catch { setStats(p => ({ ...p, eventos_recientes: [], alertas_recientes: [] })) }
  }

  // Carga progreso real desde backend usando el endpoint de laboratorio (válido para estudiantes)
  const cargarProgresoDesdeBackend = async (usuario) => {
    try {
      const r = await fetch(`${API_URL}/progreso/laboratorio/${encodeURIComponent(usuario)}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token") || ""}` }
      })
      if (!r.ok) return
      const d = await r.json()
      const detalle = d?.detalle || {}

      setEjercicios(prev => {
        const nuevo = { ...prev }
        for (let n = 1; n <= 7; n++) {
          const info = detalle[String(n)]
          if (!info) continue
          const comp = Math.min(info.completados || 0, TOTAL_EJ)
          nuevo[n] = { actual: Math.min(comp + 1, TOTAL_EJ), completados: comp }
        }
        guardarLS({ ejercicios: nuevo })
        return nuevo
      })
    } catch (e) { console.warn("No se pudo cargar progreso del backend:", e) }
  }

  // Texto inicial: narrativa + guía solo si es ejercicio 1
  const textoInicial = (datos, nivel, num) => {
    const def    = NIVELES_EJERCICIOS[nivel]?.ejercicios?.[num]
    const narr   = normalizar(datos?.texto_caso || "")
    const titulo = def?.titulo || datos?.titulo_caso || "Caso de entrenamiento"
    const ctx    = def?.contexto || ""

    let guia = ""
    if (def?.guiado) {
      guia = "\n\n💡 Ejercicio guiado — pasos en orden:\n"
      def.checklist.forEach((p, i) => {
        guia += `  ${i + 1}. ${ETIQUETA_DESC(p)}\n`
      })
    }
    return `━━ ${titulo} ━━\n\n${narr}\n\n📋 Situación operacional:\n${ctx}${guia}`
  }

  // Texto tras ejecutar comandos:
  // Si está completo → mensaje de éxito
  // Si no → NO cambiamos el texto del escenario (conservamos la narrativa original)
  // El progreso ya se ve en la barra y el checklist visual
  const textoPorChecklist = (cl, textoActual) => {
    if (checklistCompleto(cl)) {
      return "✅ Ejercicio completado.\n\nTodos los pasos fueron ejecutados correctamente.\n\nPuedes generar el reporte o iniciar el siguiente ejercicio."
    }
    // Conservar el texto narrativo original — no revelar próximo paso
    return textoActual
  }

  const reiniciarPorTiempo = () => {
    setEscenario(null); setEstadoEsc("inactivo")
    setTextoEsc("Tiempo agotado.\nEl ejercicio fue reiniciado. Inicia de nuevo.")
    setChecklist(checklistVacio(nivelActivo, ejActual))
    setInicioEsc(null); setTiempoRest(LIMITE_SEG)
    setReporte(null); setIntentoReg(false); setMostrarHint(false); setHint("")
    setHistorial(p => [...p, "> system: time expired", "Ejercicio reiniciado por tiempo."])
  }

  const iniciarEscenario = (datos, nivel, num) => {
    const vars = Array.isArray(datos?.variables) ? datos.variables : []
    const ov   = k => vars.find(v => v.clave === k)?.valor || ""
    const ip   = datos?.ip || ov("ip_atacante") || ov("ip_origen") || "—"
    const nuevo = {
      id: datos?.id || null, ejercicio_id: datos?.ejercicio_id || null,
      plantilla_id: datos?.plantilla_id || null,
      tipo: datos?.tipo_ataque || datos?.tipo || "Escenario", ip, vars
    }
    const clInicial = checklistVacio(nivel, num)
    setEscenario(nuevo); setEstadoEsc("iniciado")
    setChecklist(clInicial); setMostrarHint(false); setHint("")
    setAyudas(0)  // FIX: reiniciar contador de ayudas por ejercicio
    const txt = textoInicial(datos, nivel, num)
    setTextoEsc(txt); setInicioEsc(Date.now()); setTiempoRest(LIMITE_SEG)
    setReporte(null); setIntentoReg(false)
    guardarLS({ escenario: nuevo, estadoEsc: "iniciado", textoEsc: txt,
                checklist: clInicial, inicioEsc: Date.now(), nivelActivo })
  }

  const simular = async () => {
    if (!inicioSes) { setInicioSes(Date.now()); setReporte(null) }
    const defNivel = NIVELES_EJERCICIOS[nivelActivo]
    const url = defNivel?.tipo_simulacion === "fuerza_bruta"
      ? `${API_URL}/simular/fuerza-bruta`
      : `${API_URL}/simular/escaneo-puertos`
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
        `> system: scenario loaded — nivel ${nivelActivo} ej ${ejActual}/5`,
        d?.mensaje || "OK"
      ])
      iniciarEscenario(d, nivelActivo, ejActual)
    } catch { setMensaje("No se pudo conectar con el backend") }
  }

  const pedirAyuda = async () => {
    if (!escenario) { setMensaje("No hay escenario activo."); return }
    setCargandoAyuda(true)
    try {
      const r = await fetch(`${API_URL}/escenario/pedir-ayuda`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ nombre_usuario: nombreUsuario })
      })
      const d = await r.json()
      if (r.ok) {
        const sig = siguientePaso(checklist, nivelActivo, ejActual)
        const ip  = escenario?.ip || "?"
        // Al pedir ayuda SÍ se revela el comando (con penalización)
        const h = !sig
          ? "Ya completaste todos los pasos. Genera el reporte."
          : `Ejecuta: ${ETIQUETA_CMD(sig, ip)}`
        setHint(h); setAyudas(d.veces_pedida || 0); setMostrarHint(true)
        setHistorial(p => [...p,
          `> system: hint (${d.veces_pedida}x) -${d.penalizacion_porcentaje}%`, h
        ])
      }
    } catch { setMensaje("No se pudo obtener la pista") }
    finally { setCargandoAyuda(false) }
  }

  const registrarIntento = async () => {
    if (intentoReg || !nombreUsuario || !escenario) return false
    const tUsado = Math.max(0, LIMITE_SEG - tiempoRest)
    const ejId   = escenario.ejercicio_id || 1
    try {
      const r = await fetch(`${API_URL}/intentos/crear`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({
          nombre_usuario: nombreUsuario, ejercicio_id: ejId,
          tiempo_seg: tUsado, errores: 0, porcentaje: 100, estado: "aprobado"
        })
      })
      if (r.ok) {
        setIntentoReg(true)
        setHistorial(p => [...p, "> system: attempt registered", "Intento registrado."])
        return true
      }
    } catch {}
    return false
  }

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

  // Mapeo comando → clave checklist
  const CMD_A_CLAVE = {
    "show alerts":          "showAlerts",
    "show events":          "showEvents",
    "show blocked":         "showBlocked",
    "status":               "status",
    "ip a":                 "ipA",
    "ls":                   "ls",
    "whoami":               "whoami",
    "show services":        "showServices",
    "scan ports":           "scanPorts",
    "show traffic":         "showTraffic",
    "show banners":         "showBanners",
    "resolve host":         "resolveHost",
    "show vulnerabilities": "showVulnerabilities",
    "trace ip":             "traceIp",
    "show users":           "showUsers",
    "show sessions":        "showSessions",
    "show failed logins":   "showFailedLogins",
    "show processes":       "showProcesses",
    "enumerate users":      "enumerateUsers",
    "export report":        "exportReport",
    "show hosts":           "showHosts",
    "enumerate services":   "enumerateServices",
    "history":              "history",
  }

  const actualizarTrasComando = async (cmdN, salida) => {
    if (!escenario) return
    const sal = String(salida ?? "").toLowerCase()
    const def = NIVELES_EJERCICIOS[nivelActivo]?.ejercicios?.[ejActual]
    if (!def) return

    let clave = null

    // block ip — caso especial
    if (cmdN.startsWith("block ip ") && def.checklist.includes("blockIp")) {
      if (sal.includes("iptables: blocked") || sal.includes("already blocked")) clave = "blockIp"
    } else if (cmdN.startsWith("unblock ip ") && def.checklist.includes("unblockIp")) {
      if (sal.includes("iptables: unblocked") || sal.includes("was not blocked")) clave = "unblockIp"
    } else {
      const c = CMD_A_CLAVE[cmdN]
      if (c && def.checklist.includes(c)) clave = c
    }

    if (!clave) return

    const nuevoCL = { ...checklist, [clave]: true }
    setChecklist(nuevoCL)
    const completo = checklistCompleto(nuevoCL)
    setEstadoEsc(completo ? "resuelto" : "iniciado")
    // FIX 3: Solo actualizar textoEsc si completó — de lo contrario conservar narrativa
    const nuevoTexto = textoPorChecklist(nuevoCL, textoEsc)
    setTextoEsc(nuevoTexto)
    guardarLS({ checklist: nuevoCL, estadoEsc: completo ? "resuelto" : "iniciado", textoEsc: nuevoTexto })
    if (completo) { await registrarIntento(); avanzar(); setPopupFin(true) }
  }

  const ejecutarComando = async e => {
    e.preventDefault()
    if (!comando.trim()) return
    if (!inicioSes) { setInicioSes(Date.now()); setReporte(null) }
    const cmd  = comando.trim()
    const cmdN = cmd.toLowerCase()
    setComando("")
    const prompt = `cyberlab@kali:~$ ${cmd}`
    try {
      const r = await fetch(`${API_URL}/terminal`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ nombre_usuario: nombreUsuario, comando: cmd })
      })
      const d   = await r.json()
      const sal = d?.salida ?? ""
      if (sal === "__LIMPIAR__") {
        setHistorial(["CyberLab Terminal — modo kali-like","Escribe 'help' para ver los comandos."])
      } else {
        setHistorial(p => [...p, prompt, ...String(sal).split("\n")])
      }
      const valido = prefijos.some(p => cmdN === p || cmdN.startsWith(p))
      if (valido && sal !== "__LIMPIAR__" && !String(sal).toLowerCase().includes("command not found"))
        setCmdValidos(p => [...p, cmd])
      await actualizarTrasComando(cmdN, sal)
      actualizarChecklistDocente(cmdN, sal)
      await cargarStats()
    } catch {
      setHistorial(p => [...p, prompt, "Error: no se pudo conectar con la terminal."])
    }
  }

  const generarReporte = async () => {
    if (!checklistCompleto(checklist)) {
      setMensaje("Completa todos los pasos del ejercicio antes de generar el reporte.")
      return
    }
    await registrarIntento()
    const rep = {
      nombreUsuario, duracionSegundos: tiempoSes,
      totalEventos: stats.total_eventos, totalAlertas: stats.total_alertas,
      ipsBloqueadas: [], cmdCorrectos: cmdValidos, ayudas,
      logros: ["Ejercicio completado", "Análisis del incidente realizado", "Contención aplicada"],
    }
    try {
      const r = await fetch(`${API_URL}/reporte?nombre_usuario=${nombreUsuario}`, {
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
    setHistorial(p => [...p, "> system: report generated", "Reporte generado — ver modal."])
  }

  // Efectos
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
      setTextoEsc(g.textoEsc || "No hay escenario activo.")
      setChecklist(g.checklist || { showAlerts: false, showEvents: false, blockIp: false })
      setInicioEsc(g.inicioEsc || null)
      setTiempoRest(typeof g.tiempoRest === "number" ? g.tiempoRest : LIMITE_SEG)
      setNivelActivo(g.nivelActivo || 1)
      if (g.ejercicios) setEjercicios(prev => ({ ...prev, ...g.ejercicios }))
    }
    cargarProgresoDesdeBackend(nombreUsuario)
    cargarProgresoLecturaDesdeBackend(nombreUsuario)
    // Cargar ejercicios ya entregados desde el backend (fuente de verdad)
    fetch(`${API_URL}/mis-entregas-docente`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d?.ejercicio_ids)) {
          setEjerciciosEntregados(new Set(d.ejercicio_ids))
        }
      }).catch(() => {})
      .finally(() => setEntregadosCargados(true))
    // Restaurar ejercicio docente activo si había uno en progreso
    try {
      const saved = JSON.parse(localStorage.getItem(`cyberlab_ej_docente_${nombreUsuario}`) || "null")
      if (saved?.ej && saved?.checklist && !saved?.entregado) {
        setEjDocenteActivo(saved.ej)
        setChecklistManual(saved.checklist)
        setAyudasDocente(saved.ayudas || 0)
        setTimerDocente(saved.timerRestante || (saved.ej.tiempo_minutos || 10) * 60)
        setTimerDocenteActivo(saved.timerRestante > 0)
      }
    } catch {}
    // Cargar ejercicios del docente para modo ataque
    fetch(`${API_URL}/ejercicios-docente/tipo/ataque`, { headers: getAuthHeaders() })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setEjerciciosDocente(d) }).catch(() => {})
    const iv = setInterval(cargarStats, 3000)
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

  // Timer para ejercicios docente + persistencia cada tick
  useEffect(() => {
    if (!timerDocenteActivo || !ejDocenteActivo) return
    const iv = setInterval(() => {
      setTimerDocente(p => {
        const next = p <= 1 ? 0 : p - 1
        // Persistir estado del ejercicio en cada tick
        try {
          const saved = JSON.parse(localStorage.getItem(`cyberlab_ej_docente_${localStorage.getItem("nombre_usuario")}`) || "{}")
          localStorage.setItem(`cyberlab_ej_docente_${localStorage.getItem("nombre_usuario")}`, JSON.stringify({ ...saved, timerRestante: next }))
        } catch {}
        if (next <= 0) clearInterval(iv)
        return next
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [timerDocenteActivo, ejDocenteActivo])

  // Auto-submit cuando el timer docente llega a 0
  useEffect(() => {
    if (timerDocente !== 0 || !ejDocenteActivo || timerDocenteActivo) return
    const pct = Math.round(Object.values(checklistManual).filter(Boolean).length / Math.max(Object.keys(checklistManual).length, 1) * 100)
    setTimerDocenteActivo(false)
    if (!yaEntregandoRef.current) {
      yaEntregandoRef.current = true
      fetch(`${API_URL}/ejercicios-docente/${ejDocenteActivo.id}/entregar`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ respuesta: `Tiempo agotado. Progreso: ${pct}%. Ayudas: ${ayudasDocente}`, ayudas_pedidas: ayudasDocente }),
      }).catch(() => {})
      setEjerciciosEntregados(prev => new Set([...prev, ejDocenteActivo.id]))
      try {
        localStorage.setItem(`cyberlab_ej_docente_${localStorage.getItem("nombre_usuario")}`, JSON.stringify({ ej: ejDocenteActivo, checklist: checklistManual, ayudas: ayudasDocente, timerRestante: 0, entregado: true }))
      } catch {}
    }
    setPopupFinPct(pct)
    setPopupFin(true)
    setTimeout(() => cargarProgresoDesdeBackend(localStorage.getItem("nombre_usuario")), 1500)
  }, [timerDocente, timerDocenteActivo])

  // Detecta si un comando completa un ítem según palabras clave en su descripción
  const itemCompletadoPorComando = (descripcion, cmdNorm) => {
    const d = descripcion.toLowerCase()
    const c = cmdNorm.toLowerCase()
    const reglas = [
      { kw: ["nmap","escaneo tcp","syn","tcp syn"],          cmds: ["nmap"] },
      { kw: ["hosts activos","hosts","ping sweep","descubrir hosts"], cmds: ["nmap","ping","arp","show hosts"] },
      { kw: ["puertos abiertos","puertos","port scan"],      cmds: ["nmap","scan ports","nmap -p","nmap -ss","nmap -st"] },
      { kw: ["servicios expuesto","servicio expuesto","servicios innecesari","expuesto innecesari","servicio innecesari"], cmds: ["show services","enumerate services","nmap"] },
      { kw: ["servicios","service","versión","version"],     cmds: ["nmap -sv","nmap","enumerate services","show services"] },
      { kw: ["vulnerabilidades","vulnerabilidad","vuln","puntos débiles","punto débil","debilidad","debilidades","configuración de red","configuracion de red"], cmds: ["show vulnerabilities","nmap","scan ports","show banners"] },
      { kw: ["reforzar","fortalecer","mitigar","mitigación","hardening","medidas de seguridad","medidas para","proponer medidas","mejorar la seguridad","incrementar la seguridad"], cmds: ["block ip","show vulnerabilities","show banners","show services"] },
      { kw: ["documentar","reporte","informe","evidencia","hallazgo","soluciones propuestas","registrar"], cmds: ["export","report","export report"] },
      { kw: ["bloquear","bloqueo","firewall","deny","contener","contención"],  cmds: ["block ip","iptables","firewall","ufw"] },
      { kw: ["alertas","alerta","ids"],                      cmds: ["show alerts","alert"] },
      { kw: ["eventos","evento","log"],                      cmds: ["show events","log","journalctl"] },
      { kw: ["tráfico","trafico","sniff","captura"],         cmds: ["show traffic","tcpdump","wireshark","tshark"] },
      { kw: ["usuarios","usuario","cuentas","cuenta","configuración de la cuenta","account"], cmds: ["show users","enumerate users","whoami","cat /etc/passwd"] },
      { kw: ["sesiones","sesión","conexiones activas"],      cmds: ["show sessions","netstat","ss -"] },
      { kw: ["procesos","proceso","running"],                cmds: ["show processes","ps aux","ps -"] },
      { kw: ["banner","versión servicio","versiones de servicio","información de versión"], cmds: ["show banners","nc ","netcat","banner"] },
      { kw: ["interfaz","interfaces","ip address","dirección ip"], cmds: ["ip a","ifconfig","ipconfig"] },
      { kw: ["intentos fallidos","bruteforce","fuerza bruta"], cmds: ["show failed","failed logins","auth.log"] },
      { kw: ["correos","correo electrónico","email","bandeja","inbox","mail"], cmds: ["show alerts","show events","show traffic"] },
      { kw: ["phishing","enlace malicioso","enlaces maliciosos","malware","malicioso"], cmds: ["show alerts","show events","show traffic"] },
      { kw: ["accesos no autorizados","acceso no autorizado","inicio de sesión","login reciente","actividad reciente"], cmds: ["show sessions","show failed logins","show events"] },
      { kw: ["reconocimiento","reconocer","mapear","mapeo","identificar red","identificar host","identificar serv"], cmds: ["show hosts","scan ports","enumerate services","show services","nmap"] },
    ]
    for (const r of reglas) {
      if (r.kw.some(k => d.includes(k)) && r.cmds.some(cmd => c.includes(cmd))) return true
    }
    return false
  }

  // Llama a la IA para obtener una pista sobre el ítem actual sin completar
  const pedirPistaDocente = async () => {
    if (!ejDocenteActivo || cargandoPista) return
    const itemPendiente = ejDocenteActivo.items.find(it => !checklistManual[it.id])
    if (!itemPendiente) return
    setCargandoPista(true)
    const nuevasAyudas = ayudasDocente + 1
    setAyudasDocente(nuevasAyudas)
    try {
      const r = await fetch(`${API_URL}/terminal`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({
          nombre_usuario: nombreUsuario,
          comando: `hint: Estoy en un ejercicio de ciberseguridad. El paso que debo completar es: "${itemPendiente.descripcion}". Dame una pista corta (máximo 2 líneas) sobre qué comando o herramienta usar, sin revelar la solución exacta.`
        })
      })
      const d = await r.json()
      const pista = d?.salida ?? "Analiza el contexto del ejercicio y piensa qué herramienta corresponde a este paso."
      setPistaDocente(pista)
      setMostrarPista(true)
    } catch {
      setPistaDocente("Revisa el contexto del ejercicio e identifica qué herramienta de Kali Linux corresponde a este paso.")
      setMostrarPista(true)
    } finally {
      setCargandoPista(false)
    }
  }

  const iniciarEjDocente = (ej) => {
    const cl = {}
    ej.items.forEach(it => { cl[it.id] = false })
    setEjDocenteActivo(ej)
    setChecklistManual(cl)
    setAyudasDocente(0)
    setPistaDocente("")
    setMostrarPista(false)
    const secs = (ej.tiempo_minutos || 10) * 60
    setTimerDocente(secs)
    setTimerDocenteActivo(true)
    yaEntregandoRef.current = false
    // Persistir ejercicio activo
    const u = localStorage.getItem("nombre_usuario")
    try { localStorage.setItem(`cyberlab_ej_docente_${u}`, JSON.stringify({ ej, checklist: cl, ayudas: 0, timerRestante: secs, entregado: false })) } catch {}
    setHistorial(["CyberLab Terminal — modo kali-like", `Ejercicio iniciado: ${ej.titulo}`, "Usa la terminal para explorar. Los puntos se completan automáticamente al ejecutar los comandos correctos."])
  }

  // Auto-completar ítems según el comando ejecutado
  const actualizarChecklistDocente = (cmdNorm, salida) => {
    if (!ejDocenteActivo) return
    if (String(salida).toLowerCase().includes("command not found")) return
    setChecklistManual(prev => {
      const nuevo = { ...prev }
      let cambio = false
      ejDocenteActivo.items.forEach(it => {
        if (!nuevo[it.id] && itemCompletadoPorComando(it.descripcion, cmdNorm)) {
          nuevo[it.id] = true
          cambio = true
        }
      })
      if (!cambio) return prev
      const completo = Object.values(nuevo).every(Boolean)
      // Persistir checklist actualizado
      const u = localStorage.getItem("nombre_usuario")
      try {
        const saved = JSON.parse(localStorage.getItem(`cyberlab_ej_docente_${u}`) || "{}")
        localStorage.setItem(`cyberlab_ej_docente_${u}`, JSON.stringify({ ...saved, checklist: nuevo, entregado: completo || saved.entregado }))
      } catch {}
      if (completo && !yaEntregandoRef.current) {
        yaEntregandoRef.current = true
        setTimerDocenteActivo(false)
        const tiempoUsado = (ejDocenteActivo.tiempo_minutos * 60) - timerDocente
        fetch(`${API_URL}/ejercicios-docente/${ejDocenteActivo.id}/entregar`, {
          method: "POST", headers: getAuthHeaders(),
          body: JSON.stringify({
            respuesta: `Completado vía terminal. Tiempo: ${tiempoUsado}s. Ayudas pedidas: ${ayudasDocente}`,
            ayudas_pedidas: ayudasDocente,
          }),
        }).catch(() => {})
        setEjerciciosEntregados(prev => new Set([...prev, ejDocenteActivo.id]))
        setPopupFinPct(100)
        setPopupFin(true)
        setTimeout(() => cargarProgresoDesdeBackend(localStorage.getItem("nombre_usuario")), 1500)
      }
      return nuevo
    })
  }

  const pctDocente = ejDocenteActivo
    ? Math.round(Object.values(checklistManual).filter(Boolean).length / Math.max(Object.keys(checklistManual).length, 1) * 100)
    : 0

  const fmt    = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
  const cTimer = tiempoRest <= 60 ? "#ff453a" : tiempoRest <= 120 ? "#ff9f0a" : null
  const timerClass = tiempoRest <= 60 ? "danger" : tiempoRest <= 120 ? "warning" : ""

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">

        <BarraSuperior paginaActiva="laboratorio" />

        {/* ── BANNER ejercicio activo ── */}
        {estadoEsc !== "inactivo" && bannerVisible && (
          <div className={`banner${estadoEsc === "resuelto" ? " resolved" : ""}`}>
            <span className="banner-icon">{estadoEsc === "resuelto" ? "✅" : "🔔"}</span>
            <div>
              {estadoEsc === "resuelto" ? (
                <><strong>¡Ejercicio completado!</strong> Nivel {nivelActivo} — Ej. {ejercicios[nivelActivo]?.actual || ejActual}/5. Genera el reporte para guardar tu resultado.</>
              ) : (
                <><strong>Ejercicio activo:</strong> Nivel {nivelActivo} — Ejercicio {ejActual}/5. El timer está corriendo. Tienes <strong>{fmt(tiempoRest)}</strong> restantes.
                {ayudas > 0 && <span style={{ color:"#ff9f0a", marginLeft:8 }}>⚠ {ayudas} ayuda{ayudas > 1 ? "s" : ""} usada{ayudas > 1 ? "s" : ""} (-{Math.min(ayudas*5,30)}%)</span>}</>
              )}
            </div>
            <button className="banner-close" onClick={() => setBannerVisible(false)}>✕</button>
          </div>
        )}

        {/* ── PAGE HEADER ── */}
        <header style={{ marginBottom: 4, display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16 }}>
          <div>
            <h1 style={{ margin:"0 0 4px", fontSize:32, fontWeight:800, letterSpacing:"-1px", color:"#f5f5f7", lineHeight:1 }}>
              Dashboard
            </h1>
            <p style={{ margin:0, fontSize:15, color:"#8e8e93" }}>
              {nombreUsuario && <><strong style={{ color:"#aeaeb2" }}>{nombreUsuario}</strong> · </>}
              {NIVELES_EJERCICIOS[nivelActivo]?.nombre} · Semana activa
            </p>
          </div>
          {tiempoSes > 0 && (
            <span style={{ fontFamily:"var(--mono)", fontSize:13, color:"#8e8e93", background:"#1c1c1e", border:"1px solid #2c2c2e", padding:"6px 12px", borderRadius:8, flexShrink:0 }}>
              ⏱ {tiempoSes}s
            </span>
          )}
        </header>

        {/* ── STATS — 3 tarjetas ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          {[
            { label:"EVENTOS DETECTADOS", valor: stats.total_eventos, colorClass:"blue",   sub:"show events" },
            { label:"ALERTAS ACTIVAS",    valor: stats.total_alertas, colorClass:"orange",  sub:"show alerts" },
            { label:"NIVEL ACTIVO",       valor: `${nivelActivo}/7`,  colorClass:"green",   sub:`Ej. ${ejActual} de 5` },
          ].map(({ label, valor, colorClass, sub }) => (
            <div key={label} className="stat-card-mock">
              <div className="stat-label-mock">{label}</div>
              <div className={`stat-value-mock ${colorClass}`}>{valor}</div>
              <div className="stat-delta-mock">{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Niveles de entrenamiento + ejercicios docente ── */}
        {(() => {
          const NOMBRES_NIV = {1:"Fundamentos",2:"Reconocimiento",3:"Enumeración",4:"Explotación",5:"Post-exploit",6:"Avanzado",7:"Operación"}
          const C = {
            bg:  n => n<=2?"rgba(48,209,88,0.14)":n<=4?"rgba(255,159,10,0.14)":n<=6?"rgba(255,100,50,0.14)":"rgba(255,69,58,0.14)",
            txt: n => n<=2?"#30d158":n<=4?"#ff9f0a":n<=6?"#ff6332":"#ff453a",
            brd: n => n<=2?"rgba(48,209,88,0.38)":n<=4?"rgba(255,159,10,0.38)":n<=6?"rgba(255,100,50,0.38)":"rgba(255,69,58,0.38)",
          }
          const porNivel = {}
          ejerciciosDocente.forEach(ej => { const n=ej.nivel||1; if(!porNivel[n]) porNivel[n]=[]; porNivel[n].push(ej) })
          const n = nivelDocenteAbierto || 1
          const lista = porNivel[n] || []
          return (
            <div className="card-mock">
              {/* Card header */}
              <div className="card-mock-header">
                <div>
                  <div className="card-mock-title">Niveles de entrenamiento</div>
                  <div className="card-mock-subtitle">7 niveles · Nivel {nivelActivo} en progreso</div>
                </div>
                <span className="card-mock-tag">
                  {(ejercicios[nivelActivo]?.completados||0)} / 5 completados
                </span>
              </div>
              {/* Levels grid */}
              <div className="card-mock-body">
                <div className="levels-grid-mock">
                  {[1,2,3,4,5,6,7].map(lv => {
                    const comp   = ejercicios[lv]?.completados || 0
                    const activo = lv === nivelActivo
                    const done   = comp >= TOTAL_EJ
                    const desbloqueado = nivelDesbloqueado(lv)
                    const pct    = done ? 100 : Math.round(comp / TOTAL_EJ * 100)
                    return (
                      <button
                        key={lv}
                        className={`level-card-mock${activo ? " active" : done ? " done" : ""}`}
                        onClick={() => { setNivelActivo(lv); setNivelDocenteAbierto(lv) }}
                      >
                        <div className="level-num-mock">{lv}</div>
                        <div className="level-name-mock">{NOMBRES_NIV[lv]}</div>
                        <div className="level-progress-mock">
                          <div className="level-fill-mock" style={{ width: `${pct}%` }} />
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Ejercicios del docente por nivel */}
                <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid #2c2c2e" }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color:"#8e8e93", marginBottom:10 }}>
                    EJERCICIOS DOCENTE — {NOMBRES_NIV[n]}
                  </div>
                  {lista.length === 0 ? (
                    <div style={{ fontSize:13, color:"#8e8e93", textAlign:"center", padding:"10px 0" }}>
                      El docente aún no ha publicado ejercicios de ataque en este nivel.
                    </div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      {lista.map(ej => {
                        const activo = ejDocenteActivo?.id === ej.id
                        const entregado = ejerciciosEntregados.has(ej.id)
                        return (
                          <button key={ej.id} onClick={() => setConfirmEjDocente(ej)} style={{
                            textAlign:"left", padding:"11px 14px", borderRadius:10, width:"100%",
                            border: activo ? "1.5px solid #2997ff" : entregado ? "1px solid rgba(0,218,243,0.30)" : "1px solid #2c2c2e",
                            background: activo ? "rgba(41,151,255,0.12)" : entregado ? "rgba(0,218,243,0.07)" : "#242426",
                            color: activo ? "#2997ff" : entregado ? "var(--terciario-dim)" : "#f5f5f7",
                            cursor:"pointer", transition:"all 0.15s",
                            display:"flex", alignItems:"center", gap:12,
                          }}>
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:700, fontSize:13, marginBottom:2 }}>{ej.titulo}</div>
                              <div style={{ fontSize:11, color:"#8e8e93" }}>{ej.items.length} punto{ej.items.length!==1?"s":""} · {ej.tiempo_minutos} min</div>
                            </div>
                            {activo && <span style={{ fontSize:11, fontWeight:700 }}>▶ Activo</span>}
                            {!activo && entregado && <span style={{ fontSize:11, fontWeight:700, color:"var(--terciario-dim)" }}>✓ Entregado</span>}
                            {!activo && !entregado && !entregadosCargados && <span style={{ fontSize:10, color:"#8e8e93" }}>…</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}


        {/* ── MODO DOCENTE: escenario + checklist ── */}
        {modoDocente && ejDocenteActivo && (
          <section className="mission-panel">
            <div className="panel-header">
              <h2 style={{ margin:0 }}>{ejDocenteActivo.titulo}</h2>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                {ayudasDocente > 0 && (
                  <span style={{ fontSize:12, color:"#f59e0b", fontFamily:"var(--mono)" }}>
                    💡 {ayudasDocente} {ayudasDocente === 1 ? "pista" : "pistas"}
                  </span>
                )}
                <span style={{ fontFamily:"var(--mono)", fontSize:18, fontWeight:700, color: timerDocente <= 60 ? "#ef4444" : timerDocente <= 120 ? "#f59e0b" : "#00daf3" }}>
                  {fmt(timerDocente)}
                </span>
              </div>
            </div>
            <pre className="mission-text">{ejDocenteActivo.contexto_generado || ejDocenteActivo.descripcion}</pre>
            <div className="progress-wrapper">
              <div className="progress-top">
                <span style={{ color:"var(--texto-secundario)" }}>Progreso</span>
                <strong style={{ color: pctDocente === 100 ? "var(--terciario-dim)" : "var(--primario-dim)" }}>{pctDocente}%</strong>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width:`${pctDocente}%`, background: pctDocente === 100 ? "var(--terciario)" : "var(--gradiente-principal)" }}/>
              </div>
            </div>
            <div style={{
              display:"grid",
              gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",
              gap:10, marginTop:16
            }}>
              {ejDocenteActivo.items.map((it, idx) => {
                const done = checklistManual[it.id]
                return (
                  <div key={it.id} style={{
                    display:"flex", flexDirection:"column", gap:8,
                    padding:"12px 14px", borderRadius:12,
                    border: done ? "1px solid rgba(0,218,243,0.35)" : "1px solid rgba(255,255,255,0.08)",
                    background: done ? "rgba(0,218,243,0.07)" : "rgba(255,255,255,0.03)",
                    transition:"all 0.3s",
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{
                        width:26, height:26, borderRadius:"50%", flexShrink:0,
                        display:"grid", placeItems:"center",
                        fontSize:12, fontWeight:800, fontFamily:"var(--mono)",
                        background: done ? "rgba(0,218,243,0.18)" : "rgba(255,255,255,0.06)",
                        border: done ? "1.5px solid rgba(0,218,243,0.45)" : "1.5px solid rgba(255,255,255,0.12)",
                        color: done ? "var(--terciario-dim)" : "var(--texto-apagado)",
                      }}>
                        {done ? "✓" : idx + 1}
                      </div>
                      {done && <span style={{ fontSize:9, fontWeight:800, fontFamily:"var(--mono)", color:"var(--terciario-dim)", letterSpacing:"0.05em", textTransform:"uppercase" }}>Completado</span>}
                    </div>
                    <span style={{ fontSize:12, lineHeight:1.5, color: done ? "var(--terciario-dim)" : "var(--texto-secundario)" }}>
                      {it.descripcion}
                    </span>
                  </div>
                )
              })}
            </div>
            {/* Botón de pista */}
            {pctDocente < 100 && (
              <div style={{ marginTop:12 }}>
                <button
                  onClick={pedirPistaDocente}
                  disabled={cargandoPista}
                  style={{
                    padding:"8px 16px", borderRadius:8, border:"1px solid rgba(245,158,11,0.4)",
                    background:"rgba(245,158,11,0.08)", color:"#f59e0b", cursor:"pointer",
                    fontSize:13, fontWeight:600, opacity: cargandoPista ? 0.6 : 1,
                  }}
                >
                  {cargandoPista ? "Obteniendo pista..." : "💡 Pedir pista"}
                </button>
                {mostrarPista && pistaDocente && (
                  <div style={{
                    marginTop:10, padding:"10px 14px",
                    background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)",
                    borderRadius:8, fontSize:13, color:"#fbbf24", whiteSpace:"pre-wrap",
                  }}>
                    <strong>Pista:</strong> {pistaDocente}
                    <button onClick={() => setMostrarPista(false)} style={{ marginLeft:12, background:"none", border:"none", color:"#f59e0b", cursor:"pointer", fontSize:13 }}>✕</button>
                  </div>
                )}
              </div>
            )}
            {pctDocente === 100 && (
              <div style={{ marginTop:12, padding:"10px 14px", background:"rgba(0,218,243,0.10)", border:"1px solid rgba(0,218,243,0.25)", borderRadius:8, color:"var(--terciario-dim)", fontWeight:700, fontSize:14 }}>
                ✅ Ejercicio completado{ayudasDocente > 0 ? ` · ${ayudasDocente} pista${ayudasDocente > 1 ? "s" : ""} usada${ayudasDocente > 1 ? "s" : ""}` : ""}
              </div>
            )}
          </section>
        )}

        {/* Terminal */}
        <section style={{ background:"#0d1117", border:"1px solid rgba(57,211,83,0.18)", borderRadius:18, overflow:"hidden", boxShadow:"0 8px 40px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.04)" }}>
          {/* Chrome bar */}
          <div style={{ background:"#161b22", padding:"11px 16px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display:"flex", gap:6 }}>
              <div style={{ width:12, height:12, borderRadius:"50%", background:"#ff5f57" }}/>
              <div style={{ width:12, height:12, borderRadius:"50%", background:"#febc2e" }}/>
              <div style={{ width:12, height:12, borderRadius:"50%", background:"#28c840" }}/>
            </div>
            <div style={{ flex:1, textAlign:"center", fontFamily:"var(--mono)", fontSize:12, color:"rgba(255,255,255,0.40)" }}>
              CyberLab Terminal — Simulación activa
            </div>
            <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"#39d353", background:"rgba(57,211,83,0.12)", padding:"3px 8px", borderRadius:6, border:"1px solid rgba(57,211,83,0.25)" }}>
              ● LIVE
            </div>
          </div>
          <div className="terminal-window" ref={termRef} style={{ borderRadius:0, borderLeft:"none", borderRight:"none", borderTop:"none" }}>
            {historial.map((l, i) => (
              <div key={i} className={`terminal-line ${l.startsWith("cyberlab@kali") ? "terminal-cmd" : ""}`}>
                {l}
              </div>
            ))}
          </div>
          <form onSubmit={ejecutarComando} className="terminal-form" style={{ margin:"0 0 0", borderRadius:"0 0 18px 18px", borderLeft:"none", borderRight:"none", borderBottom:"none", borderTop:"1px solid rgba(57,211,83,0.14)" }}>
            <span className="terminal-prefix">cyberlab@kali:~$</span>
            <input className="terminal-input" value={comando} onChange={e => setComando(e.target.value)}
              placeholder="Escribe un comando..." autoComplete="off" spellCheck={false}
              style={{ color:"#c9d1d9", caretColor:"#39d353" }}/>
          </form>
        </section>

        {/* Botón para reabrir reporte si ya existe */}
        {reporte && !modalReporte && (
          <div style={{ textAlign:"center" }}>
            <button className="report-button" onClick={() => setModalReporte(true)}
              style={{ margin:"0 auto" }}>
              📋 Ver reporte de sesión
            </button>
          </div>
        )}


        {/* Mis evaluaciones — visible solo para el estudiante */}
        

        {/* ── Modal confirmación ejercicio docente ── */}
        {confirmEjDocente && (() => {
          const yaEntregado = ejerciciosEntregados.has(confirmEjDocente.id)
          return (
          <div className="modal-fondo" onClick={() => setConfirmEjDocente(null)}>
            <div className="modal-tarjeta" style={{ maxWidth:480 }} onClick={e => e.stopPropagation()}>
              <div className="modal-cabecera">
                <h3 className="modal-titulo">{yaEntregado ? "📋 Ejercicio entregado" : "⚔ ¿Iniciar ejercicio?"}</h3>
                <button className="boton-secundario" onClick={() => setConfirmEjDocente(null)}>✕</button>
              </div>
              <div className="modal-cuerpo" style={{ display:"grid", gap:16 }}>
                <div style={{ background:"rgba(41,151,255,0.06)", border:"1px solid rgba(41,151,255,0.20)", borderRadius:14, padding:"18px 20px" }}>
                  <div style={{ fontSize:11, fontFamily:"var(--mono)", color:"#6db8ff", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>
                    Ejercicio de práctica
                  </div>
                  <div style={{ fontSize:18, fontWeight:800, color:"#f5f5f7", letterSpacing:"-0.3px", marginBottom:6 }}>
                    {confirmEjDocente.titulo}
                  </div>
                  <div style={{ fontSize:13, color:"#8e8e93", lineHeight:1.5 }}>
                    {confirmEjDocente.descripcion}
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                  {[
                    { l:"Tipo",   v: confirmEjDocente.tipo === "ataque" ? "⚔ Ataque" : "🛡 Defensa" },
                    { l:"Nivel",  v:`Nivel ${confirmEjDocente.nivel || 1}` },
                    { l:"Tiempo", v:`${confirmEjDocente.tiempo_minutos} min` },
                  ].map(({ l, v }) => (
                    <div key={l} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:10, padding:"11px 14px" }}>
                      <div style={{ fontSize:10, fontFamily:"var(--mono)", color:"#6e6e73", letterSpacing:"0.06em", marginBottom:4 }}>{l}</div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#f5f5f7" }}>{v}</div>
                    </div>
                  ))}
                </div>
                {yaEntregado ? (
                  <div style={{ padding:"14px 18px", background:"rgba(0,218,243,0.08)", border:"1px solid rgba(0,218,243,0.25)", borderRadius:10, fontSize:13, color:"var(--terciario-dim)", fontWeight:600 }}>
                    ✅ Ya completaste y entregaste este ejercicio. Tu docente lo calificará pronto.
                  </div>
                ) : (
                  <>
                    <p style={{ margin:0, fontSize:13, color:"#8e8e93", lineHeight:1.6, background:"rgba(255,159,10,0.06)", border:"1px solid rgba(255,159,10,0.18)", borderRadius:10, padding:"10px 14px" }}>
                      ⚠ Una vez que confirmes, el temporizador comenzará inmediatamente. Solo puedes entregar este ejercicio una vez.
                    </p>
                    <div style={{ display:"flex", gap:10 }}>
                      <button
                        className="btn-mock-primary"
                        style={{ flex:1, padding:"14px 20px", fontSize:15, fontWeight:700 }}
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
                  </>
                )}
              </div>
            </div>
          </div>
          )
        })()}

        {/* Modal REPORTE */}
        {modalReporte && reporte && (
          <div className="modal-fondo" onClick={() => setModalReporte(false)}>
            <div className="modal-tarjeta" style={{ maxWidth:640 }}
              onClick={e => e.stopPropagation()}>
              <div className="modal-cabecera">
                <h3 className="modal-titulo">📋 Reporte de sesión</h3>
                <button className="boton-secundario" onClick={() => setModalReporte(false)}>Cerrar</button>
              </div>
              <div className="modal-cuerpo" style={{ display:"grid", gap:14 }}>
                {/* Métricas */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                  {[
                    { l:"Operador",     v:reporte.nombreUsuario },
                    { l:"Tiempo total", v:`${reporte.duracionSegundos}s` },
                    { l:"Eventos gen.", v:reporte.totalEventos },
                    { l:"Alertas gen.", v:reporte.totalAlertas },
                    { l:"Ayudas pedidas", v:reporte.ayudas, warn:reporte.ayudas>0 },
                    { l:"Penalización", v:reporte.ayudas>0?`-${Math.min(reporte.ayudas*5,30)}%`:"Sin penalización", warn:reporte.ayudas>0 },
                  ].map(({ l, v, warn }) => (
                    <div key={l} style={{
                      background: warn ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${warn ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius:10, padding:"10px 12px"
                    }}>
                      <div style={{ fontSize:10, fontFamily:"var(--mono)", color:"var(--texto-apagado)", letterSpacing:"0.06em", marginBottom:4 }}>{l}</div>
                      <div style={{ fontSize:16, fontWeight:900, color: warn ? "#fbbf24" : "#fff" }}>{v}</div>
                    </div>
                  ))}
                </div>
                {/* Comandos */}
                <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:12 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--primario-dim)", marginBottom:8, fontFamily:"var(--mono)", letterSpacing:"0.06em" }}>COMANDOS UTILIZADOS</div>
                  {reporte.cmdCorrectos.length === 0
                    ? <p style={{ color:"var(--texto-apagado)", fontSize:13 }}>Ninguno registrado.</p>
                    : <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                        {[...new Set(reporte.cmdCorrectos)].map((c,i) => (
                          <code key={i} style={{
                            background:"rgba(0,218,243,0.10)", color:"var(--terciario-dim)",
                            padding:"3px 8px", borderRadius:5, fontSize:12, fontFamily:"var(--mono)"
                          }}>{c}</code>
                        ))}
                      </div>}
                </div>
                {/* IPs bloqueadas */}
                <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:12 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--primario-dim)", marginBottom:8, fontFamily:"var(--mono)", letterSpacing:"0.06em" }}>IPs BLOQUEADAS</div>
                  {reporte.ipsBloqueadas.length === 0
                    ? <p style={{ color:"var(--texto-apagado)", fontSize:13 }}>Ninguna en esta sesión.</p>
                    : <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                        {reporte.ipsBloqueadas.map(ip => (
                          <code key={ip} style={{
                            background:"rgba(255,180,171,0.10)", color:"#ffb4ab",
                            padding:"3px 8px", borderRadius:5, fontSize:12, fontFamily:"var(--mono)"
                          }}>{ip}</code>
                        ))}
                      </div>}
                </div>
                {/* Logros */}
                <div style={{ background:"rgba(0,218,243,0.05)", border:"1px solid rgba(0,218,243,0.14)", borderRadius:10, padding:12 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--terciario-dim)", marginBottom:8, fontFamily:"var(--mono)", letterSpacing:"0.06em" }}>LOGROS</div>
                  {reporte.logros.map((l,i) => (
                    <div key={i} style={{ fontSize:13, color:"var(--texto-secundario)", marginBottom:4 }}>✓ {l}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal bloqueo curso */}
        {modalAbierto && (
          <div className="modal-fondo">
            <div className="modal-tarjeta">
              <div className="modal-cabecera">
                <h3 className="modal-titulo">Contenido obligatorio — Nivel {modalNivel}</h3>
                <button className="boton-secundario" onClick={() => setModalAbierto(false)}>Cerrar</button>
              </div>
              <div className="modal-cuerpo">
                <p>Debes leer el contenido del nivel antes de practicar.</p>
                <div className="progress-wrapper">
                  <div className="progress-top">
                    <span>Lectura Nivel {modalNivel}</span><strong>{modalProg}%</strong>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width:`${modalProg}%` }}/>
                  </div>
                </div>
              </div>
              <div className="modal-pie">
                <div className="modal-botones">
                  <button className="boton-secundario" onClick={() => setModalAbierto(false)}>Volver</button>
                  <button className="boton-primario"
                    onClick={() => router.push(`/dashboard/informacion?nivel=${modalNivel}`)}>
                    Ir al contenido
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Popup ejercicio finalizado ── */}
        {popupFin && (
          <div style={{
            position:"fixed", inset:0, background:"rgba(0,0,0,0.75)",
            display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999
          }}>
            <div style={{
              background:"#1c1c1e", border:`1px solid ${popupFinPct === 100 ? "rgba(0,218,243,0.30)" : "rgba(255,159,10,0.30)"}`,
              borderRadius:20, padding:"36px 40px", maxWidth:440, width:"90%",
              textAlign:"center", boxShadow:"0 20px 60px rgba(0,0,0,0.60)"
            }}>
              <div style={{ fontSize:48, marginBottom:12 }}>{popupFinPct === 100 ? "✅" : "⏱"}</div>
              <h2 style={{ color:"#f5f5f7", fontSize:22, fontWeight:800, margin:"0 0 10px" }}>
                {popupFinPct === 100 ? "Ejercicio finalizado" : "Tiempo agotado"}
              </h2>
              {/* Barra de progreso */}
              <div style={{ margin:"12px 0 16px", background:"rgba(255,255,255,0.08)", borderRadius:999, height:8, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${popupFinPct}%`, background: popupFinPct === 100 ? "var(--terciario)" : "#ff9f0a", borderRadius:999, transition:"width .5s" }}/>
              </div>
              <div style={{ fontSize:28, fontWeight:900, fontFamily:"var(--mono)", color: popupFinPct === 100 ? "var(--terciario-dim)" : "#ff9f0a", marginBottom:12 }}>
                {popupFinPct}%
              </div>
              <p style={{ color:"#8e8e93", fontSize:14, lineHeight:1.6, margin:"0 0 24px" }}>
                {popupFinPct === 100
                  ? <>Completaste todos los pasos correctamente.<br/><strong style={{ color:"var(--terciario-dim)" }}>Se notificará al docente</strong> para que califique tu ejercicio.</>
                  : <>El tiempo llegó a 0. Tu progreso de <strong style={{ color:"#ff9f0a" }}>{popupFinPct}%</strong> fue registrado.<br/><strong style={{ color:"var(--primario-dim)" }}>Se notificará al docente</strong> para que evalúe tu entrega.</>
                }
                <br/><span style={{ fontSize:12, color:"#6e6e73" }}>Podrás ver tu nota en la sección <em>Notas</em>.</span>
              </p>
              <button
                onClick={() => setPopupFin(false)}
                style={{
                  padding:"12px 32px", borderRadius:980,
                  background: popupFinPct === 100 ? "var(--terciario)" : "#ff9f0a",
                  color:"#000", fontWeight:700, fontSize:15, border:"none", cursor:"pointer"
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
