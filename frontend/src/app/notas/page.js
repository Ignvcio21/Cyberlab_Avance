"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import GuardSesion from "../componentes/GuardSesion"
import BarraSuperior from "../componentes/BarraSuperior"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"

const NOMBRES_NIVELES = {
  ataque: {
    1: "Fundamentos", 2: "Reconocimiento", 3: "Enumeración", 4: "Explotación",
    5: "Post-explotación", 6: "Avanzado", 7: "Operación completa",
  },
  defensa: {
    1: "Monitoreo Básico", 2: "Detección de Fuerza Bruta", 3: "Escaneo — Defensa",
    4: "Investigación de Incidentes", 5: "Respuesta Activa", 6: "Multi-vector", 7: "Defensa Integral",
  },
}

// Nombres del sistema histórico de intentos (solo para datos antiguos)
const NOMBRES_NIVELES_HIST = {
  1: "Fuerza Bruta — Fundamentos", 2: "Escaneo de Puertos", 3: "Enumeración de Servicios",
  4: "Superficie de Ataque", 5: "Fuerza Bruta Avanzada", 6: "Ataque Multi-Etapa", 7: "Operación Completa",
}
const nivelDeEjercicio = (ejercicio_id) => ejercicio_id ? Math.ceil(ejercicio_id / 5) : null

const formatFecha = (str) => {
  if (!str) return "—"
  try {
    return new Date(str).toLocaleString("es-CL", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    })
  } catch { return str }
}

// Extrae el porcentaje final del resumen generado por el servidor
const pctDeRespuesta = (respuesta) => {
  const m = /Resultado:\s*(\d+)%/.exec(respuesta || "")
  return m ? Number(m[1]) : null
}

export default function PaginaNotas() {
  const router = useRouter()
  const [nombreUsuario, setNombreUsuario] = useState("")
  const [entregas,      setEntregas]      = useState([])
  const [intentos,      setIntentos]      = useState([])   // histórico
  const [cargando,      setCargando]      = useState(true)
  const [verHistorial,  setVerHistorial]  = useState(false)
  const [nivelAbierto,  setNivelAbierto]  = useState(null)
  const [ordenDesc,     setOrdenDesc]     = useState(true)

  useEffect(() => {
    const u = sessionStorage.getItem("nombre_usuario")
    if (!u) { router.push("/"); return }
    setNombreUsuario(u)
  }, [router])

  useEffect(() => {
    if (!nombreUsuario) return
    setCargando(true)
    const headers = { "Authorization": `Bearer ${sessionStorage.getItem("token") || ""}` }
    Promise.all([
      fetch(`${API_URL}/ejercicios-docente/mis-entregas/todas`, { headers })
        .then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/mis-evaluaciones?nombre_usuario=${encodeURIComponent(nombreUsuario)}`, { headers })
        .then(r => r.json()).catch(() => null),
    ]).then(([ent, hist]) => {
      setEntregas(Array.isArray(ent) ? ent : [])
      setIntentos(Array.isArray(hist) ? hist : (hist?.intentos || []))
    }).finally(() => setCargando(false))
  }, [nombreUsuario])

  const ordenar = (lista, campoFecha) => [...lista].sort((a, b) => {
    const da = new Date(a[campoFecha] || 0)
    const db = new Date(b[campoFecha] || 0)
    return ordenDesc ? db - da : da - db
  })

  // ── Resumen de entregas ──
  const evaluadas    = entregas.filter(e => e.nota != null)
  const aprobatorias = evaluadas.filter(e => e.nota >= 4)
  const promedio     = evaluadas.length
    ? (evaluadas.reduce((s, e) => s + e.nota, 0) / evaluadas.length).toFixed(1)
    : null

  // ── Histórico agrupado por nivel (sistema antiguo) ──
  const porNivelHist = {}
  intentos.forEach(it => {
    const n = nivelDeEjercicio(it.ejercicio_id) || 1
    if (!porNivelHist[n]) porNivelHist[n] = []
    porNivelHist[n].push(it)
  })
  const nivelesHist = Object.keys(porNivelHist).map(Number).sort((a, b) => a - b)

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
                Usuario: <strong style={{ color:"var(--primario-dim)" }}>{nombreUsuario}</strong>
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

          {!cargando && entregas.length === 0 && (
            <div className="panel" style={{ textAlign:"center", padding:40 }}>
              <div style={{ fontSize:32, marginBottom:12 }}>📋</div>
              <div style={{ color:"#fff", fontWeight:700, fontSize:16, marginBottom:8 }}>
                Aún no tienes entregas
              </div>
              <div style={{ color:"var(--texto-apagado)", fontSize:14 }}>
                Completa ejercicios en el laboratorio. Tu docente los evaluará y verás aquí las notas.
              </div>
            </div>
          )}

          {/* ── Resumen general ── */}
          {!cargando && entregas.length > 0 && (
            <section className="panel">
              <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                {[
                  { l:"Ejercicios entregados",     v: entregas.length },
                  { l:"Evaluados",                 v: evaluadas.length },
                  { l:"Con nota aprobatoria (≥4)", v: aprobatorias.length },
                  { l:"Promedio general",          v: promedio ?? "—" },
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

          {/* ── Entregas de ejercicios ── */}
          {!cargando && entregas.length > 0 && (
            <section className="panel" style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:4 }}>
                Mis entregas
              </div>
              {ordenar(entregas, "fecha_entrega").map(e => {
                const esDefensa = e.tipo === "defensa"
                const pctFinal  = pctDeRespuesta(e.respuesta)
                const evaluado  = e.nota != null
                return (
                  <div key={e.id} style={{
                    background:"rgba(255,255,255,0.03)",
                    border:`1px solid ${evaluado ? (e.nota >= 4 ? "rgba(0,218,243,0.15)" : "rgba(239,68,68,0.15)") : "rgba(255,255,255,0.07)"}`,
                    borderLeft:`3px solid ${evaluado ? (e.nota >= 4 ? "var(--terciario)" : "#ef4444") : "#ff9f0a"}`,
                    borderRadius:10, padding:"12px 16px"
                  }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, marginBottom:8 }}>
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                          <span style={{
                            fontSize:10, fontWeight:800, fontFamily:"var(--mono)", letterSpacing:"0.05em",
                            padding:"2px 8px", borderRadius:5,
                            background: esDefensa ? "rgba(48,209,88,0.12)" : "rgba(255,69,58,0.10)",
                            border: `1px solid ${esDefensa ? "rgba(48,209,88,0.30)" : "rgba(255,69,58,0.25)"}`,
                            color: esDefensa ? "#30d158" : "#ff8780",
                          }}>
                            {esDefensa ? "🛡 DEFENSA" : "⚔ ATAQUE"}
                          </span>
                          <span style={{ fontSize:11, color:"var(--texto-apagado)", fontFamily:"var(--mono)" }}>
                            Nivel {e.nivel} — {NOMBRES_NIVELES[e.tipo]?.[e.nivel] || ""}
                          </span>
                        </div>
                        <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>
                          {e.titulo}
                        </div>
                        <div style={{ fontSize:11, color:"var(--texto-apagado)", fontFamily:"var(--mono)", marginTop:2 }}>
                          🕐 Entregado: {formatFecha(e.fecha_entrega)}
                          {e.fecha_evaluacion && <> · ✓ Evaluado: {formatFecha(e.fecha_evaluacion)}</>}
                        </div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        {evaluado ? (
                          <>
                            <div style={{
                              fontSize:26, fontWeight:900, fontFamily:"var(--mono)",
                              color: e.nota >= 4 ? "var(--terciario-dim)" : "#ffb4ab"
                            }}>
                              {e.nota}
                            </div>
                            <div style={{ fontSize:10, color:"var(--texto-apagado)" }}>/ 7.0</div>
                          </>
                        ) : (
                          <div style={{
                            fontSize:11, color:"#ffb340", fontFamily:"var(--mono)",
                            background:"rgba(255,159,10,0.08)", border:"1px solid rgba(255,159,10,0.25)",
                            borderRadius:6, padding:"4px 8px"
                          }}>
                            ⏳ Esperando evaluación
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Retroalimentación del docente */}
                    {e.comentarios_docente && (
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
                        {e.comentarios_docente}
                      </div>
                    )}

                    {/* Resultado calculado por el servidor */}
                    <div style={{ display:"flex", flexWrap:"wrap", gap:12, fontSize:11, color:"var(--texto-apagado)", fontFamily:"var(--mono)" }}>
                      {pctFinal != null && (
                        <span style={{
                          background: pctFinal >= 100 ? "rgba(0,218,243,0.08)" : "rgba(255,255,255,0.04)",
                          border:`1px solid ${pctFinal >= 100 ? "rgba(0,218,243,0.20)" : "rgba(255,255,255,0.08)"}`,
                          color: pctFinal >= 100 ? "var(--terciario-dim)" : "var(--texto-apagado)",
                          padding:"2px 8px", borderRadius:4
                        }}>
                          📊 Resultado: {pctFinal}%
                        </span>
                      )}
                      {(e.ayudas_pedidas || 0) > 0 && (
                        <span style={{ color:"#fbbf24" }}>💡 {e.ayudas_pedidas} ayuda{e.ayudas_pedidas > 1 ? "s" : ""} (-{Math.min(e.ayudas_pedidas*5,30)}%)</span>
                      )}
                      {e.respuesta && <span title={e.respuesta}>{e.respuesta.length > 90 ? e.respuesta.slice(0, 90) + "…" : e.respuesta}</span>}
                    </div>
                  </div>
                )
              })}
            </section>
          )}

          {/* ── Historial del sistema anterior (si existe) ── */}
          {!cargando && intentos.length > 0 && (
            <section className="panel" style={{ padding:0, overflow:"hidden" }}>
              <button
                onClick={() => setVerHistorial(v => !v)}
                style={{
                  width:"100%", textAlign:"left", background:"none", border:"none",
                  padding:"14px 20px", cursor:"pointer", color:"var(--texto-apagado)",
                  display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:13,
                }}
              >
                <span>📦 Historial de evaluaciones anteriores ({intentos.length})</span>
                <span>{verHistorial ? "▲" : "▼"}</span>
              </button>
              {verHistorial && (
                <div style={{ padding:"0 20px 16px", display:"flex", flexDirection:"column", gap:10 }}>
                  {nivelesHist.map(n => (
                    <div key={n}>
                      <div style={{ fontSize:12, fontWeight:700, color:"var(--texto-apagado)", fontFamily:"var(--mono)", margin:"8px 0 6px" }}>
                        Nivel {n} — {NOMBRES_NIVELES_HIST[n] || ""}
                      </div>
                      {ordenar(porNivelHist[n], "fecha_inicio").map(it => (
                        <div key={it.intento_id} style={{
                          background:"rgba(255,255,255,0.03)",
                          border:"1px solid rgba(255,255,255,0.07)",
                          borderRadius:10, padding:"10px 14px", marginBottom:6,
                          display:"flex", justifyContent:"space-between", alignItems:"center", gap:10,
                        }}>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600, color:"#ddd" }}>
                              {it.descripcion_ejercicio || `Ejercicio #${it.ejercicio_id}`}
                            </div>
                            <div style={{ fontSize:11, color:"var(--texto-apagado)", fontFamily:"var(--mono)", marginTop:2 }}>
                              🕐 {formatFecha(it.fecha_inicio)} · 📊 {it.porcentaje}% · ⏱ {it.tiempo_seg}s
                            </div>
                            {it.evaluacion?.comentarios && (
                              <div style={{ fontSize:12, color:"var(--texto-secundario)", marginTop:4 }}>
                                💬 {it.evaluacion.comentarios}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            {it.evaluacion?.nota != null ? (
                              <div style={{ fontSize:20, fontWeight:900, fontFamily:"var(--mono)", color: it.evaluacion.nota >= 4 ? "var(--terciario-dim)" : "#ffb4ab" }}>
                                {it.evaluacion.nota}
                              </div>
                            ) : (
                              <span style={{ fontSize:11, color:"var(--texto-apagado)", fontFamily:"var(--mono)" }}>Sin evaluar</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

        </div>
      </div>
    </GuardSesion>
  )
}
