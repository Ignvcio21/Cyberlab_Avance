"use client"

// =============================================================================
// PÁGINA: /dashboard — Laboratorio de ataque (terminal interactiva)
// -----------------------------------------------------------------------------
// Es el corazón práctico de la plataforma para ejercicios de ATAQUE. El
// estudiante elige un ejercicio publicado por el docente, el backend crea una
// "sesión" (la fuente de verdad) y desde aquí el estudiante:
//   • lee el escenario y el checklist de pasos,
//   • escribe comandos en una terminal estilo Kali (el backend valida cada paso),
//   • puede pedir pistas (penalizan el porcentaje),
//   • ve un temporizador y, al terminar, un popup con su resultado y feedback.
// IMPORTANTE: el checklist, el timer y la entrega los gestiona el backend; este
// componente solo visualiza y sincroniza el estado de la sesión.
// =============================================================================

import { useEffect, useMemo, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import BarraSuperior from "../componentes/BarraSuperior"
import FeedbackCierre from "../componentes/FeedbackCierre" // panel de orientación automática al cerrar

// URL base del backend (variable de entorno o servidor de producción).
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"

// Cabeceras HTTP con el token de sesión, usadas en todas las peticiones autenticadas.
const getAuthHeaders = () => ({
  "Authorization": `Bearer ${sessionStorage.getItem("token") || ""}`,
  "Content-Type": "application/json"
})

// Las 10 secciones teóricas que componen cada nivel (se usan para mapear el
// progreso de lectura traído del backend).
const SECCIONES_INFO = [
  "introduccion","objetivos","fundamentos","metodologia","comandos",
  "evidencia","procedimiento","errores","buenas_practicas","criterio"
]

// Nombres legibles de los 7 niveles del semestre.
const NOMBRES_NIV = {
  1: "Fundamentos", 2: "Reconocimiento", 3: "Enumeración", 4: "Explotación",
  5: "Post-explotación", 6: "Avanzado", 7: "Operación completa",
}

// Convierte segundos a formato "m:ss" para el temporizador (ej: 125 → "2:05").
const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

// ================================================================
// COMPONENTE PRINCIPAL
// La fuente de verdad del ejercicio (checklist, timer, entrega)
// es la sesión que mantiene el backend — aquí solo se visualiza.
// ================================================================
export default function Dashboard() {
  const router  = useRouter()
  const termRef = useRef(null)

  // Historial de comandos (↑↓ como bash)
  const cmdHistRef   = useRef([])
  const cmdHistIdx   = useRef(-1)
  const cmdBorrador  = useRef("")

  const [nombreUsuario, setNombreUsuario] = useState("")  // usuario en sesión
  const [stats,   setStats]   = useState({ total_eventos: 0, total_alertas: 0 }) // contadores de la cabecera
  const [mensaje, setMensaje] = useState("")  // mensaje de error/aviso
  const [comando, setComando] = useState("")  // texto actual del input de la terminal

  // Líneas mostradas en la terminal (se va agregando salida con cada comando).
  const [historial, setHistorial] = useState([
    "CyberLab Terminal — modo kali-like",
    "Escribe 'help' para ver los comandos disponibles.",
  ])

  // ── Ejercicios del docente + sesión backend ──
  const [ejerciciosDocente,   setEjerciciosDocente]   = useState([])    // ejercicios de ataque publicados
  const [ejDocenteActivo,     setEjDocenteActivo]     = useState(null)  // ejercicio en curso
  const [sesion,              setSesion]              = useState(null)  // estado de la sesión (checklist, %, etc.)
  const [timerDocente,        setTimerDocente]        = useState(0)     // segundos restantes (countdown visual)
  const [pistaDocente,        setPistaDocente]        = useState("")    // texto de la pista actual
  const [mostrarPista,        setMostrarPista]        = useState(false) // mostrar/ocultar la caja de pista
  const [cargandoPista,       setCargandoPista]       = useState(false) // pidiendo pista al backend
  const [nivelDocenteAbierto, setNivelDocenteAbierto] = useState(1)     // nivel seleccionado en la grilla
  const [confirmEjDocente,    setConfirmEjDocente]    = useState(null)  // ejercicio pendiente de confirmar en el modal
  const [popupFin,            setPopupFin]            = useState(false) // mostrar popup de fin de ejercicio
  const [popupFinPct,         setPopupFinPct]         = useState(100)   // porcentaje final mostrado en el popup
  const [entregados,          setEntregados]          = useState(new Set()) // ids de ejercicios ya entregados
  const [entregadosCargados,  setEntregadosCargados]  = useState(false) // ya se cargó la lista de entregados
  const finalizadaRef = useRef(false) // evita disparar el cierre del ejercicio más de una vez
  const fasesPrevRef  = useRef([])  // fases del ataque ya anunciadas

  // ── Feedback automático de cierre (orientación para el estudiante) ──
  const [feedback,        setFeedback]        = useState(null)   // { texto, fuente }
  const [feedbackCargando, setFeedbackCargando] = useState(false)

  // Pide al backend la orientación automática de cierre para un ejercicio.
  const cargarFeedback = async (ejId) => {
    if (!ejId) return
    setFeedback(null); setFeedbackCargando(true)
    try {
      const r = await fetch(`${API_URL}/ejercicios-docente/${ejId}/mi-feedback`, { headers: getAuthHeaders() })
      if (r.ok) setFeedback(await r.json())
    } catch {}
    finally { setFeedbackCargando(false) }
  }

  // ── Derivados de la sesión ──  (valores calculados a partir del estado de sesión)
  const sesionItems   = sesion?.items || []          // pasos del checklist
  const pctDocente    = sesion?.porcentaje ?? 0      // porcentaje completado
  const ayudasDocente = sesion?.ayudas ?? 0          // nº de pistas pedidas
  const sesionActiva  = sesion?.estado === "activa"  // ¿la sesión sigue en curso?

  // Layout responsivo: escenario + terminal lado a lado (50/50) en pantallas anchas; apilado en chicas
  const [anchoVentana, setAnchoVentana] = useState(1400)
  const [altoVentana, setAltoVentana]   = useState(900)
  useEffect(() => {
    const fn = () => { setAnchoVentana(window.innerWidth); setAltoVentana(window.innerHeight) }
    fn()
    window.addEventListener("resize", fn)
    return () => window.removeEventListener("resize", fn)
  }, [])
  // ¿Mostrar escenario y terminal lado a lado? Solo con ejercicio activo y pantalla ancha.
  const ladoALado = !!(ejDocenteActivo && sesionActiva && anchoVentana > 980)
  // Alto máximo de cada columna: que ambas quepan en pantalla con scroll interno
  const altoPanel = Math.max(440, altoVentana - 180)

  // Agrupa los ejercicios del docente por nivel: { nivel: [ejercicios...] }.
  const porNivel = useMemo(() => {
    const m = {}
    ejerciciosDocente.forEach(ej => { const n = ej.nivel || 1; if (!m[n]) m[n] = []; m[n].push(ej) })
    return m
  }, [ejerciciosDocente])

  // ── LocalStorage: solo para sincronizar lectura de contenidos ──
  // Clave única por usuario donde se guarda qué secciones teóricas ya leyó.
  const claveLS = useMemo(() => nombreUsuario ? `cyberlab_progreso_${nombreUsuario}` : null, [nombreUsuario])

  // Lee el objeto de progreso de lectura desde localStorage.
  const leerLS = () => {
    if (!claveLS) return null
    try { return JSON.parse(localStorage.getItem(claveLS) || "null") } catch { return null }
  }
  // Mezcla y guarda datos en el objeto de progreso de localStorage.
  const guardarLS = data => {
    if (!claveLS) return
    localStorage.setItem(claveLS, JSON.stringify({ ...(leerLS() || {}), ...data }))
  }

  // Trae del backend qué secciones teóricas leyó el usuario y las refleja en localStorage.
  const cargarProgresoLecturaDesdeBackend = async (usuario) => {
    try {
      const token = sessionStorage.getItem("token")
      const r = await fetch(
        `${API_URL}/progreso/${encodeURIComponent(usuario)}`,
        { headers: { "Authorization": `Bearer ${token}` } }
      )
      if (!r.ok) return
      const d = await r.json()
      const registros = Array.isArray(d.progreso) ? d.progreso : []

      // Inicializa el mapa con todas las secciones de los 7 niveles en false.
      const nuevoMapa = {}
      for (let n = 1; n <= 7; n++) {
        nuevoMapa[`ataque_nivel${n}`] = {}
        for (const s of SECCIONES_INFO) nuevoMapa[`ataque_nivel${n}`][s] = false
      }
      // Por cada lección completada, calcula a qué nivel y sección corresponde y la marca true.
      registros.forEach(reg => {
        if (reg.porcentaje >= 100 || reg.completado) {
          const idx    = reg.leccion_id - 1
          const niv    = Math.floor(idx / SECCIONES_INFO.length) + 1   // nivel = bloque de 10 secciones
          const secIdx = idx % SECCIONES_INFO.length                   // sección dentro del nivel
          const sec    = SECCIONES_INFO[secIdx]
          if (niv >= 1 && niv <= 7 && sec) nuevoMapa[`ataque_nivel${niv}`][sec] = true
        }
      })
      guardarLS({ seccionesVistas: nuevoMapa })
    } catch (e) {
      console.warn("No se pudo cargar progreso de lectura:", e)
    }
  }

  // Trae del backend los contadores globales (eventos y alertas) de la cabecera.
  const cargarStats = async () => {
    try {
      const d = await (await fetch(`${API_URL}/estadisticas`, {
        headers: { "Authorization": `Bearer ${sessionStorage.getItem("token") || ""}` }
      })).json()
      setStats({
        total_eventos: d?.total_eventos ?? 0,
        total_alertas: d?.total_alertas ?? 0,
      })
    } catch {}
  }

  // Trae los ids de los ejercicios que el usuario ya entregó (para marcarlos en la lista).
  const cargarEntregados = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/mis-entregas-docente`, { headers: getAuthHeaders() })
      const d = await r.json()
      if (Array.isArray(d?.ejercicio_ids)) setEntregados(new Set(d.ejercicio_ids))
    } catch {}
    finally { setEntregadosCargados(true) }
  }, [])

  // ── Aplicar estado de sesión devuelto por el backend ───────────
  // Recibe el estado de sesión del backend y actualiza la UI: anuncia nuevas
  // fases del ataque en la terminal, sincroniza el timer y, si terminó, dispara
  // el popup de cierre y el feedback. Es el punto central de sincronización.
  const aplicarSesion = useCallback((s) => {
    if (!s) return
    setSesion(s)

    // Fases del ataque en tiempo real (eventos reales del servidor)
    // Compara con las fases anunciadas antes; si una cambió de estado, lo informa en la terminal.
    const fases = s.fases || []
    const prev = fasesPrevRef.current
    fases.forEach((f, i) => {
      const antes = prev[i]?.estado
      if (antes !== f.estado && f.estado !== "pendiente" && s.estado === "activa") {
        const ts = new Date().toLocaleTimeString("es-CL", { hour:"2-digit", minute:"2-digit", second:"2-digit" })
        setHistorial(h => [...h,
          "────────────────────────────────────────────",
          f.estado === "impactada"
            ? `[${ts}] 🔴 [IDS] FASE ${f.orden}/${fases.length}: nueva actividad detectada en el laboratorio — revisa show events`
            : `[${ts}] ✅ [FIREWALL] Fase ${f.orden}/${fases.length} contenida — tu bloqueo está funcionando`,
        ])
      }
    })
    fasesPrevRef.current = fases

    // Si sigue activa, solo actualiza el contador con el tiempo restante real del servidor.
    if (s.estado === "activa") {
      setTimerDocente(s.restante_seg ?? 0)
      return
    }
    // La sesión terminó: se ejecuta una sola vez (guardada con finalizadaRef).
    if (!finalizadaRef.current) {
      finalizadaRef.current = true
      setTimerDocente(0)
      setPopupFinPct(s.porcentaje_final ?? s.porcentaje ?? 0)
      setPopupFin(true)
      cargarFeedback(s.ejercicio_id)
      if (s.ejercicio_id) setEntregados(prev => new Set([...prev, s.ejercicio_id]))
      const lineas = [
        "────────────────────────────────────────────",
        s.estado === "completada"
          ? "✅ [SISTEMA] EJERCICIO COMPLETADO — entrega registrada para el docente."
          : "⏱ [SISTEMA] TIEMPO AGOTADO — tu progreso fue entregado automáticamente.",
      ]
      if ((s.penalizacion ?? 0) > 0) {
        lineas.push(`   Checklist: ${s.porcentaje}% — Penalización por ${s.ayudas} ayuda(s): -${s.penalizacion}% → Resultado: ${s.porcentaje_final}%`)
      }
      setHistorial(prev => [...prev, ...lineas])
    }
  }, [])

  // ── Iniciar ejercicio (el backend crea la sesión) ──────────────
  // Inicia un ejercicio: pide al backend crear la sesión y prepara la terminal.
  const iniciarEjDocente = async (ej) => {
    // Guarda: si este ejercicio ya está activo, no reiniciar (evita reset del temporizador)
    if (sesionActiva && ejDocenteActivo?.id === ej.id) return
    try {
      const r = await fetch(`${API_URL}/ejercicios-docente/${ej.id}/iniciar`, {
        method: "POST", headers: getAuthHeaders(),
      })
      const d = await r.json()
      if (!r.ok) { setMensaje(d?.detail || "No se pudo iniciar el ejercicio"); return }
      finalizadaRef.current = false
      fasesPrevRef.current = []
      setEjDocenteActivo(ej)
      setFeedback(null)
      setPistaDocente(""); setMostrarPista(false)
      aplicarSesion(d.sesion)
      setHistorial([
        "CyberLab Terminal — modo kali-like",
        `Ejercicio iniciado: ${ej.titulo}`,
        "Usa la terminal para explorar. Los puntos se completan automáticamente al ejecutar los comandos correctos.",
        "Investiga el laboratorio: los pasos con IP se validan contra la IP real del escenario.",
        ...(d.sesion?.multi_vector ? ["⚠ Reconocimiento inicial: hay MÁS DE UN host objetivo — audita todos para completar."] : []),
      ])
    } catch { setMensaje("No se pudo conectar con el backend") }
  }

  // ── Restaurar sesión activa al recargar la página ──────────────
  const restaurarSesion = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/ejercicios-docente/sesion/activa`, { headers: getAuthHeaders() })
      const d = await r.json()
      const s = d?.sesion
      if (!s) return
      if (s.estado === "activa" && s.ejercicio && s.ejercicio.tipo === "ataque") {
        finalizadaRef.current = false
        setEjDocenteActivo(s.ejercicio)
        setNivelDocenteAbierto(s.ejercicio.nivel || 1)
        aplicarSesion(s)
        setHistorial(prev => [...prev, `[SISTEMA] Sesión restaurada: ${s.ejercicio.titulo} — ${fmt(s.restante_seg)} restantes.`])
      }
    } catch {}
  }, [aplicarSesion])

  // ── Confirmar expiración con el servidor ───────────────────────
  const confirmarExpiracion = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/ejercicios-docente/sesion/activa`, { headers: getAuthHeaders() })
      const d = await r.json()
      if (d?.sesion) { aplicarSesion(d.sesion); return }
      if (!finalizadaRef.current) {
        finalizadaRef.current = true
        setPopupFinPct(pctDocente); setPopupFin(true)
        cargarEntregados()
      }
    } catch {}
  }, [aplicarSesion, pctDocente, cargarEntregados])

  // ── Pedir pista (el backend cuenta las ayudas) ─────────────────
  const pedirPistaDocente = async () => {
    if (!sesionActiva || cargandoPista) return
    setCargandoPista(true)
    try {
      const r = await fetch(`${API_URL}/ejercicios-docente/sesion/pista`, {
        method: "POST", headers: getAuthHeaders(),
      })
      const d = await r.json()
      if (r.ok) {
        setPistaDocente(d?.pista || "Analiza el contexto del ejercicio.")
        setMostrarPista(true)
        setSesion(prev => prev ? { ...prev, ayudas: d?.ayudas ?? prev.ayudas } : prev)
      } else {
        setMensaje(d?.detail || "No se pudo obtener la pista")
      }
    } catch {
      setPistaDocente("Revisa el contexto del ejercicio e identifica qué herramienta de Kali Linux corresponde a este paso.")
      setMostrarPista(true)
    } finally { setCargandoPista(false) }
  }

  // ── Ejecutar comando (el backend valida el checklist) ──────────
  // Envía el comando escrito a la terminal del backend, muestra su salida y
  // sincroniza la sesión (que puede haber marcado pasos como completados).
  const ejecutarComando = async e => {
    e.preventDefault()
    if (!comando.trim()) return
    const cmd = comando.trim()
    // Guarda el comando en el historial (↑↓) si no es igual al último.
    if (cmd && cmdHistRef.current[cmdHistRef.current.length - 1] !== cmd) {
      cmdHistRef.current.push(cmd)
    }
    cmdHistIdx.current = -1
    cmdBorrador.current = ""
    setComando("")
    const prompt = `cyberlab@kali:~$ ${cmd}`
    try {
      const r = await fetch(`${API_URL}/terminal`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ nombre_usuario: nombreUsuario, comando: cmd })
      })
      const d   = await r.json()
      const sal = d?.salida ?? ""
      // "__LIMPIAR__" es la señal especial del comando "clear": resetea la terminal.
      if (sal === "__LIMPIAR__") {
        setHistorial(["CyberLab Terminal — modo kali-like","Escribe 'help' para ver los comandos."])
      } else {
        // Agrega el prompt ejecutado y cada línea de la salida.
        setHistorial(p => [...p, prompt, ...String(sal).split("\n")])
      }
      if (d?.sesion) aplicarSesion(d.sesion) // el comando pudo completar pasos del checklist
      await cargarStats()
    } catch {
      setHistorial(p => [...p, prompt, "Error: no se pudo conectar con la terminal."])
    }
  }

  // ── Efectos ────────────────────────────────────────────────────
  // Auto-scroll: mantiene la terminal pegada abajo cada vez que llega salida nueva.
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight
  }, [historial])

  // Al montar: verifica que haya sesión iniciada; si no, vuelve al login.
  useEffect(() => {
    const u = sessionStorage.getItem("nombre_usuario")
    if (!u) { router.push("/"); return }
    setNombreUsuario(u)
  }, [router])

  // Carga inicial de datos cuando se conoce el usuario, y refresco de stats cada 3s.
  useEffect(() => {
    if (!nombreUsuario) return
    cargarStats()
    cargarEntregados()
    restaurarSesion()                              // recupera una sesión activa si recargó
    cargarProgresoLecturaDesdeBackend(nombreUsuario)
    // Carga los ejercicios de ataque publicados por el docente.
    fetch(`${API_URL}/ejercicios-docente/tipo/ataque`, { headers: getAuthHeaders() })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setEjerciciosDocente(d) }).catch(() => {})
    const iv = setInterval(cargarStats, 3000)
    return () => clearInterval(iv)
  }, [nombreUsuario, cargarEntregados, restaurarSesion])

  // Countdown visual — el cierre real lo decide el servidor
  // Resta 1s cada segundo; al llegar a 0 confirma la expiración con el servidor.
  useEffect(() => {
    if (!sesionActiva || !ejDocenteActivo) return
    const iv = setInterval(() => {
      setTimerDocente(p => {
        if (p <= 1) {
          clearInterval(iv)
          confirmarExpiracion()
          return 0
        }
        return p - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [sesionActiva, ejDocenteActivo, confirmarExpiracion])

  // Sincronizar la sesión con el servidor: las fases del ataque avanzan
  // aunque el estudiante no escriba en la terminal
  useEffect(() => {
    if (!sesionActiva) return
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`${API_URL}/ejercicios-docente/sesion/activa`, { headers: getAuthHeaders() })
        const d = await r.json()
        if (d?.sesion) aplicarSesion(d.sesion)
      } catch {}
    }, 7000)
    return () => clearInterval(iv)
  }, [sesionActiva, aplicarSesion])

  // ================================================================
  // RENDER
  // ================================================================
  const listaNivel      = porNivel[nivelDocenteAbierto] || []                       // ejercicios del nivel abierto
  const entregadosNivel = listaNivel.filter(ej => entregados.has(ej.id)).length     // cuántos ya entregó en ese nivel

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">

        <BarraSuperior paginaActiva="laboratorio" />

        {/* ── PAGE HEADER ──  Título, usuario y tipo/nivel activo; muestra el mensaje de error si hay */}
        <header style={{ marginBottom: 4, display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16 }}>
          <div>
            <h1 style={{ margin:"0 0 4px", fontSize:32, fontWeight:800, letterSpacing:"-1px", color:"#f5f5f7", lineHeight:1 }}>
              Dashboard
            </h1>
            <p style={{ margin:0, fontSize:15, color:"#8e8e93" }}>
              {nombreUsuario && <><strong style={{ color:"#aeaeb2" }}>{nombreUsuario}</strong> · </>}
              ⚔ Ataque · {NOMBRES_NIV[nivelDocenteAbierto]} · Semana activa
            </p>
          </div>
          {mensaje && (
            <span style={{ fontSize:13, color:"#ff9f0a", background:"rgba(255,159,10,0.08)", border:"1px solid rgba(255,159,10,0.22)", padding:"6px 12px", borderRadius:8, flexShrink:0 }}>
              {mensaje}
            </span>
          )}
        </header>

        {/* ── STATS — 3 tarjetas ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          {[
            { label:"EVENTOS DETECTADOS", valor: stats.total_eventos, colorClass:"blue",   sub:"show events" },
            { label:"ALERTAS ACTIVAS",    valor: stats.total_alertas, colorClass:"orange",  sub:"show alerts" },
            { label:"NIVEL ACTIVO",       valor: `${nivelDocenteAbierto}/7`,  colorClass:"green", sub:`${entregadosNivel} de ${listaNivel.length || 0} entregados` },
          ].map(({ label, valor, colorClass, sub }) => (
            <div key={label} className="stat-card-mock">
              <div className="stat-label-mock">{label}</div>
              <div className={`stat-value-mock ${colorClass}`}>{valor}</div>
              <div className="stat-delta-mock">{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Niveles de entrenamiento + ejercicios docente ──  Grilla de 7 niveles;
            al elegir uno se listan sus ejercicios de ataque publicados. */}
        <div className="card-mock">
          {/* Card header */}
          <div className="card-mock-header">
            <div>
              <div className="card-mock-title">Niveles de entrenamiento</div>
              <div className="card-mock-subtitle">7 niveles · Nivel {nivelDocenteAbierto} seleccionado</div>
            </div>
            <span className="card-mock-tag">
              {entregadosNivel} / {listaNivel.length || 0} entregados
            </span>
          </div>
          {/* Levels grid */}
          <div className="card-mock-body">
            <div className="levels-grid-mock">
              {[1,2,3,4,5,6,7].map(lv => {
                const listaLv = porNivel[lv] || []
                const compLv  = listaLv.filter(ej => entregados.has(ej.id)).length
                const activo  = lv === nivelDocenteAbierto
                const done    = listaLv.length > 0 && compLv >= listaLv.length
                const pct     = listaLv.length ? Math.round(compLv / listaLv.length * 100) : 0
                return (
                  <button
                    key={lv}
                    className={`level-card-mock${activo ? " active" : done ? " done" : ""}`}
                    onClick={() => setNivelDocenteAbierto(lv)}
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
                EJERCICIOS DOCENTE — {NOMBRES_NIV[nivelDocenteAbierto]}
              </div>
              {listaNivel.length === 0 ? (
                <div style={{ fontSize:13, color:"#8e8e93", textAlign:"center", padding:"10px 0" }}>
                  El docente aún no ha publicado ejercicios de ataque en este nivel.
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {listaNivel.map(ej => {
                    const activo    = ejDocenteActivo?.id === ej.id && sesionActiva
                    const entregado = entregados.has(ej.id)
                    return (
                      <button key={ej.id} onClick={() => { if (!activo) setConfirmEjDocente(ej) }} style={{
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


        {/* ── ESCENARIO + TERMINAL lado a lado (mitad y mitad cuando hay ejercicio activo) ── */}
        <div style={ladoALado ? { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, alignItems:"stretch" } : undefined}>

        {/* Escenario + checklist: contexto del ejercicio, barra de progreso, lista
            de pasos (se marcan al ejecutar el comando correcto) y botón de pista. */}
        {ejDocenteActivo && sesionActiva && (
          <section className="mission-panel" style={ladoALado ? { maxHeight: altoPanel, overflowY: "auto" } : undefined}>
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
                <span style={{ color:"var(--texto-secundario)" }}>Progreso (validado por el servidor)</span>
                <strong style={{ color: pctDocente === 100 ? "var(--terciario-dim)" : "var(--primario-dim)" }}>{pctDocente}%</strong>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width:`${pctDocente}%`, background: pctDocente === 100 ? "var(--terciario)" : "var(--gradiente-principal)" }}/>
              </div>
            </div>
            <div style={{
              display:"grid",
              gridTemplateColumns: ladoALado ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))",
              gap:10, marginTop:16
            }}>
              {sesionItems.map((it, idx) => {
                const done = it.completado
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
          </section>
        )}

        {/* Terminal: emulador estilo Kali. Muestra el historial de comandos/salida
            y un input que envía cada comando al backend (con historial ↑↓ tipo bash). */}
        <section style={{ background:"#0d1117", border:"1px solid rgba(57,211,83,0.18)", borderRadius:18, overflow:"hidden", boxShadow:"0 8px 40px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.04)", display: ladoALado ? "flex" : undefined, flexDirection: ladoALado ? "column" : undefined }}>
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
          <div className="terminal-window" ref={termRef} style={{ borderRadius:0, borderLeft:"none", borderRight:"none", borderTop:"none", flex: ladoALado ? 1 : undefined, height: ladoALado ? "auto" : undefined, maxHeight: ladoALado ? "none" : undefined, minHeight: ladoALado ? 0 : undefined }}>
            {historial.map((l, i) => (
              <div key={i} className={`terminal-line ${l.startsWith("cyberlab@kali") ? "terminal-cmd" : ""}`}>
                {l}
              </div>
            ))}
          </div>
          <form onSubmit={ejecutarComando} className="terminal-form" style={{ margin:"0 0 0", borderRadius:"0 0 18px 18px", borderLeft:"none", borderRight:"none", borderBottom:"none", borderTop:"1px solid rgba(57,211,83,0.14)" }}>
            <span className="terminal-prefix">cyberlab@kali:~$</span>
            <input className="terminal-input" value={comando}
              onChange={e => { setComando(e.target.value); cmdHistIdx.current = -1 }}
              // Navegación por el historial de comandos con las flechas ↑ (anteriores) y ↓ (siguientes).
              onKeyDown={e => {
                const hist = cmdHistRef.current
                if (e.key === "ArrowUp") {
                  e.preventDefault()
                  if (!hist.length) return
                  if (cmdHistIdx.current === -1) cmdBorrador.current = comando
                  const next = Math.min(cmdHistIdx.current + 1, hist.length - 1)
                  cmdHistIdx.current = next
                  setComando(hist[hist.length - 1 - next] ?? "")
                } else if (e.key === "ArrowDown") {
                  e.preventDefault()
                  if (cmdHistIdx.current <= 0) {
                    cmdHistIdx.current = -1
                    setComando(cmdBorrador.current)
                  } else {
                    cmdHistIdx.current -= 1
                    setComando(hist[hist.length - 1 - cmdHistIdx.current] ?? "")
                  }
                }
              }}
              placeholder="Escribe un comando..." autoComplete="off" spellCheck={false}
              style={{ color:"#c9d1d9", caretColor:"#39d353" }}/>
          </form>
        </section>

        </div>

        {/* ── Modal confirmación ejercicio docente ──  Antes de iniciar, muestra
            los datos del ejercicio y advierte que el timer arranca y solo se
            entrega una vez. Si ya fue entregado, muestra un aviso en su lugar. */}
        {confirmEjDocente && (() => {
          const yaEntregado = entregados.has(confirmEjDocente.id)
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
                      ⚠ Una vez que confirmes, el temporizador comenzará inmediatamente y solo puedes entregar una vez. El progreso lo valida el servidor.
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

        {/* ── Popup ejercicio finalizado ──  Aparece al completar el checklist o
            agotarse el tiempo: muestra el porcentaje final, mensaje según el caso
            y la orientación automática de cierre (<FeedbackCierre>). */}
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

              {/* Orientación automática de cierre (para el estudiante) */}
              <FeedbackCierre cargando={feedbackCargando} feedback={feedback} items={sesion?.items || []} />

              <button
                onClick={() => { setPopupFin(false); setEjDocenteActivo(null); setSesion(null) }}
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
