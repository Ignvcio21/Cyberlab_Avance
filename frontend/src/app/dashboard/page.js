"use client"

import { useEffect, useMemo, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import BarraSuperior from "../componentes/BarraSuperior"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"

const getAuthHeaders = () => ({
  "Authorization": `Bearer ${sessionStorage.getItem("token") || ""}`,
  "Content-Type": "application/json"
})

const SECCIONES_INFO = [
  "introduccion","objetivos","fundamentos","metodologia","comandos",
  "evidencia","procedimiento","errores","buenas_practicas","criterio"
]

const NOMBRES_NIV = {
  1: "Fundamentos", 2: "Reconocimiento", 3: "Enumeración", 4: "Explotación",
  5: "Post-explotación", 6: "Avanzado", 7: "Operación completa",
}

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

  const [nombreUsuario, setNombreUsuario] = useState("")
  const [stats,   setStats]   = useState({ total_eventos: 0, total_alertas: 0 })
  const [mensaje, setMensaje] = useState("")
  const [comando, setComando] = useState("")

  const [historial, setHistorial] = useState([
    "CyberLab Terminal — modo kali-like",
    "Escribe 'help' para ver los comandos disponibles.",
  ])

  // ── Ejercicios del docente + sesión backend ──
  const [ejerciciosDocente,   setEjerciciosDocente]   = useState([])
  const [ejDocenteActivo,     setEjDocenteActivo]     = useState(null)
  const [sesion,              setSesion]              = useState(null)
  const [timerDocente,        setTimerDocente]        = useState(0)
  const [pistaDocente,        setPistaDocente]        = useState("")
  const [mostrarPista,        setMostrarPista]        = useState(false)
  const [cargandoPista,       setCargandoPista]       = useState(false)
  const [nivelDocenteAbierto, setNivelDocenteAbierto] = useState(1)
  const [confirmEjDocente,    setConfirmEjDocente]    = useState(null)
  const [popupFin,            setPopupFin]            = useState(false)
  const [popupFinPct,         setPopupFinPct]         = useState(100)
  const [entregados,          setEntregados]          = useState(new Set())
  const [entregadosCargados,  setEntregadosCargados]  = useState(false)
  const finalizadaRef = useRef(false)
  const fasesPrevRef  = useRef([])  // fases del ataque ya anunciadas

  // ── Derivados de la sesión ──
  const sesionItems   = sesion?.items || []
  const pctDocente    = sesion?.porcentaje ?? 0
  const ayudasDocente = sesion?.ayudas ?? 0
  const sesionActiva  = sesion?.estado === "activa"

  const porNivel = useMemo(() => {
    const m = {}
    ejerciciosDocente.forEach(ej => { const n = ej.nivel || 1; if (!m[n]) m[n] = []; m[n].push(ej) })
    return m
  }, [ejerciciosDocente])

  // ── LocalStorage: solo para sincronizar lectura de contenidos ──
  const claveLS = useMemo(() => nombreUsuario ? `cyberlab_progreso_${nombreUsuario}` : null, [nombreUsuario])

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
      const token = sessionStorage.getItem("token")
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

  const cargarEntregados = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/mis-entregas-docente`, { headers: getAuthHeaders() })
      const d = await r.json()
      if (Array.isArray(d?.ejercicio_ids)) setEntregados(new Set(d.ejercicio_ids))
    } catch {}
    finally { setEntregadosCargados(true) }
  }, [])

  // ── Aplicar estado de sesión devuelto por el backend ───────────
  const aplicarSesion = useCallback((s) => {
    if (!s) return
    setSesion(s)

    // Fases del ataque en tiempo real (eventos reales del servidor)
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

    if (s.estado === "activa") {
      setTimerDocente(s.restante_seg ?? 0)
      return
    }
    if (!finalizadaRef.current) {
      finalizadaRef.current = true
      setTimerDocente(0)
      setPopupFinPct(s.porcentaje_final ?? s.porcentaje ?? 0)
      setPopupFin(true)
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
  const iniciarEjDocente = async (ej) => {
    try {
      const r = await fetch(`${API_URL}/ejercicios-docente/${ej.id}/iniciar`, {
        method: "POST", headers: getAuthHeaders(),
      })
      const d = await r.json()
      if (!r.ok) { setMensaje(d?.detail || "No se pudo iniciar el ejercicio"); return }
      finalizadaRef.current = false
      fasesPrevRef.current = []
      setEjDocenteActivo(ej)
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
  const ejecutarComando = async e => {
    e.preventDefault()
    if (!comando.trim()) return
    const cmd = comando.trim()
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
      if (sal === "__LIMPIAR__") {
        setHistorial(["CyberLab Terminal — modo kali-like","Escribe 'help' para ver los comandos."])
      } else {
        setHistorial(p => [...p, prompt, ...String(sal).split("\n")])
      }
      if (d?.sesion) aplicarSesion(d.sesion)
      await cargarStats()
    } catch {
      setHistorial(p => [...p, prompt, "Error: no se pudo conectar con la terminal."])
    }
  }

  // ── Efectos ────────────────────────────────────────────────────
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight
  }, [historial])

  useEffect(() => {
    const u = sessionStorage.getItem("nombre_usuario")
    if (!u) { router.push("/"); return }
    setNombreUsuario(u)
  }, [router])

  useEffect(() => {
    if (!nombreUsuario) return
    cargarStats()
    cargarEntregados()
    restaurarSesion()
    cargarProgresoLecturaDesdeBackend(nombreUsuario)
    fetch(`${API_URL}/ejercicios-docente/tipo/ataque`, { headers: getAuthHeaders() })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setEjerciciosDocente(d) }).catch(() => {})
    const iv = setInterval(cargarStats, 3000)
    return () => clearInterval(iv)
  }, [nombreUsuario, cargarEntregados, restaurarSesion])

  // Countdown visual — el cierre real lo decide el servidor
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
  const listaNivel      = porNivel[nivelDocenteAbierto] || []
  const entregadosNivel = listaNivel.filter(ej => entregados.has(ej.id)).length

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">

        <BarraSuperior paginaActiva="laboratorio" />

        {/* ── PAGE HEADER ── */}
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

        {/* ── Niveles de entrenamiento + ejercicios docente ── */}
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


        {/* ── EJERCICIO ACTIVO: escenario + checklist ── */}
        {ejDocenteActivo && sesionActiva && (
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
                <span style={{ color:"var(--texto-secundario)" }}>Progreso (validado por el servidor)</span>
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
            <input className="terminal-input" value={comando}
              onChange={e => { setComando(e.target.value); cmdHistIdx.current = -1 }}
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

        {/* ── Modal confirmación ejercicio docente ── */}
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
