"use client"

// ModalEntrega — detalle/evaluación de una entrega de ejercicio docente.
// Componente compartido: Estadísticas → Entregas (visión por ejercicio)
// y Panel → Estudiantes → perfil (visión por alumno) abren el mismo modal.
import { useEffect, useState, useMemo } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"

const getAuthHeaders = () => ({
  "Authorization": `Bearer ${sessionStorage.getItem("token") || ""}`,
  "Content-Type": "application/json",
})

const formatFecha = (str) => {
  if (!str) return "—"
  try {
    return new Date(str).toLocaleString("es-CL", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
  } catch { return str }
}

// "754 seg" → "12:34" (o "1 h 02:15" si pasa de la hora)
export const fmtDur = (seg) => {
  if (seg == null) return "—"
  const s = Math.max(0, Math.round(seg))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  if (h) return `${h} h ${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
  return `${m}:${String(r).padStart(2, "0")}`
}

// ── Semántica de cierre de la entrega ─────────────────────────────
const CIERRES = {
  completada: { icono: "✅", label: "COMPLETADA", color: "#22c55e", fondo: "rgba(34,197,94,0.10)", borde: "rgba(34,197,94,0.30)" },
  expirada:   { icono: "⏱", label: "EXPIRADA · PARCIAL", color: "#f59e0b", fondo: "rgba(245,158,11,0.10)", borde: "rgba(245,158,11,0.28)" },
  intrusion:  { icono: "🚨", label: "INTRUSIÓN SUFRIDA", color: "#f87171", fondo: "rgba(248,113,113,0.10)", borde: "rgba(248,113,113,0.30)" },
}

export const colorResultado = (pct) => pct == null ? "#8b949e" : pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#f87171"

export function BadgeCierre({ cierre }) {
  const c = CIERRES[cierre]
  if (!c) return <span style={{ fontSize: 10, color: "#6e7681", fontFamily: "monospace" }}>SIN DATOS DE CIERRE</span>
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 800,
      fontFamily: "monospace", padding: "2px 9px", borderRadius: 6,
      background: c.fondo, color: c.color, border: `1px solid ${c.borde}`,
    }}>
      {c.icono} {c.label}
    </span>
  )
}

// Barra de resultado con la penalización visible como zona rayada
export function BarraResultado({ resumen, alto = 7 }) {
  const pct = resumen?.porcentaje
  const penal = resumen?.penalizacion || 0
  const final = resumen?.porcentaje_final
  if (final == null) return <span style={{ fontSize: 12, color: "#6e7681" }}>sin resultado</span>
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontFamily: "monospace", fontSize: 11.5, color: "#8b949e", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span>{pct ?? final}%</span>
        {penal > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 5,
            background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.30)",
          }}>
            − {penal}% ({resumen?.ayudas || 0} pista{(resumen?.ayudas || 0) !== 1 ? "s" : ""})
          </span>
        )}
        <span style={{ fontWeight: 900, fontSize: 13.5, color: "#f0f6fc" }}>→ {final}%</span>
      </div>
      <div style={{ height: alto, borderRadius: 4, background: "rgba(255,255,255,0.07)", overflow: "hidden", position: "relative" }}>
        <div style={{ height: "100%", width: `${final}%`, borderRadius: 4, background: colorResultado(final) }} />
        {penal > 0 && (
          <div style={{
            position: "absolute", top: 0, height: "100%", left: `${final}%`, width: `${Math.min(penal, 100 - final)}%`,
            background: "repeating-linear-gradient(135deg, rgba(245,158,11,0.55) 0 3px, transparent 3px 6px)",
          }} />
        )}
      </div>
    </div>
  )
}

// ── Estilos internos del modal ────────────────────────────────────
const est = {
  cargando: { color: "#8b949e", textAlign: "center", padding: 60, fontSize: 14 },
  errorMsg: { color: "#f87171", textAlign: "center", padding: 40, fontSize: 14, background: "rgba(248,81,73,0.08)", borderRadius: 10 },
  btnCerrar: {
    padding: "6px 12px", fontSize: 13, fontWeight: 600,
    background: "#21262d", border: "1px solid #30363d", borderRadius: 8,
    color: "#c9d1d9", cursor: "pointer",
  },
  input: {
    padding: "10px 14px", fontSize: 14, background: "rgba(0,0,0,0.30)",
    border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, color: "#f0f6fc", outline: "none",
  },
  cajaMetrica: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
    padding: "13px 15px",
  },
  cajaGrande: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
    padding: "13px 15px", minHeight: 120,
  },
  cajaLabel: {
    fontFamily: "monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
    color: "#6e7681", textTransform: "uppercase", display: "block", marginBottom: 8,
  },
  cajaValor: { fontSize: 19, fontWeight: 900, color: "#f0f6fc" },
  cajaMini: { fontSize: 11, color: "#8b949e", marginTop: 4, fontFamily: "monospace" },
}

export default function ModalEntrega({ entregaId, onCerrar, onEvaluada, soloLectura = false }) {
  const [data, setData] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")
  const [nota, setNota] = useState("")
  const [comentarios, setComentarios] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState("")
  const [reabriendo, setReabriendo] = useState(false)

  useEffect(() => {
    setCargando(true)
    fetch(`${API_URL}/ejercicios-docente/entregas/${entregaId}/detalle`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => {
        setData(d)
        setNota(d.nota != null ? String(d.nota) : (d.resumen?.nota_sugerida != null ? String(d.resumen.nota_sugerida) : ""))
        setComentarios(d.comentarios_docente || "")
      })
      .catch(() => setError("No se pudo cargar el detalle"))
      .finally(() => setCargando(false))
  }, [entregaId])

  const guardarEvaluacion = async () => {
    const n = parseFloat(nota)
    if (isNaN(n) || n < 1.0 || n > 7.0) { setMsg("La nota debe estar entre 1.0 y 7.0"); return }
    setGuardando(true); setMsg("")
    try {
      const r = await fetch(`${API_URL}/ejercicios-docente/entregas/${entregaId}/evaluar`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ nota: n, comentarios }),
      })
      const d = await r.json()
      if (!r.ok) { setMsg(d?.detail || "No se pudo guardar"); return }
      onEvaluada?.()
      onCerrar()
    } catch { setMsg("No se pudo conectar con el backend") }
    finally { setGuardando(false) }
  }

  // Habilitar un nuevo intento: el estudiante podrá volver a rendir el ejercicio
  const permitirReintento = async () => {
    setReabriendo(true); setMsg("")
    try {
      const r = await fetch(`${API_URL}/ejercicios-docente/entregas/${entregaId}/reabrir`, {
        method: "POST", headers: getAuthHeaders(),
      })
      const d = await r.json()
      if (!r.ok) { setMsg(d?.detail || "No se pudo habilitar el reintento"); return }
      setData(prev => prev ? { ...prev, reintento_habilitado: true } : prev)
      onEvaluada?.()
    } catch { setMsg("No se pudo conectar con el backend") }
    finally { setReabriendo(false) }
  }

  const esAtaque = data?.ejercicio?.tipo === "ataque"

  // Línea de tiempo unificada: comandos + pistas + fases + cierre, por segundo.
  // En ataque el alumno ES el atacante: las fases miden cómo el OBJETIVO se
  // endurece con el tiempo (cierra la ventana de oportunidad). En defensa
  // miden cómo el atacante escala si no se le contiene.
  const timeline = useMemo(() => {
    const det = data?.detalle
    if (!det) return []
    const tot = det.total_fases || 3
    const evs = []
    ;(det.timeline || []).forEach(t => evs.push({ seg: t.seg, tipo: t.ok ? "cmd" : "error", texto: t.cmd }))
    ;(det.pistas || []).forEach((p, i) => evs.push({ seg: p.seg, tipo: "pista", texto: `Pista ${i + 1} solicitada (−5%)` }))
    ;(det.fases || []).forEach(f => {
      if (f.estado === "impactada") evs.push({
        seg: f.en_seg, tipo: "fase",
        texto: esAtaque
          ? `El objetivo reforzó sus defensas (fase ${f.orden}/${tot})`
          : `El ataque escaló a fase ${f.orden}/${tot}`,
      })
      if (f.estado === "neutralizada") evs.push({
        seg: f.en_seg, tipo: "hito",
        texto: esAtaque
          ? `Fase ${f.orden} — aprovechaste la ventana a tiempo`
          : `Fase ${f.orden} neutralizada — el bloqueo contiene el ataque`,
      })
    })
    if (det.tiempo_seg != null) {
      evs.push({
        seg: det.tiempo_seg, tipo: det.cierre === "completada" ? "hito" : "fase",
        texto: det.cierre === "completada" ? "Ejercicio completado — todos los pasos cumplidos"
          : det.cierre === "intrusion" ? "Tiempo agotado — el atacante logró la intrusión"
          : esAtaque ? "Tiempo agotado — la ventana de ataque se cerró con avance parcial"
          : "Tiempo agotado — sesión cerrada con avance parcial",
      })
    }
    return evs.sort((a, b) => (a.seg ?? 0) - (b.seg ?? 0))
  }, [data, esAtaque])

  const colorEvento = { cmd: "#c9d1d9", error: "#f87171", pista: "#f59e0b", fase: "#f87171", hito: "#22c55e" }

  const det = data?.detalle
  const res = data?.resumen

  return (
    <div
      onClick={onCerrar}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(3px)",
        zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "40px 16px", overflowY: "auto",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#1c1c1e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16,
          padding: "24px 26px", width: "100%", maxWidth: 860,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        {cargando && <div style={est.cargando}>Cargando detalle…</div>}
        {error && <div style={est.errorMsg}>{error}</div>}

        {data && !cargando && (
          <>
            {/* Cabecera */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#f0f6fc" }}>
                  {data.usuario} — {data.ejercicio?.titulo || "Ejercicio"}
                </h3>
                <div style={{ fontSize: 12, color: "#8b949e", fontFamily: "monospace", marginTop: 4, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  {formatFecha(data.fecha_entrega)}
                  <BadgeCierre cierre={res?.cierre} />
                </div>
              </div>
              <button onClick={onCerrar} style={{ ...est.btnCerrar, marginLeft: "auto" }}>✕</button>
            </div>

            {/* Cajas de métricas */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 16 }}>
              <div style={est.cajaMetrica}>
                <span style={est.cajaLabel}>Resultado</span>
                <BarraResultado resumen={res} alto={8} />
              </div>
              <div style={est.cajaMetrica}>
                <span style={est.cajaLabel}>Tiempo</span>
                <div style={est.cajaValor}>{fmtDur(res?.tiempo_seg)}</div>
                <div style={est.cajaMini}>
                  límite: {data.ejercicio?.tiempo_minutos ?? "—"} min{det?.timeline?.length ? ` · ${det.timeline.length} comandos` : ""}
                </div>
              </div>
              <div style={{ ...est.cajaMetrica, ...(res?.ayudas > 0 ? { background: "rgba(245,158,11,0.07)", borderColor: "rgba(245,158,11,0.28)" } : {}) }}>
                <span style={est.cajaLabel}>Ayudas</span>
                <div style={{ ...est.cajaValor, color: res?.ayudas > 0 ? "#fbbf24" : "#f0f6fc" }}>
                  {res?.ayudas ?? 0} pista{(res?.ayudas ?? 0) !== 1 ? "s" : ""}
                </div>
                <div style={est.cajaMini}>−5% cada una (tope −30%)</div>
              </div>
              {res?.total_fases != null && res?.total_fases > 0 && (
                <div style={{ ...est.cajaMetrica, ...(res?.fase_max >= res?.total_fases ? { background: "rgba(248,113,113,0.07)", borderColor: "rgba(248,113,113,0.26)" } : {}) }}>
                  <span style={est.cajaLabel}>{esAtaque ? "Presión del objetivo" : "Fases del ataque"}</span>
                  <div style={{ ...est.cajaValor, color: res?.fase_max >= res?.total_fases ? "#f87171" : "#f0f6fc" }}>
                    {res?.fase_max ?? 0} / {res?.total_fases}
                  </div>
                  <div style={{ display: "flex", gap: 5, marginTop: 7 }}>
                    {Array.from({ length: res.total_fases }, (_, i) => (
                      <div key={i} style={{
                        width: 22, height: 6, borderRadius: 3,
                        background: i < (res.fase_max ?? 0) ? "#f87171" : "rgba(255,255,255,0.10)",
                      }} />
                    ))}
                  </div>
                  <div style={est.cajaMini}>
                    {res?.fase_max >= res?.total_fases
                      ? (esAtaque ? "el objetivo cerró la ventana" : "el ataque llegó al final")
                      : (esAtaque ? "ventana de ataque aún abierta" : "contenido a tiempo")}
                  </div>
                </div>
              )}
            </div>

            {/* Checklist + Timeline (solo entregas con snapshot) */}
            {det ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
                {/* Checklist */}
                <div style={est.cajaGrande}>
                  <span style={est.cajaLabel}>
                    Checklist del ejercicio · {(det.items || []).filter(i => i.completado).length}/{(det.items || []).length}
                  </span>
                  {(det.items || []).map((it, i) => (
                    <div key={i} style={{ display: "flex", gap: 9, padding: "8px 0", borderBottom: i < det.items.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", alignItems: "flex-start" }}>
                      <span style={{ fontSize: 13, lineHeight: 1.4 }}>{it.completado ? "✅" : "❌"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: it.completado ? "#c9d1d9" : "#8b949e" }}>
                          {it.descripcion}
                        </div>
                        {it.completado && it.comando && (
                          <div style={{ fontFamily: "monospace", fontSize: 10.5, color: "#58c6ff", marginTop: 2, overflowWrap: "anywhere" }}>
                            $ {it.comando} {it.seg != null && <span style={{ color: "#6e7681" }}>· min {fmtDur(it.seg)}</span>}
                          </div>
                        )}
                        {!it.completado && (
                          <div style={{ fontFamily: "monospace", fontSize: 10.5, color: "#f87171", marginTop: 2 }}>
                            no realizado
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Línea de tiempo */}
                <div style={est.cajaGrande}>
                  <span style={est.cajaLabel}>Línea de tiempo · {timeline.length} eventos</span>
                  <div style={{ fontFamily: "monospace", fontSize: 11.5, display: "flex", flexDirection: "column", gap: 7, maxHeight: 260, overflowY: "auto", paddingRight: 6 }}>
                    {timeline.map((ev, i) => (
                      <div key={i} style={{
                        display: "flex", gap: 10, alignItems: "baseline",
                        ...(ev.tipo === "fase" ? { background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: 6, padding: "4px 8px" } : {}),
                        ...(ev.tipo === "hito" ? { background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.18)", borderRadius: 6, padding: "4px 8px" } : {}),
                      }}>
                        <span style={{ color: "#6e7681", width: 44, flexShrink: 0, textAlign: "right", fontSize: 10.5 }}>{fmtDur(ev.seg)}</span>
                        <span style={{ color: colorEvento[ev.tipo], fontWeight: (ev.tipo === "fase" || ev.tipo === "hito") ? 700 : 400, overflowWrap: "anywhere" }}>
                          {ev.tipo === "cmd" || ev.tipo === "error" ? <><span style={{ color: "#2997ff" }}>$</span> {ev.texto}{ev.tipo === "error" ? " ✗" : ""}</>
                            : ev.tipo === "pista" ? `💡 ${ev.texto}`
                            : ev.tipo === "fase" ? `🚨 ${ev.texto}`
                            : `✓ ${ev.texto}`}
                        </span>
                      </div>
                    ))}
                    {timeline.length === 0 && <span style={{ color: "#6e7681" }}>Sin comandos registrados.</span>}
                  </div>
                </div>

                {/* Pistas */}
                <div style={est.cajaGrande}>
                  <span style={est.cajaLabel}>Pistas solicitadas · {(det.pistas || []).length}</span>
                  {(det.pistas || []).length === 0 && <div style={{ fontSize: 12.5, color: "#6e7681" }}>No pidió pistas.</div>}
                  {(det.pistas || []).map((p, i) => (
                    <div key={i} style={{ display: "flex", gap: 9, padding: "7px 0", borderBottom: i < det.pistas.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", alignItems: "baseline", fontSize: 12 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 800, color: "#f59e0b", background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 5, padding: "1px 7px", flexShrink: 0 }}>
                        P{i + 1}
                      </span>
                      <span style={{ color: "#8b949e", flex: 1 }}>«{p.texto}»</span>
                      <span style={{ fontFamily: "monospace", fontSize: 10.5, color: "#f59e0b", flexShrink: 0 }}>min {fmtDur(p.seg)}</span>
                    </div>
                  ))}
                </div>

              </div>
            ) : (
              /* Entregas antiguas sin snapshot: se muestra la frase original */
              <div style={{ ...est.cajaGrande, marginTop: 14 }}>
                <span style={est.cajaLabel}>Entrega (formato anterior — sin desglose)</span>
                <div style={{ fontFamily: "monospace", fontSize: 12, color: "#8b949e", lineHeight: 1.6 }}>
                  {data.respuesta || "Sin contenido."}
                </div>
              </div>
            )}

            {/* Solo lectura (vista de Exportar): se muestra la nota pero no se
                evalúa — la evaluación se hace en Administrar → Estudiantes. */}
            {soloLectura ? (
              <div style={{
                marginTop: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14, padding: "16px 18px",
              }}>
                {data.nota != null ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: data.nota >= 4 ? "#22c55e" : "#f87171" }}>{data.nota}</div>
                    <div style={{ fontSize: 12.5, color: "#8b949e", flex: 1, minWidth: 160 }}>
                      {data.comentarios_docente || "Sin comentarios del docente."}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: "#8b949e" }}>
                    Sin evaluar. La evaluación se realiza en <strong style={{ color: "#c9d1d9" }}>Administrar → Estudiantes</strong>.
                  </div>
                )}
              </div>
            ) : (
            <>
            {/* Panel de evaluación */}
            <div style={{
              marginTop: 16, background: "rgba(41,151,255,0.05)", border: "1px solid rgba(41,151,255,0.22)",
              borderRadius: 14, padding: "16px 18px",
              display: "grid", gridTemplateColumns: "130px 1fr auto", gap: 14, alignItems: "end",
            }}>
              <div>
                <span style={est.cajaLabel}>Nota (1.0 – 7.0)</span>
                <input
                  value={nota} onChange={e => setNota(e.target.value)}
                  style={{ ...est.input, width: "100%", fontFamily: "monospace", fontWeight: 800, fontSize: 16, textAlign: "center" }}
                />
                {res?.nota_sugerida != null && data.nota == null && (
                  <div style={{ fontSize: 10.5, color: "#6db8ff", marginTop: 5, fontFamily: "monospace" }}>
                    sugerida por el sistema ({res?.porcentaje_final}%)
                  </div>
                )}
              </div>
              <div>
                <span style={est.cajaLabel}>Comentarios para el estudiante</span>
                <input
                  value={comentarios} onChange={e => setComentarios(e.target.value)}
                  placeholder="Retroalimentación breve…"
                  style={{ ...est.input, width: "100%" }}
                />
              </div>
              <button
                onClick={guardarEvaluacion} disabled={guardando}
                style={{
                  padding: "11px 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", background: "linear-gradient(135deg,#2997ff,#5e5ce6)", color: "#fff",
                  opacity: guardando ? 0.6 : 1, whiteSpace: "nowrap",
                }}
              >
                {guardando ? "Guardando…" : data.estado === "evaluado" ? "Actualizar evaluación" : "Guardar evaluación"}
              </button>
            </div>

            {/* Reintento: dejar que el estudiante vuelva a rendir el ejercicio */}
            {data.estado === "evaluado" && (
              <div style={{
                marginTop: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12, padding: "12px 16px",
              }}>
                {data.reintento_habilitado ? (
                  <div style={{ fontSize: 12.5, color: "#30d158", fontWeight: 600 }}>
                    ✓ Nuevo intento habilitado — el estudiante puede volver a rendir el ejercicio. Su nueva entrega reemplazará esta nota.
                  </div>
                ) : (
                  <>
                    <div style={{ flex: 1, minWidth: 200, fontSize: 12.5, color: "#8b949e" }}>
                      ¿El estudiante debe repetir el ejercicio? Habilita un nuevo intento; podrás volver a evaluarlo cuando lo entregue.
                    </div>
                    <button
                      onClick={permitirReintento} disabled={reabriendo}
                      style={{
                        padding: "9px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                        background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.35)",
                        opacity: reabriendo ? 0.6 : 1, whiteSpace: "nowrap",
                      }}
                    >
                      {reabriendo ? "Habilitando…" : "↻ Permitir nuevo intento"}
                    </button>
                  </>
                )}
              </div>
            )}
            {msg && <div style={{ marginTop: 10, fontSize: 13, color: "#f87171" }}>{msg}</div>}
            </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
