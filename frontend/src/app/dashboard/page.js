"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import BarraSuperior from "../componentes/BarraSuperior"

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
    fetch(`http://127.0.0.1:8000/mis-evaluaciones?nombre_usuario=${encodeURIComponent(nombreUsuario)}`)
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

  const progresoLectura = nid => {
    const raw  = leerLS()
    const mapa = raw?.seccionesVistas?.[`nivel${nid}`]
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
      const d = await (await fetch("http://127.0.0.1:8000/estadisticas")).json()
      setStats({
        total_eventos:     d?.total_eventos     ?? 0,
        total_alertas:     d?.total_alertas     ?? 0,
        eventos_recientes: Array.isArray(d?.eventos_recientes) ? d.eventos_recientes : [],
        alertas_recientes: Array.isArray(d?.alertas_recientes) ? d.alertas_recientes : [],
      })
    } catch { setStats(p => ({ ...p, eventos_recientes: [], alertas_recientes: [] })) }
  }

  // Carga progreso real desde backend
  const cargarProgresoDesdeBackend = async (usuario) => {
    try {
      const r2 = await fetch(`http://127.0.0.1:8000/docente/intentos?nombre_usuario_docente=${encodeURIComponent(usuario)}`)
      if (!r2.ok) return
      const d2   = await r2.json()
      const todos = Array.isArray(d2) ? d2 : (d2?.intentos || [])
      const aprobados = todos.filter(it => it.estado === "aprobado" && it.usuario === usuario)

      const r3 = await fetch("http://127.0.0.1:8000/contenido/estructura")
      if (!r3.ok) return
      const d3   = await r3.json()
      const mapEjNivel = {}  // ejercicio_id -> nivel (1-7)

      ;(d3?.cursos || []).forEach(curso => {
        curso.capitulos?.forEach((cap, ci) => {
          const niv = ci + 1
          cap.lecciones?.forEach(lec => {
            lec.ejercicios?.forEach(ej => { mapEjNivel[ej.id] = niv })
          })
        })
      })

      // Contar completados por nivel
      const conteo = { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0 }
      aprobados.forEach(it => {
        const niv = mapEjNivel[it.ejercicio_id]
        if (niv && conteo[niv] !== undefined) conteo[niv]++
      })

      setEjercicios(prev => {
        const nuevo = { ...prev }
        Object.keys(conteo).forEach(n => {
          const nNum = parseInt(n)
          const comp = Math.min(conteo[n], TOTAL_EJ)
          nuevo[nNum] = {
            actual:      Math.min(comp + 1, TOTAL_EJ),
            completados: comp,
          }
        })
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
      ? "http://127.0.0.1:8000/simular/fuerza-bruta"
      : "http://127.0.0.1:8000/simular/escaneo-puertos"
    try {
      const r = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
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
      const r = await fetch("http://127.0.0.1:8000/escenario/pedir-ayuda", {
        method: "POST", headers: { "Content-Type": "application/json" },
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
      const r = await fetch("http://127.0.0.1:8000/intentos/crear", {
        method: "POST", headers: { "Content-Type": "application/json" },
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
    if (completo) { await registrarIntento(); avanzar() }
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
      const r = await fetch("http://127.0.0.1:8000/terminal", {
        method: "POST", headers: { "Content-Type": "application/json" },
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
      const r = await fetch(`http://127.0.0.1:8000/reporte?nombre_usuario=${nombreUsuario}`)
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

  const fmt    = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
  const cTimer = tiempoRest <= 60 ? "#ef4444" : tiempoRest <= 120 ? "#f59e0b" : "#00daf3"

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">

        <BarraSuperior paginaActiva="laboratorio" />

        {/* Header */}
        <header className="hero-panel">
          <div className="hero-left">
            <div className="hero-badge">CENTRO DE OPERACIONES CYBERLAB</div>
            <h1 style={{ margin:"8px 0 4px", fontSize:22, color:"#fff", fontFamily:"var(--sans)", fontWeight:700 }}>
              Panel de Ciberseguridad
            </h1>
            <p className="hero-subtitle">
              Operador activo: <strong style={{ color:"var(--primario-dim)" }}>{nombreUsuario}</strong>
            </p>
            <div className="hero-meta">
              <span className="meta-chip">⏱ Sesión: {tiempoSes}s</span>
              <span className="meta-chip">
                Nivel {nivelActivo}: {NIVELES_EJERCICIOS[nivelActivo]?.nombre} — Ej. {ejActual}/5
              </span>
              {ayudas > 0 && (
                <span className="meta-chip meta-chip-warn">
                  ⚠ Ayudas: {ayudas} (-{Math.min(ayudas * 5, 30)}%)
                </span>
              )}
            </div>
          </div>
          <button onClick={() => {
            localStorage.removeItem("nombre_usuario"); localStorage.removeItem("rol_usuario")
            if (claveLS) localStorage.removeItem(claveLS); router.push("/")
          }} className="logout-button">Cerrar sesión</button>
        </header>

        {/* Progreso por nivel */}
        <section className="ejercicios-panel">
          <div className="ejercicios-titulo">Progreso por nivel</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:8 }}>
            {[1,2,3,4,5,6,7].map(n => {
              const ej   = ejercicios[n] || { actual:1, completados:0 }
              const desl = !nivelDesbloqueado(n)
              const activo = nivelActivo === n
              return (
                <button
                  key={n}
                  onClick={() => !desl && setNivelActivo(n)}
                  disabled={desl}
                  style={{
                    padding:"10px 6px",
                    borderRadius:10,
                    border: activo ? "1.5px solid var(--primario)" : "1px solid rgba(255,255,255,0.08)",
                    background: activo ? "rgba(0,163,255,0.12)" : desl ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
                    color: desl ? "var(--texto-apagado)" : activo ? "var(--primario-dim)" : "var(--texto-secundario)",
                    cursor: desl ? "not-allowed" : "pointer",
                    textAlign:"center", fontSize:11, fontWeight:700,
                    opacity: desl ? 0.4 : 1, transition:"all .18s",
                  }}
                >
                  <div style={{ fontSize:16, marginBottom:4 }}>
                    {desl ? "🔒" : ej.completados >= 5 ? "✅" : `N${n}`}
                  </div>
                  <div style={{ fontSize:10, marginBottom:4, fontFamily:"var(--mono)", lineHeight:1.3 }}>
                    {NIVELES_EJERCICIOS[n]?.nombre}
                  </div>
                  <div style={{ fontSize:10, color: ej.completados >= 5 ? "var(--terciario-dim)" : "var(--texto-apagado)", fontFamily:"var(--mono)" }}>
                    {ej.completados}/5 ej.
                  </div>
                  <div style={{ marginTop:5, height:3, borderRadius:999, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
                    <div style={{
                      height:"100%", borderRadius:999,
                      background: ej.completados >= 5 ? "var(--terciario)" : "var(--primario)",
                      width:`${ej.completados / 5 * 100}%`, transition:"width .4s"
                    }}/>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Objetivo del ejercicio actual */}
        <section className="learning-panel">
          <h2 style={{ margin:"0 0 14px" }}>
            Nivel {nivelActivo} — {NIVELES_EJERCICIOS[nivelActivo]?.nombre}
          </h2>
          <div className="learning-grid">
            <div className="learning-box">
              <strong style={{ color:"#fff", display:"block", marginBottom:8 }}>
                {defActual?.titulo || "Inicia una simulación"}
              </strong>
              <p style={{ marginTop:0, marginBottom:10, fontSize:13 }}>
                {defActual?.descripcion || "Selecciona un nivel y ejecuta la simulación."}
              </p>
              {defActual && (
                <ul>
                  {defActual.checklist.map((p, i) => (
                    <li key={p} style={{ fontFamily:"var(--mono)", fontSize:12 }}>
                      {i + 1}. {ETIQUETA_DESC(p)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="learning-box">
              <strong style={{ color:"#fff", display:"block", marginBottom:8 }}>Comandos disponibles en este nivel</strong>
              <ul>
                {Object.values(POOL).slice(0, 12).map(p => (
                  <li key={p.cmd}><code>{p.cmd}</code></li>
                ))}
              </ul>
            </div>
            <div className="learning-box">
              <strong style={{ color:"#fff", display:"block", marginBottom:8 }}>Contenido del nivel</strong>
              <p style={{ fontSize:13 }}>Lee el material antes de practicar para entender el contexto técnico.</p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:10 }}>
                {[1,2,3,4,5,6,7].map(n => (
                  <button
                    key={n}
                    className="boton-secundario"
                    style={{ fontSize:11, padding:"5px 10px" }}
                    onClick={() => router.push(`/dashboard/informacion?nivel=${n}`)}
                  >
                    Nivel {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Simulación */}
        <section className="action-panel">
          <h2 style={{ margin:"0 0 4px" }}>Simulación — Nivel {nivelActivo}</h2>
          <p>Cada ejercicio presenta un escenario distinto con empresa, IP y contexto únicos.</p>
          <div className="status-box">
            <span className="status-label">Estado</span>
            <span className="status-value">{mensaje || "Esperando acción del operador..."}</span>
          </div>
          <div className="attack-buttons">
            <button
              className="attack-button"
              onClick={() => {
                if (!nivelDesbloqueado(nivelActivo)) {
                  setMensaje(`Completa el Nivel ${nivelActivo - 1} primero.`); return
                }
                const p = progresoLectura(nivelActivo)
                if (p < 100) { setModalNivel(nivelActivo); setModalProg(p); setModalAbierto(true); return }
                simular()
              }}
            >
              ▶ Iniciar Ejercicio {ejActual}/5 — {NIVELES_EJERCICIOS[nivelActivo]?.nombre}
            </button>
            <button className="report-button" onClick={generarReporte}>Generar reporte</button>
          </div>
        </section>

        {/* Escenario activo */}
        <section className="mission-panel">
          <div className="panel-header">
            <h2 style={{ margin:0 }}>Escenario activo</h2>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span className="tag" style={{
                background: estadoEsc==="resuelto" ? "rgba(0,218,243,0.10)" : "rgba(0,163,255,0.10)",
                color: estadoEsc==="resuelto" ? "var(--terciario-dim)" : "var(--primario-dim)",
                border:`1px solid ${estadoEsc==="resuelto" ? "rgba(0,218,243,0.25)" : "rgba(0,163,255,0.25)"}`,
                padding:"3px 10px", borderRadius:4, fontSize:11, fontWeight:700, fontFamily:"var(--mono)"
              }}>
                {estadoEsc==="resuelto" ? "✅ RESUELTO" : "⚡ EN PROCESO"}
              </span>
              <span style={{ fontFamily:"var(--mono)", fontSize:18, fontWeight:700, color:cTimer }}>
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
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <strong style={{ color:"#fbbf24", fontSize:12 }}>
                  💡 Pista #{ayudas} — -{Math.min(ayudas * 5, 30)}% penalización
                </strong>
                <button onClick={() => setMostrarHint(false)}
                  style={{ background:"none", border:"none", color:"var(--texto-apagado)", cursor:"pointer", fontSize:16 }}>
                  ✕
                </button>
              </div>
              <p>{hint}</p>
            </div>
          )}

          <pre className="mission-text">{textoEsc}</pre>

          <div className="progress-wrapper">
            <div className="progress-top">
              <span style={{ color:"var(--texto-secundario)" }}>Progreso del ejercicio</span>
              <strong style={{ color:pct===100?"var(--terciario-dim)":"var(--primario-dim)" }}>{pct}%</strong>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{
                width:`${pct}%`,
                background: pct===100 ? "var(--terciario)" : "var(--gradiente-principal)"
              }}/>
            </div>
          </div>

          <div className="mission-progress" style={{
            gridTemplateColumns:`repeat(${Math.min(Object.keys(checklist).length, 4)}, 1fr)`
          }}>
            {Object.entries(checklist).map(([k, v]) => (
              <div key={k} className={`mission-step ${v ? "done" : ""}`}>
                {v ? "✓" : "○"} {ETIQUETA_DESC(k)}
              </div>
            ))}
          </div>
        </section>

        {/* Terminal */}
        <section className="terminal-panel">
          <div className="panel-header">
            <h2 style={{ margin:0 }}>Terminal interactiva</h2>
            <span className="tag cyan-tag">KALI MODE</span>
          </div>
          <div className="terminal-window" ref={termRef}>
            {historial.map((l, i) => (
              <div key={i} className={`terminal-line ${l.startsWith("cyberlab@kali") ? "terminal-cmd" : ""}`}>
                {l}
              </div>
            ))}
          </div>
          <form onSubmit={ejecutarComando} className="terminal-form">
            <span className="terminal-prefix">cyberlab@kali:~$</span>
            <input className="terminal-input" value={comando} onChange={e => setComando(e.target.value)}
              placeholder="Escribe un comando..." autoComplete="off" spellCheck={false}/>
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

        {/* Stats compactos — sin la lista larga de eventos/alertas */}
        <section className="panel">
          <div style={{ display:"flex", gap:20, flexWrap:"wrap", alignItems:"center" }}>
            <div style={{ display:"flex", gap:14 }}>
              <div style={{ textAlign:"center", padding:"10px 20px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12 }}>
                <div style={{ fontSize:28, fontWeight:900, color:"var(--primario-dim)" }}>{stats.total_eventos}</div>
                <div style={{ fontSize:11, color:"var(--texto-apagado)", fontFamily:"var(--mono)" }}>EVENTOS</div>
              </div>
              <div style={{ textAlign:"center", padding:"10px 20px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12 }}>
                <div style={{ fontSize:28, fontWeight:900, color:"#ffb4ab" }}>{stats.total_alertas}</div>
                <div style={{ fontSize:11, color:"var(--texto-apagado)", fontFamily:"var(--mono)" }}>ALERTAS</div>
              </div>
            </div>
            <div style={{ fontSize:12, color:"var(--texto-apagado)" }}>
              Usa <code style={{ background:"rgba(0,218,243,0.10)", color:"var(--terciario-dim)", padding:"2px 6px", borderRadius:4, fontFamily:"var(--mono)" }}>show events</code> y{" "}
              <code style={{ background:"rgba(0,218,243,0.10)", color:"var(--terciario-dim)", padding:"2px 6px", borderRadius:4, fontFamily:"var(--mono)" }}>show alerts</code>{" "}
              en la terminal para ver el detalle.
            </div>
          </div>
        </section>

        {/* Mis evaluaciones — visible solo para el estudiante */}
        

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

      </div>
    </div>
  )
}
