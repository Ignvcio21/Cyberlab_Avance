"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import GuardSesion from "../componentes/GuardSesion"
import BarraSuperior from "../componentes/BarraSuperior"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"

const NOMBRES_NIVELES = {
  1: "Fuerza Bruta — Fundamentos",
  2: "Escaneo de Puertos",
  3: "Enumeración de Servicios",
  4: "Superficie de Ataque",
  5: "Fuerza Bruta Avanzada",
  6: "Ataque Multi-Etapa",
  7: "Operación Completa",
}

// Mapeo ejercicio_id → nivel (asumiendo 5 ejercicios por nivel, ids 1-35)
const nivelDeEjercicio = (ejercicio_id) => {
  if (!ejercicio_id) return null
  return Math.ceil(ejercicio_id / 5)
}

const formatFecha = (str) => {
  if (!str) return "—"
  try {
    return new Date(str).toLocaleString("es-CL", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    })
  } catch { return str }
}

export default function PaginaNotas() {
  const router = useRouter()
  const [nombreUsuario, setNombreUsuario] = useState("")
  const [intentos,      setIntentos]      = useState([])
  const [cargando,      setCargando]      = useState(true)
  const [nivelAbierto,  setNivelAbierto]  = useState(null)
  const [ordenDesc,     setOrdenDesc]     = useState(true)

  useEffect(() => {
    const u = localStorage.getItem("nombre_usuario")
    if (!u) { router.push("/"); return }
    setNombreUsuario(u)
  }, [router])

  useEffect(() => {
    if (!nombreUsuario) return
    setCargando(true)
    fetch(`${API_URL}/mis-evaluaciones?nombre_usuario=${encodeURIComponent(nombreUsuario)}`, {
      headers: { "Authorization": `Bearer ${localStorage.getItem("token") || ""}` }
    })
      .then(r => r.json())
      .then(d => setIntentos(Array.isArray(d) ? d : (d?.intentos || [])))
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [nombreUsuario])

  // Agrupar por nivel
  const porNivel = {}
  intentos.forEach(it => {
    const n = nivelDeEjercicio(it.ejercicio_id) || 1
    if (!porNivel[n]) porNivel[n] = []
    porNivel[n].push(it)
  })

  // Promedio de notas evaluadas por nivel
  const promNivel = (lista) => {
    const eval_ = lista.filter(it => it.evaluacion?.nota != null)
    if (!eval_.length) return null
    return (eval_.reduce((s, it) => s + it.evaluacion.nota, 0) / eval_.length).toFixed(1)
  }

  // Ordenar intentos
  const ordenar = (lista) => [...lista].sort((a, b) => {
    const da = new Date(a.fecha_inicio || 0)
    const db = new Date(b.fecha_inicio || 0)
    return ordenDesc ? db - da : da - db
  })

  const niveles = Object.keys(porNivel).map(Number).sort((a, b) => a - b)

  return (
    <GuardSesion>
      <div className="dashboard-page">
        <div className="dashboard-container">

          <BarraSuperior paginaActiva="notas" />

          {/* Header */}
          <header className="hero-panel">
            <div className="hero-left">
              <div className="hero-badge">MIS EVALUACIONES — CYBERLAB</div>
              <h1 style={{ margin:"8px 0 4px", fontSize:22, color:"#fff", fontFamily:"var(--sans)", fontWeight:700 }}>
                Mis notas y retroalimentación
              </h1>
              <p className="hero-subtitle">
                Estudiante: <strong style={{ color:"var(--primario-dim)" }}>{nombreUsuario}</strong>
              </p>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <button
                onClick={() => setOrdenDesc(v => !v)}
                className="boton-secundario"
                style={{ fontSize:12 }}
              >
                {ordenDesc ? "↓ Más reciente" : "↑ Más antiguo"}
              </button>
              <button onClick={() => router.push("/dashboard")} className="logout-button">
                Volver al laboratorio
              </button>
            </div>
          </header>

          {cargando && (
            <div className="panel" style={{ textAlign:"center", padding:30, color:"var(--texto-apagado)" }}>
              Cargando evaluaciones...
            </div>
          )}

          {!cargando && intentos.length === 0 && (
            <div className="panel" style={{ textAlign:"center", padding:40 }}>
              <div style={{ fontSize:32, marginBottom:12 }}>📋</div>
              <div style={{ color:"#fff", fontWeight:700, fontSize:16, marginBottom:8 }}>
                Aún no tienes evaluaciones
              </div>
              <div style={{ color:"var(--texto-apagado)", fontSize:14 }}>
                Completa ejercicios en el laboratorio. Tu docente los evaluará y verás aquí las notas.
              </div>
            </div>
          )}

          {/* Resumen general */}
          {!cargando && intentos.length > 0 && (
            <section className="panel">
              <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                {[
                  { l:"Ejercicios realizados",   v: intentos.length },
                  { l:"Evaluados",               v: intentos.filter(it => it.evaluacion).length },
                  { l:"Con nota aprobatoria (≥4)", v: intentos.filter(it => it.evaluacion?.nota >= 4).length },
                  { l:"Niveles completados",     v: niveles.length },
                ].map(({ l, v }) => (
                  <div key={l} style={{
                    flex:1, minWidth:120, textAlign:"center",
                    padding:"14px 12px",
                    background:"rgba(255,255,255,0.04)",
                    border:"1px solid rgba(255,255,255,0.08)",
                    borderRadius:12
                  }}>
                    <div style={{ fontSize:26, fontWeight:900, color:"var(--primario-dim)" }}>{v}</div>
                    <div style={{ fontSize:11, color:"var(--texto-apagado)", fontFamily:"var(--mono)", marginTop:4 }}>{l}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Un bloque por nivel */}
          {!cargando && niveles.map(n => {
            const lista      = porNivel[n]
            const evaluados  = lista.filter(it => it.evaluacion)
            const prom       = promNivel(lista)
            const abierto    = nivelAbierto === n
            const aprobados  = lista.filter(it => it.estado === "aprobado").length

            return (
              <section key={n} className="panel" style={{ padding:0, overflow:"hidden" }}>
                {/* Cabecera del nivel — clickable */}
                <button
                  onClick={() => setNivelAbierto(abierto ? null : n)}
                  style={{
                    width:"100%", textAlign:"left", background:"none", border:"none",
                    padding:"16px 20px", cursor:"pointer",
                    display:"flex", justifyContent:"space-between", alignItems:"center", gap:12,
                    borderBottom: abierto ? "1px solid rgba(255,255,255,0.07)" : "none"
                  }}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{
                      width:40, height:40, borderRadius:10,
                      background: prom >= 4 ? "rgba(0,218,243,0.15)" : prom !== null ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${prom >= 4 ? "rgba(0,218,243,0.30)" : prom !== null ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.10)"}`,
                      display:"grid", placeItems:"center",
                      fontSize:16, fontWeight:900,
                      color: prom >= 4 ? "var(--terciario-dim)" : prom !== null ? "#ffb4ab" : "var(--texto-apagado)",
                      fontFamily:"var(--mono)"
                    }}>
                      {n}
                    </div>
                    <div>
                      <div style={{ color:"#fff", fontWeight:700, fontSize:15 }}>
                        Nivel {n} — {NOMBRES_NIVELES[n] || ""}
                      </div>
                      <div style={{ color:"var(--texto-apagado)", fontSize:12, fontFamily:"var(--mono)", marginTop:2 }}>
                        {aprobados}/{lista.length} ejercicios completados
                        {evaluados.length > 0 ? ` · ${evaluados.length} evaluados` : " · sin evaluar aún"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:14, flexShrink:0 }}>
                    {/* Promedio del nivel */}
                    {prom !== null ? (
                      <div style={{ textAlign:"center" }}>
                        <div style={{
                          fontSize:22, fontWeight:900,
                          color: prom >= 4 ? "var(--terciario-dim)" : "#ffb4ab",
                          fontFamily:"var(--mono)"
                        }}>
                          {prom}
                        </div>
                        <div style={{ fontSize:10, color:"var(--texto-apagado)" }}>promedio</div>
                      </div>
                    ) : (
                      <div style={{ fontSize:12, color:"var(--texto-apagado)", fontFamily:"var(--mono)" }}>
                        Sin nota
                      </div>
                    )}
                    {/* Barra de progreso del nivel */}
                    <div style={{ width:80 }}>
                      <div style={{ height:5, borderRadius:999, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
                        <div style={{
                          height:"100%", borderRadius:999,
                          background: aprobados === 5 ? "var(--terciario)" : "var(--primario)",
                          width:`${aprobados/5*100}%`, transition:"width .4s"
                        }}/>
                      </div>
                      <div style={{ fontSize:10, color:"var(--texto-apagado)", fontFamily:"var(--mono)", marginTop:3, textAlign:"right" }}>
                        {aprobados}/5 ej.
                      </div>
                    </div>
                    <span style={{ color:"var(--texto-apagado)", fontSize:18 }}>{abierto ? "▲" : "▼"}</span>
                  </div>
                </button>

                {/* Ejercicios desplegados */}
                {abierto && (
                  <div style={{ padding:"12px 20px 16px", display:"flex", flexDirection:"column", gap:10 }}>
                    {ordenar(lista).map(it => (
                      <div key={it.intento_id} style={{
                        background:"rgba(255,255,255,0.03)",
                        border:`1px solid ${it.evaluacion?.nota >= 4 ? "rgba(0,218,243,0.15)" : it.evaluacion ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.07)"}`,
                        borderLeft:`3px solid ${it.evaluacion?.nota >= 4 ? "var(--terciario)" : it.evaluacion ? "#ef4444" : "rgba(255,255,255,0.15)"}`,
                        borderRadius:10, padding:"12px 16px"
                      }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, marginBottom:8 }}>
                          <div>
                            <div style={{ fontSize:11, color:"var(--texto-apagado)", fontFamily:"var(--mono)" }}>
                              Ejercicio #{it.ejercicio_id}
                            </div>
                            <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>
                              {it.descripcion_ejercicio || "Ejercicio de práctica"}
                            </div>
                            <div style={{ fontSize:11, color:"var(--texto-apagado)", fontFamily:"var(--mono)", marginTop:2 }}>
                              🕐 {formatFecha(it.fecha_inicio)}
                            </div>
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            {it.evaluacion?.nota != null ? (
                              <>
                                <div style={{
                                  fontSize:26, fontWeight:900, fontFamily:"var(--mono)",
                                  color: it.evaluacion.nota >= 4 ? "var(--terciario-dim)" : "#ffb4ab"
                                }}>
                                  {it.evaluacion.nota}
                                </div>
                                <div style={{ fontSize:10, color:"var(--texto-apagado)" }}>/ 7.0</div>
                              </>
                            ) : (
                              <div style={{
                                fontSize:11, color:"var(--texto-apagado)", fontFamily:"var(--mono)",
                                background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
                                borderRadius:6, padding:"4px 8px"
                              }}>
                                Sin evaluar
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Retroalimentación */}
                        {it.evaluacion?.comentarios && (
                          <div style={{
                            background:"rgba(0,163,255,0.06)",
                            border:"1px solid rgba(0,163,255,0.14)",
                            borderRadius:8, padding:"8px 12px", fontSize:13,
                            color:"var(--texto-secundario)", lineHeight:1.65, marginBottom:8
                          }}>
                            <span style={{
                              fontSize:10, fontFamily:"var(--mono)", color:"var(--primario-dim)",
                              display:"block", marginBottom:4, letterSpacing:"0.05em"
                            }}>
                              💬 RETROALIMENTACIÓN DEL DOCENTE
                            </span>
                            {it.evaluacion.comentarios}
                          </div>
                        )}

                        {/* Métricas */}
                        <div style={{ display:"flex", flexWrap:"wrap", gap:12, fontSize:11, color:"var(--texto-apagado)", fontFamily:"var(--mono)" }}>
                          <span style={{
                            background: it.estado === "aprobado" ? "rgba(0,218,243,0.08)" : "rgba(255,255,255,0.04)",
                            border:`1px solid ${it.estado === "aprobado" ? "rgba(0,218,243,0.20)" : "rgba(255,255,255,0.08)"}`,
                            color: it.estado === "aprobado" ? "var(--terciario-dim)" : "var(--texto-apagado)",
                            padding:"2px 8px", borderRadius:4
                          }}>
                            {it.estado}
                          </span>
                          <span>📊 {it.porcentaje}%</span>
                          <span>⏱ {it.tiempo_seg}s</span>
                          {(it.ayudas_pedidas || 0) > 0 && (
                            <span style={{ color:"#fbbf24" }}>💡 {it.ayudas_pedidas} ayudas (-{Math.min(it.ayudas_pedidas*5,30)}%)</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )
          })}

        </div>
      </div>
    </GuardSesion>
  )
}