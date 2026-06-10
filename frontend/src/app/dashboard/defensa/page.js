"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import GuardSesion from "../../componentes/GuardSesion"
import BarraSuperior from "../../componentes/BarraSuperior"
import TransicionPagina from "../../componentes/TransicionPagina"

// ================================================================
// CONSTANTES
// ================================================================
const API = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"

const getAuthHeaders = () => ({
  "Authorization": `Bearer ${sessionStorage.getItem("token") || ""}`,
  "Content-Type": "application/json"
})

const NOMBRES_NIVELES_DEF = {
  1: "Monitoreo Básico", 2: "Detección de Fuerza Bruta", 3: "Escaneo — Defensa",
  4: "Investigación de Incidentes", 5: "Respuesta Activa", 6: "Multi-vector", 7: "Defensa Integral",
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

// ================================================================
// COMPONENTE PRINCIPAL
// La fuente de verdad del ejercicio (checklist, timer, entrega)
// es la sesión que mantiene el backend — aquí solo se visualiza.
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
  const [stats,         setStats]         = useState({ total_eventos: 0, total_alertas: 0 })

  // ── Ejercicios del docente + sesión backend ──
  const [ejerciciosDocente,   setEjerciciosDocente]   = useState([])
  const [ejDocenteActivo,     setEjDocenteActivo]     = useState(null)
  const [sesion,              setSesion]              = useState(null)   // estado devuelto por el backend
  const [timerDocente,        setTimerDocente]        = useState(0)      // countdown visual, sincronizado con restante_seg
  const [pistaDocente,        setPistaDocente]        = useState("")
  const [mostrarPista,        setMostrarPista]        = useState(false)
  const [cargandoPista,       setCargandoPista]       = useState(false)
  const [nivelDocenteAbierto, setNivelDocenteAbierto] = useState(1)
  const [confirmEjDocente,    setConfirmEjDocente]    = useState(null)
  const [entregados,          setEntregados]          = useState(new Set())
  const [entregadosCargados,  setEntregadosCargados]  = useState(false)

  // ── Popup fin de ejercicio ──
  const [popupFin,    setPopupFin]    = useState(false)
  const [popupFinPct, setPopupFinPct] = useState(0)
  const [popupGano,   setPopupGano]   = useState(false)
  const finalizadaRef = useRef(false)

  // ── Ataque en tiempo real (fases reales generadas por el servidor) ──
  const [faseAtaqueDisparada, setFaseAtaqueDisparada] = useState([])
  const fasesPrevRef = useRef([])

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

  // ── Estadísticas ───────────────────────────────────────────────
  const cargarStats = async () => {
    try {
      const d = await (await fetch(`${API}/estadisticas`, {
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
      const r = await fetch(`${API}/mis-entregas-docente`, { headers: getAuthHeaders() })
      const d = await r.json()
      if (Array.isArray(d?.ejercicio_ids)) setEntregados(new Set(d.ejercicio_ids))
    } catch {}
    finally { setEntregadosCargados(true) }
  }, [])

  // ── Aplicar estado de sesión devuelto por el backend ───────────
  const aplicarSesion = useCallback((s) => {
    if (!s) return
    setSesion(s)

    // Fases del ataque en tiempo real: anunciar transiciones reales
    const fases = s.fases || []
    const prev = fasesPrevRef.current
    fases.forEach((f, i) => {
      const antes = prev[i]?.estado
      if (antes !== f.estado && f.estado !== "pendiente" && s.estado === "activa") {
        const ts = new Date().toLocaleTimeString("es-CL", { hour:"2-digit", minute:"2-digit", second:"2-digit" })
        setHistorial(h => [...h,
          "────────────────────────────────────────────",
          f.estado === "impactada"
            ? `[${ts}] 🔴 [IDS] FASE ${f.orden}/${fases.length}: el atacante intensifica su actividad — revisa journalctl`
            : `[${ts}] ✅ [FIREWALL] Fase ${f.orden}/${fases.length} neutralizada — tu bloqueo está conteniendo el ataque`,
        ])
      }
    })
    fasesPrevRef.current = fases
    setFaseAtaqueDisparada(fases.filter(f => f.estado === "impactada").map(f => (f.orden || 1) - 1))

    if (s.estado === "activa") {
      setTimerDocente(s.restante_seg ?? 0)
      return
    }
    // Sesión cerrada por el servidor (completada o expirada)
    if (!finalizadaRef.current) {
      finalizadaRef.current = true
      setTimerDocente(0)
      setFaseAtaqueDisparada([])
      setPopupFinPct(s.porcentaje_final ?? s.porcentaje ?? 0)
      setPopupGano(s.estado === "completada")
      setPopupFin(true)
      if (s.ejercicio_id) setEntregados(prev => new Set([...prev, s.ejercicio_id]))
      const lineas = [
        "────────────────────────────────────────────",
        s.estado === "completada"
          ? "🛡 [SISTEMA] EJERCICIO COMPLETADO — todos los vectores neutralizados. Entrega registrada."
          : "🔴 [SISTEMA] TIEMPO AGOTADO — el ejercicio finalizó. Tu progreso fue entregado automáticamente.",
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
      const r = await fetch(`${API}/ejercicios-docente/${ej.id}/iniciar`, {
        method: "POST", headers: getAuthHeaders(),
      })
      const d = await r.json()
      if (!r.ok) { setMensaje(d?.detail || "No se pudo iniciar el ejercicio"); return }
      finalizadaRef.current = false
      setEjDocenteActivo(ej)
      setPistaDocente(""); setMostrarPista(false)
      setFaseAtaqueDisparada([])
      fasesPrevRef.current = []
      aplicarSesion(d.sesion)
      setHistorial([
        "CyberLab SOC Terminal — Modo Defensa activa",
        `[SISTEMA] Ejercicio iniciado: ${ej.titulo}`,
        "[SISTEMA] Monitoreo en curso. El atacante está activo — responde a los eventos.",
        "[SISTEMA] Identifica la IP real del atacante en los logs: los bloqueos se validan contra el escenario.",
        ...(d.sesion?.multi_vector ? ["[SISTEMA] ⚠ Inteligencia inicial: hay MÁS DE UN actor involucrado — contener a uno solo no basta."] : []),
        "────────────────────────────────────────────",
      ])
    } catch { setMensaje("No se pudo conectar con el backend") }
  }

  // ── Restaurar sesión activa al recargar la página ──────────────
  const restaurarSesion = useCallback(async () => {
    try {
      const r = await fetch(`${API}/ejercicios-docente/sesion/activa`, { headers: getAuthHeaders() })
      const d = await r.json()
      const s = d?.sesion
      if (!s) return
      if (s.estado === "activa" && s.ejercicio && s.ejercicio.tipo === "defensa") {
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
      const r = await fetch(`${API}/ejercicios-docente/sesion/activa`, { headers: getAuthHeaders() })
      const d = await r.json()
      if (d?.sesion) { aplicarSesion(d.sesion); return }
      // El servidor ya cerró y archivó la sesión
      if (!finalizadaRef.current) {
        finalizadaRef.current = true
        setPopupFinPct(pctDocente); setPopupGano(false); setPopupFin(true)
        cargarEntregados()
      }
    } catch {}
  }, [aplicarSesion, pctDocente, cargarEntregados])

  // ── Pedir pista (el backend cuenta las ayudas) ─────────────────
  const pedirPistaDocente = async () => {
    if (!sesionActiva || cargandoPista) return
    setCargandoPista(true)
    try {
      const r = await fetch(`${API}/ejercicios-docente/sesion/pista`, {
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
      setPistaDocente("Revisa el contexto del ejercicio e identifica qué herramienta defensiva corresponde a este paso.")
      setMostrarPista(true)
    } finally { setCargandoPista(false) }
  }

  // ── Ejecutar comando (el backend valida el checklist) ──────────
  const ejecutarComando = async (e) => {
    e.preventDefault()
    if (!comando.trim()) return
    const cmd = comando.trim()
    setComando("")
    const prompt = `soc@cyberlab:~$ ${cmd}`

    try {
      const r = await fetch(`${API}/defensa/terminal`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ nombre_usuario: nombreUsuario, comando: cmd, ip_escenario: null })
      })
      const d   = await r.json()
      const sal = d?.salida ?? ""
      if (sal === "__LIMPIAR__") {
        setHistorial(["CyberLab Defensa — Modo analista SOC", "Escribe 'ayuda' para ver los comandos."])
      } else {
        setHistorial(p => [...p, prompt, ...String(sal).split("\n")])
      }
      if (d?.sesion) aplicarSesion(d.sesion)
      await cargarStats()
    } catch {
      setHistorial(p => [...p, prompt, "Error: no se pudo conectar con la terminal defensiva."])
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
    fetch(`${API}/ejercicios-docente/tipo/defensa`, { headers: getAuthHeaders() })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setEjerciciosDocente(d) }).catch(() => {})
    const iv = setInterval(cargarStats, 5000)
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

  // ── Ataque en tiempo real: sincronizar la sesión con el servidor ──
  // Las fases del ataque son eventos REALES que el backend materializa;
  // este polling hace que avancen aunque el estudiante no escriba.
  useEffect(() => {
    if (!sesionActiva) return
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`${API}/ejercicios-docente/sesion/activa`, { headers: getAuthHeaders() })
        const d = await r.json()
        if (d?.sesion) aplicarSesion(d.sesion)
      } catch {}
    }, 7000)
    return () => clearInterval(iv)
  }, [sesionActiva, aplicarSesion])

  // ================================================================
  // RENDER
  // ================================================================
  const listaNivel       = porNivel[nivelDocenteAbierto] || []
  const entregadosNivel  = listaNivel.filter(ej => entregados.has(ej.id)).length

  return (
    <GuardSesion>
      <TransicionPagina>
        <div className="dashboard-page">
          <div className="dashboard-container">

            <BarraSuperior paginaActiva="defensa" />

            {/* ── PAGE HEADER ── */}
            <header style={{ marginBottom:4, display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16 }}>
              <div>
                <h1 style={{ margin:"0 0 4px", fontSize:32, fontWeight:800, letterSpacing:"-1px", color:"#f5f5f7", lineHeight:1 }}>
                  Dashboard
                </h1>
                <p style={{ margin:0, fontSize:15, color:"#8e8e93" }}>
                  {nombreUsuario && <><strong style={{ color:"#aeaeb2" }}>{nombreUsuario}</strong> · </>}
                  🛡 Defensa SOC · {NOMBRES_NIVELES_DEF[nivelDocenteAbierto] || "Centro de Operaciones"}
                </p>
              </div>
              {mensaje && (
                <span style={{ fontSize:13, color:"#ff9f0a", background:"rgba(255,159,10,0.08)", border:"1px solid rgba(255,159,10,0.22)", padding:"6px 12px", borderRadius:8, flexShrink:0 }}>
                  {mensaje}
                </span>
              )}
            </header>

            {/* ── STATS — 3 tarjetas (verde SOC) ── */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
              {[
                { label:"EVENTOS DETECTADOS", valor: stats.total_eventos, colorClass:"blue",   sub:"eventos / eventos recientes" },
                { label:"ALERTAS ACTIVAS",    valor: stats.total_alertas, colorClass:"orange",  sub:"alertas / alertas criticas" },
                { label:"NIVEL SOC ACTIVO",   valor: `${nivelDocenteAbierto}/7`, colorClass:"green", sub:`${entregadosNivel} de ${listaNivel.length || 0} entregados` },
              ].map(({ label, valor, colorClass, sub }) => (
                <div key={label} className="stat-card-mock">
                  <div className="stat-label-mock">{label}</div>
                  <div className={`stat-value-mock ${colorClass}`}>{valor}</div>
                  <div className="stat-delta-mock">{sub}</div>
                </div>
              ))}
            </div>

            {/* ── NIVELES DEFENSA (ejercicios publicados por el docente) ── */}
            <div className="card-mock">
              <div className="card-mock-header">
                <div>
                  <div className="card-mock-title">Niveles de entrenamiento</div>
                  <div className="card-mock-subtitle">7 niveles SOC · Nivel {nivelDocenteAbierto} seleccionado</div>
                </div>
                <span className="card-mock-tag green">
                  {entregadosNivel} / {listaNivel.length || 0} entregados
                </span>
              </div>
              <div className="card-mock-body">
                <div className="levels-grid-mock">
                  {[1,2,3,4,5,6,7].map(lv => {
                    const listaLv = porNivel[lv] || []
                    const compLv  = listaLv.filter(ej => entregados.has(ej.id)).length
                    const act     = lv === nivelDocenteAbierto
                    const done    = listaLv.length > 0 && compLv >= listaLv.length
                    const pctLv   = listaLv.length ? Math.round(compLv / listaLv.length * 100) : 0
                    return (
                      <button
                        key={lv}
                        className={`level-card-mock${act?" active":done?" done":""}`}
                        style={act ? { borderColor:"#30d158", background:"rgba(48,209,88,0.12)" } :
                               done ? { borderColor:"rgba(48,209,88,0.35)", background:"rgba(48,209,88,0.08)" } : {}}
                        onClick={() => setNivelDocenteAbierto(lv)}
                      >
                        <div className="level-num-mock" style={act||done?{color:"#30d158"}:{}}>{lv}</div>
                        <div className="level-name-mock">{NOMBRES_NIVELES_DEF[lv]}</div>
                        <div className="level-progress-mock">
                          <div className="level-fill-mock" style={{ width:`${pctLv}%`, background: act||done ? "#30d158" : "#3a3a3c" }}/>
                        </div>
                      </button>
                    )
                  })}
                </div>
                {/* Ejercicios del docente */}
                {listaNivel.length > 0 && (
                  <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid #2c2c2e" }}>
                    <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color:"#8e8e93", marginBottom:10 }}>
                      EJERCICIOS DOCENTE — {NOMBRES_NIVELES_DEF[nivelDocenteAbierto]}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      {listaNivel.map(ej => {
                        const activo    = ejDocenteActivo?.id === ej.id && sesionActiva
                        const entregado = entregados.has(ej.id)
                        return (
                          <button key={ej.id} onClick={() => setConfirmEjDocente(ej)} style={{
                            textAlign:"left", padding:"11px 14px", borderRadius:10, width:"100%",
                            border: activo ? "1.5px solid #30d158" : entregado ? "1px solid rgba(48,209,88,0.30)" : "1px solid #2c2c2e",
                            background: activo ? "rgba(48,209,88,0.10)" : entregado ? "rgba(48,209,88,0.06)" : "#242426",
                            color: activo ? "#30d158" : entregado ? "#7ddf9a" : "#f5f5f7", cursor:"pointer", transition:"all 0.15s",
                            display:"flex", alignItems:"center", gap:12,
                          }}>
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:700, fontSize:13, marginBottom:2 }}>{ej.titulo}</div>
                              <div style={{ fontSize:11, color:"#8e8e93" }}>{ej.items.length} punto{ej.items.length!==1?"s":""} · {ej.tiempo_minutos} min</div>
                            </div>
                            {activo && <span style={{ fontSize:11, fontWeight:700 }}>▶ Activo</span>}
                            {!activo && entregado && <span style={{ fontSize:11, fontWeight:700, color:"#7ddf9a" }}>✓ Entregado</span>}
                            {!activo && !entregado && !entregadosCargados && <span style={{ fontSize:10, color:"#8e8e93" }}>…</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                {listaNivel.length === 0 && (
                  <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid #2c2c2e", fontSize:13, color:"#8e8e93", textAlign:"center" }}>
                    El docente aún no ha publicado ejercicios de defensa en este nivel.
                  </div>
                )}
              </div>
            </div>

            {/* ── EJERCICIO DOCENTE ACTIVO ── */}
            {ejDocenteActivo && sesionActiva && (
              <div className="exercise-card" style={{ borderColor:"rgba(48,209,88,0.35)" }}>
                {/* Header con título + timer */}
                <div className="exercise-header">
                  <div style={{ flex:1 }}>
                    <div className="exercise-title" style={{ color:"#30d158" }}>{ejDocenteActivo.titulo}</div>
                    <div className="exercise-meta">
                      🛡 Defensa SOC · Paso {sesionItems.filter(i => i.completado).length} de {sesionItems.length} · {ejDocenteActivo.tiempo_minutos} min
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
                  <span>Progreso defensivo (validado por el servidor)</span>
                  <span style={{ color: pctDocente===100?"#30d158":"var(--texto-apagado)" }}>{pctDocente}%</span>
                </div>

                {/* Checklist de pasos — grid horizontal */}
                <div style={{
                  display:"grid",
                  gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",
                  gap:10, margin:"16px 24px 0"
                }}>
                  {sesionItems.map((it, idx) => {
                    const done = it.completado
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

            {/* ── TERMINAL SOC ── */}
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
                      ? `Completaste el ejercicio al 100%. Todos los vectores de ataque fueron detenidos. La entrega quedó registrada para tu docente.`
                      : `Tiempo agotado. Progreso alcanzado: ${popupFinPct}%. Tu avance fue entregado automáticamente al docente.`}
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
                      onClick={() => { setPopupFin(false); setEjDocenteActivo(null); setSesion(null) }}
                    >
                      Continuar →
                    </button>
                    <button className="boton-secundario" onClick={() => setPopupFin(false)}>
                      Ver terminal
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Modal confirmación ejercicio docente ── */}
            {confirmEjDocente && (() => {
              const yaEntregado = entregados.has(confirmEjDocente.id)
              return (
              <div className="modal-fondo" onClick={() => setConfirmEjDocente(null)}>
                <div className="modal-tarjeta" style={{ maxWidth:480 }} onClick={e => e.stopPropagation()}>
                  <div className="modal-cabecera">
                    <h3 className="modal-titulo">{yaEntregado ? "📋 Ejercicio entregado" : "🛡 ¿Iniciar ejercicio?"}</h3>
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
                    {yaEntregado ? (
                      <div style={{ padding:"14px 18px", background:"rgba(48,209,88,0.08)", border:"1px solid rgba(48,209,88,0.25)", borderRadius:10, fontSize:13, color:"#7ddf9a", fontWeight:600 }}>
                        ✅ Ya completaste y entregaste este ejercicio. Tu docente lo calificará pronto.
                      </div>
                    ) : (
                      <>
                        <p style={{ margin:0, fontSize:13, color:"#8e8e93", lineHeight:1.6, background:"rgba(255,159,10,0.06)", border:"1px solid rgba(255,159,10,0.18)", borderRadius:10, padding:"10px 14px" }}>
                          ⚠ Una vez que confirmes, el temporizador comenzará inmediatamente y solo puedes entregar una vez. El progreso lo valida el servidor.
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
                      </>
                    )}
                  </div>
                </div>
              </div>
              )
            })()}

          </div>
        </div>
      </TransicionPagina>
    </GuardSesion>
  )
}
