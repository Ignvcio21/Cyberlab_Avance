"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import GuardSesion from "../componentes/GuardSesion"
import BarraSuperior from "../componentes/BarraSuperior"
import ModalEntrega, { BadgeCierre, BarraResultado, fmtDur, colorResultado } from "../componentes/ModalEntrega"
import { abrirReporteImprimible } from "../componentes/reporteExport"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"

const getAuthHeaders = () => ({
  "Authorization": `Bearer ${sessionStorage.getItem("token") || ""}`,
  "Content-Type": "application/json",
})

const formatFecha = (str) => {
  if (!str) return "—"
  try {
    return new Date(str).toLocaleString("es-CL", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    })
  } catch { return str }
}

function descargarCSV(filas, nombre) {
  if (!filas.length) return
  const cabeceras = Object.keys(filas[0])
  const csv = [
    cabeceras.join(","),
    ...filas.map(f => cabeceras.map(k => `"${(f[k] ?? "").toString().replace(/"/g, '""')}"`).join(",")),
  ].join("\n")
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a"); a.href = url; a.download = nombre; a.click()
  URL.revokeObjectURL(url)
}

const cierreTexto = (c) => c === "completada" ? "Completada" : c === "intrusion" ? "Intrusión sufrida" : c === "expirada" ? "Expirada (parcial)" : "—"

// ═══════════════════════════════════════════════════════════════════
// Selector de ejercicio enriquecido (Opción A) — agrupado por nivel
// ═══════════════════════════════════════════════════════════════════
function SelectorEjercicioA({ ejercicios, statsPorEj, value, onChange }) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const ref = useRef(null)

  useEffect(() => {
    const cerrar = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false) }
    document.addEventListener("mousedown", cerrar)
    return () => document.removeEventListener("mousedown", cerrar)
  }, [])

  const sel = ejercicios.find(e => String(e.id) === String(value))
  const filtrados = ejercicios.filter(e => e.titulo?.toLowerCase().includes(busqueda.trim().toLowerCase()))
  const niveles = [...new Set(filtrados.map(e => e.nivel || 1))].sort((a, b) => a - b)
  const icono = (t) => t === "defensa" ? "🛡" : "⚔"

  const ChipTipo = ({ t }) => (
    <span style={{
      fontFamily: "monospace", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.05em", padding: "2px 7px",
      borderRadius: 5, textTransform: "uppercase", whiteSpace: "nowrap",
      ...(t === "defensa" ? { background: "rgba(0,218,243,0.10)", color: "#00daf3", border: "1px solid rgba(0,218,243,0.25)" }
        : { background: "rgba(255,69,58,0.10)", color: "#ff7a6e", border: "1px solid rgba(255,69,58,0.25)" }),
    }}>{t}</span>
  )
  const ChipPend = ({ n }) => n > 0 ? (
    <span style={{ fontFamily: "monospace", fontSize: 9.5, fontWeight: 800, background: "rgba(255,200,0,0.12)", color: "#ffc107", border: "1px solid rgba(255,200,0,0.28)", borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap" }}>
      {n} sin evaluar
    </span>
  ) : null

  return (
    <div ref={ref} style={{ position: "relative", maxWidth: 540 }}>
      <button onClick={() => setAbierto(v => !v)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "11px 14px", cursor: "pointer",
        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10,
        color: "#f0f6fc", fontFamily: "Inter, sans-serif", fontSize: 13.5, textAlign: "left",
      }}>
        {sel ? <>
          <span>{icono(sel.tipo)}</span>
          <strong style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sel.titulo}</strong>
          <span style={{ fontFamily: "monospace", fontSize: 9.5, fontWeight: 800, background: "rgba(41,151,255,0.10)", color: "#6db8ff", border: "1px solid rgba(41,151,255,0.22)", borderRadius: 5, padding: "2px 7px" }}>N{sel.nivel || 1}</span>
          <ChipTipo t={sel.tipo} />
          <ChipPend n={statsPorEj[sel.id]?.pendientes || 0} />
        </> : <span style={{ color: "#8b949e" }}>Selecciona un ejercicio…</span>}
        <span style={{ marginLeft: "auto", color: "#6e7681", fontSize: 11 }}>▼</span>
      </button>

      {abierto && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
          background: "#1c1c1e", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12,
          boxShadow: "0 16px 48px rgba(0,0,0,0.65)", overflow: "hidden", maxHeight: 380, display: "flex", flexDirection: "column",
        }}>
          <input
            autoFocus value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar ejercicio…"
            style={{ padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "none", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#f0f6fc", fontSize: 13, outline: "none" }}
          />
          <div style={{ overflowY: "auto" }}>
            {niveles.map(n => (
              <div key={n}>
                <div style={{ fontFamily: "monospace", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.08em", color: "#6e7681", textTransform: "uppercase", padding: "8px 14px 4px", background: "rgba(255,255,255,0.02)" }}>
                  Nivel {n}
                </div>
                {filtrados.filter(e => (e.nivel || 1) === n).map(e => {
                  const st = statsPorEj[e.id] || {}
                  const activo = String(e.id) === String(value)
                  return (
                    <div key={e.id} onClick={() => { onChange(String(e.id)); setAbierto(false); setBusqueda("") }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", cursor: "pointer", fontSize: 13,
                        background: activo ? "rgba(41,151,255,0.14)" : "transparent", opacity: e.activo === false ? 0.55 : 1,
                      }}
                      onMouseEnter={ev => { if (!activo) ev.currentTarget.style.background = "rgba(41,151,255,0.08)" }}
                      onMouseLeave={ev => { if (!activo) ev.currentTarget.style.background = "transparent" }}
                    >
                      <span>{icono(e.tipo)}</span>
                      <span style={{ fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#f0f6fc" }}>{e.titulo}</span>
                      <ChipTipo t={e.tipo} />
                      {e.activo === false
                        ? <span style={{ fontFamily: "monospace", fontSize: 9.5, color: "#6e7681", border: "1px dashed rgba(255,255,255,0.18)", borderRadius: 5, padding: "2px 7px" }}>BORRADOR</span>
                        : (st.pendientes > 0
                          ? <ChipPend n={st.pendientes} />
                          : <span style={{ fontFamily: "monospace", fontSize: 10, color: "#6e7681" }}>{st.entregas || 0} entregas</span>)}
                    </div>
                  )
                })}
              </div>
            ))}
            {filtrados.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "#6e7681", fontSize: 13 }}>Sin coincidencias.</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Fila de entrega reutilizable (lista por ejercicio y por estudiante)
// ═══════════════════════════════════════════════════════════════════
function FilaEntrega({ etiqueta, sub, en, onVer, onPDF }) {
  return (
    <div onClick={onVer} style={{
      background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: "13px 16px",
      display: "grid", gridTemplateColumns: "1.3fr 1.7fr 0.8fr 0.6fr auto", gap: 14, alignItems: "center", cursor: "pointer",
    }}
      onMouseEnter={e => e.currentTarget.style.border = "1px solid rgba(41,151,255,0.45)"}
      onMouseLeave={e => e.currentTarget.style.border = "1px solid #30363d"}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: "#f0f6fc", fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{etiqueta}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <BadgeCierre cierre={en.resumen?.cierre} />
          {en.reintento_habilitado && (
            <span style={{ fontFamily: "monospace", fontSize: 9.5, fontWeight: 800, color: "#f59e0b", background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.30)", borderRadius: 5, padding: "2px 7px" }}>↻ REINTENTO</span>
          )}
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 10.5, color: "#6e7681" }}>{sub}</div>
      </div>
      <BarraResultado resumen={en.resumen} />
      <div style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: "monospace", fontSize: 11, color: "#8b949e" }}>
        <span>⏱ {fmtDur(en.resumen?.tiempo_seg)}</span>
        {(en.resumen?.ayudas ?? en.ayudas_pedidas ?? 0) > 0 && (
          <span style={{ color: "#f59e0b" }}>💡 {en.resumen?.ayudas ?? en.ayudas_pedidas} pista{(en.resumen?.ayudas ?? en.ayudas_pedidas) > 1 ? "s" : ""}</span>
        )}
        {en.resumen?.total_fases != null && en.resumen?.total_fases > 0 && (
          <span style={{ color: "#6e7681" }}>fase máx: {en.resumen?.fase_max ?? 0}/{en.resumen?.total_fases}{(en.resumen?.fase_max ?? 0) >= en.resumen?.total_fases ? " 💥" : ""}</span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        {en.nota != null ? (
          <>
            <span style={{ fontSize: 17, fontWeight: 900, color: en.nota >= 4 ? "#22c55e" : "#f87171" }}>{en.nota}</span>
            <span style={{ fontFamily: "monospace", fontSize: 9, color: "#6e7681", textTransform: "uppercase", letterSpacing: "0.06em" }}>nota</span>
          </>
        ) : (
          <span style={{ fontSize: 11, fontWeight: 800, color: "#ffc107", background: "rgba(255,200,0,0.10)", border: "1px solid rgba(255,200,0,0.25)", borderRadius: 6, padding: "3px 9px" }}>Pendiente</span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button onClick={e => { e.stopPropagation(); onVer() }} style={{
          padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
          background: "#21262d", color: "#c9d1d9", border: "1px solid #30363d",
        }}>👁 Ver</button>
        <button onClick={e => { e.stopPropagation(); onPDF() }} style={{
          padding: "7px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
          background: "linear-gradient(135deg,#2997ff,#5e5ce6)", color: "#fff",
        }}>⎙ PDF</button>
      </div>
    </div>
  )
}

// Reporte PDF individual de UNA entrega (detalle completo de un alumno en un ejercicio)
async function exportarEntregaPDF(entregaId) {
  try {
    const r = await fetch(`${API_URL}/ejercicios-docente/entregas/${entregaId}/detalle`, { headers: getAuthHeaders() })
    const d = await r.json()
    if (!r.ok) return
    const res = d.resumen || {}
    const det = d.detalle
    const secciones = []
    if (det) {
      secciones.push({
        titulo: `Checklist del ejercicio (${(det.items || []).filter(i => i.completado).length}/${(det.items || []).length})`,
        columnas: [
          { key: "Ítem", label: "Ítem" },
          { key: "Estado", label: "Estado", formato: "estado" },
          { key: "Comando", label: "Comando", formato: "mono" },
          { key: "Min", label: "Min", align: "center" },
        ],
        filas: (det.items || []).map(it => ({
          "Ítem": it.descripcion, "Estado": it.completado ? "Cumplido" : "No realizado",
          "Comando": it.comando || "—", "Min": it.seg != null ? fmtDur(it.seg) : "—",
        })),
      })
      secciones.push({
        titulo: "Línea de tiempo",
        columnas: [{ key: "Min", label: "Min", align: "center" }, { key: "Evento", label: "Evento", formato: "mono" }],
        filas: (det.timeline || []).map(t => ({ "Min": fmtDur(t.seg), "Evento": (t.ok ? "" : "✗ ") + t.cmd })),
      })
      if ((det.pistas || []).length) secciones.push({
        titulo: "Pistas solicitadas",
        columnas: [{ key: "P", label: "#", align: "center" }, { key: "Pista", label: "Pista" }, { key: "Min", label: "Min", align: "center" }],
        filas: det.pistas.map((p, i) => ({ "P": `P${i + 1}`, "Pista": p.texto, "Min": fmtDur(p.seg) })),
      })
    }
    abrirReporteImprimible({
      titulo: `Entrega — ${d.usuario}`,
      subtitulo: `${d.ejercicio?.titulo || ""} · ${formatFecha(d.fecha_entrega)} · ${cierreTexto(res.cierre)}`,
      resumen: [
        { label: "Resultado", valor: res.porcentaje_final != null ? `${res.porcentaje_final}%` : "—", color: "#1d6fe0" },
        { label: "Tiempo", valor: fmtDur(res.tiempo_seg) },
        { label: "Ayudas", valor: `${res.ayudas ?? 0} pista${(res.ayudas ?? 0) !== 1 ? "s" : ""}` },
        { label: "Nota", valor: d.nota != null ? d.nota : "Sin evaluar", color: d.nota != null ? (d.nota >= 4 ? "#15803d" : "#b91c1c") : undefined },
      ],
      secciones,
      parrafos: [
        { titulo: "Evaluación del docente", texto: d.nota != null ? `Nota: ${d.nota}\n${d.comentarios_docente || "Sin comentarios."}` : "Aún no evaluada." },
      ],
    })
  } catch { /* noop */ }
}

// ═══════════════════════════════════════════════════════════════════
// VISTA — POR EJERCICIO
// ═══════════════════════════════════════════════════════════════════
function VistaPorEjercicio({ ejercicios, estudiantes, statsPorEj }) {
  const [ejId, setEjId] = useState(ejercicios[0] ? String(ejercicios[0].id) : "")
  const [entregas, setEntregas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [filtro, setFiltro] = useState("todas")
  const [orden, setOrden] = useState("resultado")
  const [modalId, setModalId] = useState(null)

  const cargarEntregas = useCallback((id) => {
    if (!id) { setEntregas([]); return }
    setCargando(true)
    fetch(`${API_URL}/ejercicios-docente/${id}/entregas`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => setEntregas(Array.isArray(d) ? d : []))
      .catch(() => setEntregas([]))
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => { cargarEntregas(ejId) }, [ejId, cargarEntregas])

  const ejercicio = ejercicios.find(e => String(e.id) === ejId)

  const stats = useMemo(() => {
    const pendientes = entregas.filter(e => e.estado !== "evaluado").length
    const finales = entregas.map(e => e.resumen?.porcentaje_final).filter(v => v != null)
    const media = finales.length ? Math.round(finales.reduce((s, v) => s + v, 0) / finales.length) : null
    const rango = finales.length ? [Math.min(...finales), Math.max(...finales)] : null
    const tiempos = entregas.map(e => e.resumen?.tiempo_seg).filter(v => v != null).sort((a, b) => a - b)
    const mediana = tiempos.length ? tiempos[Math.floor(tiempos.length / 2)] : null
    const fallos = {}; let conChecklist = 0
    entregas.forEach(e => {
      const items = e.resumen?.items
      if (!items?.length) return
      conChecklist++
      items.forEach(it => { if (!it.completado) fallos[it.descripcion] = (fallos[it.descripcion] || 0) + 1 })
    })
    const peor = Object.entries(fallos).sort((a, b) => b[1] - a[1])[0] || null
    return { pendientes, media, rango, mediana, peor, conChecklist }
  }, [entregas])

  const visibles = useMemo(() => {
    let lista = entregas
    if (filtro === "pendientes") lista = lista.filter(e => e.estado !== "evaluado")
    if (filtro === "evaluadas") lista = lista.filter(e => e.estado === "evaluado")
    const val = {
      resultado: e => e.resumen?.porcentaje_final ?? -1,
      fecha: e => e.fecha_entrega || "",
      nota: e => e.nota ?? -1,
      usuario: e => e.usuario || "",
    }[orden]
    return [...lista].sort((a, b) => {
      const va = val(a), vb = val(b)
      if (orden === "usuario") return String(va).localeCompare(String(vb))
      return vb > va ? 1 : vb < va ? -1 : 0
    })
  }, [entregas, filtro, orden])

  const filasExport = () => visibles.map(e => ({
    "Estudiante": e.usuario,
    "Cierre": cierreTexto(e.resumen?.cierre),
    "Resultado %": e.resumen?.porcentaje_final != null ? `${e.resumen.porcentaje_final}%` : "—",
    "Pistas": e.resumen?.ayudas ?? e.ayudas_pedidas ?? 0,
    "Tiempo": fmtDur(e.resumen?.tiempo_seg),
    "Nota": e.nota ?? "Sin evaluar",
    "Comentarios": e.comentarios_docente || "—",
    "Fecha": formatFecha(e.fecha_entrega),
  }))

  const exportarCSV = () => descargarCSV(filasExport(),
    `entregas-${(ejercicio?.titulo || "ejercicio").toLowerCase().replace(/\s+/g, "-").slice(0, 40)}.csv`)

  const exportarReporte = () => {
    // Estudiantes que NO entregaron este ejercicio
    const entregaron = new Set(entregas.map(e => e.usuario))
    const faltantes = estudiantes.filter(u => !entregaron.has(u.nombre_usuario))
    abrirReporteImprimible({
      titulo: `Ejercicio — ${ejercicio?.titulo || ""}`,
      subtitulo: `Nivel ${ejercicio?.nivel || 1} · ${ejercicio?.tipo || ""} · detalle de entregas`,
      resumen: [
        { label: "Entregas", valor: `${entregas.length} / ${estudiantes.length}` },
        { label: "Pendientes de evaluar", valor: stats.pendientes, color: stats.pendientes ? "#b45309" : undefined },
        { label: "Resultado medio", valor: stats.media != null ? `${stats.media}%` : "—", color: "#1d6fe0" },
        { label: "Tiempo mediano", valor: fmtDur(stats.mediana) },
      ],
      secciones: [
        {
          titulo: "Entregas recibidas",
          columnas: [
            { key: "Estudiante", label: "Estudiante" },
            { key: "Cierre", label: "Cierre", formato: "estado" },
            { key: "Resultado %", label: "Resultado", align: "center", formato: "porcentaje" },
            { key: "Pistas", label: "Pistas", align: "center" },
            { key: "Tiempo", label: "Tiempo", align: "center", formato: "mono" },
            { key: "Nota", label: "Nota", align: "center", formato: "nota" },
            { key: "Comentarios", label: "Comentarios" },
          ],
          filas: filasExport(),
        },
        {
          titulo: `No entregaron (${faltantes.length})`,
          columnas: [
            { key: "Estudiante", label: "Estudiante" },
            { key: "Correo", label: "Correo", formato: "mono" },
          ],
          filas: faltantes.map(u => ({ "Estudiante": u.nombre, "Correo": u.nombre_usuario })),
        },
      ],
    })
  }

  if (!ejercicios.length) return <div style={estilos.cargando}>Aún no hay ejercicios creados.</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontSize: 13, color: "#8b949e", fontWeight: 600 }}>Ejercicio:</label>
        <SelectorEjercicioA ejercicios={ejercicios} statsPorEj={statsPorEj} value={ejId} onChange={setEjId} />
      </div>

      {/* Nombre del ejercicio seleccionado, bien claro */}
      {ejercicio && (
        <div style={{ fontSize: 18, fontWeight: 800, color: "#f0f6fc", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {ejercicio.tipo === "defensa" ? "🛡" : "⚔"} {ejercicio.titulo}
          <span style={{ fontFamily: "monospace", fontSize: 11, color: "#8b949e", fontWeight: 600 }}>
            Nivel {ejercicio.nivel || 1} · {ejercicio.tipo}
          </span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <div style={estilos.cajaMetrica}>
          <span style={estilos.cajaLabel}>Entregas</span>
          <div style={estilos.cajaValor}>{entregas.length} <span style={{ fontSize: 13, color: "#6e7681" }}>/ {estudiantes.length}</span></div>
          <div style={estilos.cajaMini}>{stats.pendientes} pendiente{stats.pendientes !== 1 ? "s" : ""} de evaluar</div>
        </div>
        <div style={estilos.cajaMetrica}>
          <span style={estilos.cajaLabel}>Resultado medio</span>
          <div style={{ ...estilos.cajaValor, color: colorResultado(stats.media) }}>{stats.media != null ? `${stats.media}%` : "—"}</div>
          <div style={estilos.cajaMini}>{stats.rango ? `rango ${stats.rango[0]}% – ${stats.rango[1]}%` : "sin resultados"}</div>
        </div>
        <div style={estilos.cajaMetrica}>
          <span style={estilos.cajaLabel}>Tiempo mediano</span>
          <div style={estilos.cajaValor}>{fmtDur(stats.mediana)}</div>
          <div style={estilos.cajaMini}>límite: {ejercicio?.tiempo_minutos ?? "—"} min</div>
        </div>
        <div style={{ ...estilos.cajaMetrica, ...(stats.peor ? { background: "rgba(248,113,113,0.06)", borderColor: "rgba(248,113,113,0.22)" } : {}) }}>
          <span style={estilos.cajaLabel}>Ítem más fallado</span>
          {stats.peor ? (
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", lineHeight: 1.4 }}>
              «{stats.peor[0].length > 60 ? stats.peor[0].slice(0, 57) + "…" : stats.peor[0]}»
              <div style={{ ...estilos.cajaMini, color: "#8b949e" }}>{stats.peor[1]} de {stats.conChecklist} no lo lograron</div>
            </div>
          ) : <div style={{ ...estilos.cajaValor, color: "#8b949e", fontSize: 14 }}>—</div>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {[{ val: "todas", label: "Todas" }, { val: "pendientes", label: `Pendientes${stats.pendientes ? ` (${stats.pendientes})` : ""}` }, { val: "evaluadas", label: "Evaluadas" }].map(({ val, label }) => (
          <button key={val} onClick={() => setFiltro(val)} style={{ ...estilos.btnPag, ...(filtro === val ? { background: "#2997ff", color: "#fff", borderColor: "#2997ff" } : {}) }}>{label}</button>
        ))}
        <select value={orden} onChange={e => setOrden(e.target.value)} style={{ ...estilos.input, padding: "7px 10px", fontSize: 13 }}>
          <option value="resultado">Ordenar: resultado ↓</option>
          <option value="fecha">Ordenar: fecha ↓</option>
          <option value="nota">Ordenar: nota ↓</option>
          <option value="usuario">Ordenar: estudiante A–Z</option>
        </select>
        <button onClick={exportarReporte} style={estilos.btnReporte}>⎙ Reporte PDF</button>
        <button onClick={exportarCSV} style={estilos.btnSecundario}>⬇ CSV</button>
      </div>

      {cargando && <div style={estilos.cargando}>Cargando entregas…</div>}
      {!cargando && visibles.length === 0 && (
        <div style={{ color: "#8b949e", textAlign: "center", padding: 40, fontSize: 14 }}>
          {entregas.length === 0 ? "Ningún estudiante ha entregado este ejercicio aún." : "Sin entregas para el filtro seleccionado."}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visibles.map(en => (
          <FilaEntrega key={en.id} etiqueta={en.usuario} sub={formatFecha(en.fecha_entrega)} en={en}
            onVer={() => setModalId(en.id)} onPDF={() => exportarEntregaPDF(en.id)} />
        ))}
      </div>

      {modalId != null && (
        <ModalEntrega entregaId={modalId} soloLectura onCerrar={() => setModalId(null)} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// VISTA — POR ESTUDIANTE
// ═══════════════════════════════════════════════════════════════════
function VistaPorEstudiante({ estudiantes, ejerciciosPublicados }) {
  const [busqueda, setBusqueda] = useState("")
  const [sel, setSel] = useState(null)          // estudiante seleccionado
  const [entregas, setEntregas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [modalId, setModalId] = useState(null)

  const cargar = useCallback((nombreUsuario) => {
    setCargando(true)
    fetch(`${API_URL}/docente/estudiante/${encodeURIComponent(nombreUsuario)}/entregas`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => setEntregas(Array.isArray(d) ? d : []))
      .catch(() => setEntregas([]))
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => { if (sel) cargar(sel.nombre_usuario) }, [sel, cargar])

  const filtrados = estudiantes.filter(u =>
    (u.nombre || "").toLowerCase().includes(busqueda.trim().toLowerCase()) ||
    (u.nombre_usuario || "").toLowerCase().includes(busqueda.trim().toLowerCase()))

  // Agrupar entregas del estudiante por nivel
  const porNivel = useMemo(() => {
    const m = {}
    entregas.forEach(en => { const n = en.nivel || 1; (m[n] = m[n] || []).push(en) })
    return m
  }, [entregas])

  const resumenAlumno = useMemo(() => {
    const notas = entregas.filter(e => e.nota != null).map(e => e.nota)
    const finales = entregas.map(e => e.resumen?.porcentaje_final).filter(v => v != null)
    const pendientes = entregas.filter(e => e.estado !== "evaluado").length
    return {
      entregadas: entregas.length,
      pendientes,
      notaProm: notas.length ? (notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(1) : null,
      resultMedio: finales.length ? Math.round(finales.reduce((s, v) => s + v, 0) / finales.length) : null,
    }
  }, [entregas])

  const exportarReporteAlumno = () => {
    const porEjId = {}
    entregas.forEach(en => { porEjId[en.ejercicio_id] = en })
    // Todos los ejercicios publicados, marcando entregado / no entregado
    const filas = ejerciciosPublicados.map(ej => {
      const en = porEjId[ej.id]
      return {
        "Ejercicio": ej.titulo,
        "Nivel": `N${ej.nivel || 1}`,
        "Tipo": ej.tipo,
        "Estado": en ? (en.estado === "evaluado" ? "Evaluado" : "Entregado, sin evaluar") : "No entregado",
        "Resultado": en?.resumen?.porcentaje_final != null ? `${en.resumen.porcentaje_final}%` : "—",
        "Nota": en?.nota != null ? en.nota : (en ? "Sin evaluar" : "—"),
        "Fecha": en ? formatFecha(en.fecha_entrega) : "—",
      }
    })
    abrirReporteImprimible({
      titulo: `Reporte del estudiante — ${sel.nombre || sel.nombre_usuario}`,
      subtitulo: sel.nombre_usuario,
      resumen: [
        { label: "Ejercicios entregados", valor: `${resumenAlumno.entregadas} / ${ejerciciosPublicados.length}`, color: "#1d6fe0" },
        { label: "Pendientes de evaluar", valor: resumenAlumno.pendientes, color: resumenAlumno.pendientes ? "#b45309" : undefined },
        { label: "Resultado medio", valor: resumenAlumno.resultMedio != null ? `${resumenAlumno.resultMedio}%` : "—" },
        { label: "Nota promedio", valor: resumenAlumno.notaProm ?? "—", color: resumenAlumno.notaProm != null ? (parseFloat(resumenAlumno.notaProm) >= 4 ? "#15803d" : "#b91c1c") : undefined },
      ],
      columnas: [
        { key: "Ejercicio", label: "Ejercicio" },
        { key: "Nivel", label: "Nivel", align: "center" },
        { key: "Tipo", label: "Tipo" },
        { key: "Estado", label: "Estado", formato: "estado" },
        { key: "Resultado", label: "Resultado", align: "center", formato: "porcentaje" },
        { key: "Nota", label: "Nota", align: "center", formato: "nota" },
        { key: "Fecha", label: "Fecha" },
      ],
      filas,
    })
  }

  // ── Lista de estudiantes ──
  if (!sel) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre o correo…" style={{ ...estilos.input, maxWidth: 460 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {filtrados.map(u => (
            <div key={u.id} onClick={() => setSel(u)} style={{
              background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
            }}
              onMouseEnter={e => e.currentTarget.style.border = "1px solid rgba(41,151,255,0.45)"}
              onMouseLeave={e => e.currentTarget.style.border = "1px solid #30363d"}
            >
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#2997ff,#5e5ce6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, flexShrink: 0 }}>
                {(u.nombre || u.nombre_usuario || "?")[0].toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: "#f0f6fc", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.nombre || u.nombre_usuario}</div>
                <div style={{ fontSize: 12, color: "#8b949e", fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.nombre_usuario}</div>
              </div>
              <span style={{ marginLeft: "auto", color: "#6e7681" }}>›</span>
            </div>
          ))}
          {filtrados.length === 0 && <div style={{ color: "#8b949e", padding: 20 }}>Sin estudiantes.</div>}
        </div>
      </div>
    )
  }

  // ── Detalle de un estudiante ──
  const niveles = Object.keys(porNivel).map(Number).sort((a, b) => a - b)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <button onClick={() => { setSel(null); setEntregas([]) }} style={estilos.btnSecundario}>← Volver</button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#f0f6fc" }}>{sel.nombre || sel.nombre_usuario}</div>
          <div style={{ fontSize: 12, color: "#6e7681", fontFamily: "monospace" }}>{sel.nombre_usuario}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {resumenAlumno.notaProm != null && (
            <div style={estilos.miniStat}><div style={{ ...estilos.miniStatV, color: parseFloat(resumenAlumno.notaProm) >= 4 ? "#22c55e" : "#f87171" }}>{resumenAlumno.notaProm}</div><div style={estilos.miniStatL}>nota prom.</div></div>
          )}
          <div style={estilos.miniStat}><div style={estilos.miniStatV}>{resumenAlumno.entregadas}/{ejerciciosPublicados.length}</div><div style={estilos.miniStatL}>ejercicios</div></div>
          {resumenAlumno.pendientes > 0 && (
            <div style={{ ...estilos.miniStat, background: "rgba(255,200,0,0.07)", borderColor: "rgba(255,200,0,0.22)" }}><div style={{ ...estilos.miniStatV, color: "#ffc107" }}>{resumenAlumno.pendientes}</div><div style={estilos.miniStatL}>sin evaluar</div></div>
          )}
          <button onClick={exportarReporteAlumno} style={estilos.btnReporte}>⎙ Reporte PDF</button>
        </div>
      </div>

      {cargando && <div style={estilos.cargando}>Cargando entregas…</div>}
      {!cargando && entregas.length === 0 && <div style={{ color: "#8b949e", textAlign: "center", padding: 40 }}>Este estudiante aún no tiene entregas.</div>}

      {niveles.map(n => (
        <div key={n}>
          <div style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#8b949e", marginBottom: 8, textTransform: "uppercase" }}>
            Nivel {n}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {porNivel[n].map(en => (
              <FilaEntrega key={en.id}
                etiqueta={`${en.numero_ejercicio ? `#${en.numero_ejercicio} · ` : ""}${en.titulo_ejercicio || `Ejercicio ${en.ejercicio_id}`}`}
                sub={formatFecha(en.fecha_entrega)} en={en}
                onVer={() => setModalId(en.id)} onPDF={() => exportarEntregaPDF(en.id)} />
            ))}
          </div>
        </div>
      ))}

      {modalId != null && (
        <ModalEntrega entregaId={modalId} soloLectura onCerrar={() => setModalId(null)} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// PÁGINA — EXPORTAR
// ═══════════════════════════════════════════════════════════════════
export default function ExportarPage() {
  const [ejercicios, setEjercicios] = useState([])
  const [estudiantes, setEstudiantes] = useState([])
  const [entregasGlobal, setEntregasGlobal] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")
  const [vista, setVista] = useState("estudiante")
  const [tabPrincipal, setTabPrincipal] = useState("informes")
  const [estudiantePDFSel, setEstudiantePDFSel] = useState("")
  const [modoFiltro, setModoFiltro] = useState("ataque")
  const [nivelFiltro, setNivelFiltro] = useState(null)
  const [ejercicioFiltroId, setEjercicioFiltroId] = useState(null)

  const cargarTodo = useCallback(() => {
    const h = getAuthHeaders()
    Promise.all([
      fetch(`${API_URL}/ejercicios-docente`, { headers: h }).then(r => r.json()),
      fetch(`${API_URL}/admin/usuarios`, { headers: h }).then(r => r.json()),
      fetch(`${API_URL}/docente/entregas`, { headers: h }).then(r => r.json()),
    ]).then(([ej, us, en]) => {
      const ejArr = Array.isArray(ej) ? ej : (ej?.ejercicios || [])
      setEjercicios(ejArr)
      // Inicializar filtros modo/nivel/ejercicio en cascada
      const publicados = ejArr.filter(e => e.activo !== false)
      const modo0 = publicados.find(e => e.tipo)?.tipo || "ataque"
      setModoFiltro(modo0)
      const niveles = [...new Set(publicados.filter(e => e.tipo === modo0).map(e => e.nivel).filter(Boolean))].sort((a, b) => a - b)
      if (niveles.length) {
        const n0 = niveles[0]
        setNivelFiltro(n0)
        const ej0 = publicados.find(e => e.tipo === modo0 && e.nivel === n0)
        if (ej0) setEjercicioFiltroId(ej0.id)
      }
      const ests = Array.isArray(us) ? us.filter(u => u.rol === "estudiante") : []
      setEstudiantes(ests)
      if (ests.length) setEstudiantePDFSel(ests[0].nombre_usuario)
      setEntregasGlobal(en?.entregas || [])
    }).catch(() => setError("No se pudieron cargar los datos"))
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => { cargarTodo() }, [cargarTodo])

  const ejerciciosPublicados = useMemo(() => ejercicios.filter(e => e.activo !== false), [ejercicios])

  const statsPorEj = useMemo(() => {
    const m = {}
    entregasGlobal.forEach(en => {
      const k = en.ejercicio_id
      if (!m[k]) m[k] = { entregas: 0, pendientes: 0 }
      m[k].entregas++
      if (en.estado !== "evaluado") m[k].pendientes++
    })
    return m
  }, [entregasGlobal])

  // ── Filtros modo/nivel/ejercicio en cascada ───────────────────────
  const ejerciciosPorModo = useMemo(() =>
    modoFiltro ? ejerciciosPublicados.filter(e => e.tipo === modoFiltro) : ejerciciosPublicados,
    [ejerciciosPublicados, modoFiltro]
  )
  const nivelesDisponibles = useMemo(() =>
    [...new Set(ejerciciosPorModo.map(e => e.nivel).filter(Boolean))].sort((a, b) => a - b),
    [ejerciciosPorModo]
  )
  const ejerciciosPorNivel = useMemo(() =>
    nivelFiltro != null ? ejerciciosPorModo.filter(e => e.nivel === nivelFiltro) : ejerciciosPorModo,
    [ejerciciosPorModo, nivelFiltro]
  )
  const ejercicioSeleccionado = useMemo(() =>
    ejerciciosPublicados.find(e => e.id === ejercicioFiltroId) || null,
    [ejerciciosPublicados, ejercicioFiltroId]
  )
  const handleModoChange = (modo) => {
    setModoFiltro(modo)
    const ejsModo = ejerciciosPublicados.filter(e => e.tipo === modo)
    const niveles = [...new Set(ejsModo.map(e => e.nivel).filter(Boolean))].sort((a, b) => a - b)
    const n0 = niveles[0] ?? null
    setNivelFiltro(n0)
    const ej0 = ejsModo.find(e => e.nivel === n0)
    setEjercicioFiltroId(ej0?.id ?? null)
  }
  const handleNivelChange = (n) => {
    setNivelFiltro(n)
    const ej0 = ejerciciosPorModo.find(e => e.nivel === n)
    if (ej0) setEjercicioFiltroId(ej0.id)
  }

  // ── Reporte general del curso (PDF) ──────────────────────────────
  const reporteGeneral = () => {
    const totalEst = estudiantes.length
    const totalEj  = ejerciciosPublicados.length
    const totalPosible = totalEst * totalEj
    const notas    = entregasGlobal.filter(e => e.nota != null).map(e => e.nota)
    const notaProm = notas.length ? (notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(1) : "—"
    const cobertura = totalPosible ? Math.round(entregasGlobal.length / totalPosible * 100) : 0

    const porEj = ejerciciosPublicados.map(ej => {
      const ens = entregasGlobal.filter(e => e.ejercicio_id === ej.id)
      const finales = ens.map(e => e.porcentaje).filter(v => v != null)
      const ns = ens.filter(e => e.nota != null).map(e => e.nota)
      return {
        "Ejercicio": ej.titulo, "Nivel": `N${ej.nivel || 1}`, "Tipo": ej.tipo,
        "Entregas": `${ens.length} / ${totalEst}`,
        "Faltan": Math.max(0, totalEst - ens.length),
        "Result. medio": finales.length ? `${Math.round(finales.reduce((s, v) => s + v, 0) / finales.length)}%` : "—",
        "Nota prom.": ns.length ? (ns.reduce((s, n) => s + n, 0) / ns.length).toFixed(1) : "—",
      }
    })
    const porEst = estudiantes.map(u => {
      const ens = entregasGlobal.filter(e => e.usuario === u.nombre_usuario)
      const finales = ens.map(e => e.porcentaje).filter(v => v != null)
      const ns = ens.filter(e => e.nota != null).map(e => e.nota)
      return {
        "Estudiante": u.nombre || u.nombre_usuario,
        "Entregas": `${ens.length} / ${totalEj}`,
        "Result. medio": finales.length ? `${Math.round(finales.reduce((s, v) => s + v, 0) / finales.length)}%` : "—",
        "Nota prom.": ns.length ? (ns.reduce((s, n) => s + n, 0) / ns.length).toFixed(1) : "—",
      }
    }).sort((a, b) => (parseFloat(b["Nota prom."]) || -1) - (parseFloat(a["Nota prom."]) || -1))

    abrirReporteImprimible({
      titulo: "Reporte general del curso",
      subtitulo: "Resumen de entregas, cobertura y desempeño",
      resumen: [
        { label: "Estudiantes", valor: totalEst },
        { label: "Ejercicios publicados", valor: totalEj },
        { label: "Entregas", valor: entregasGlobal.length },
        { label: "Cobertura", valor: `${cobertura}%`, color: "#1d6fe0" },
        { label: "Nota promedio", valor: notaProm, color: notaProm !== "—" ? (parseFloat(notaProm) >= 4 ? "#15803d" : "#b91c1c") : undefined },
      ],
      secciones: [
        {
          titulo: "Resumen por ejercicio",
          columnas: [
            { key: "Ejercicio", label: "Ejercicio" },
            { key: "Nivel", label: "Nivel", align: "center" },
            { key: "Tipo", label: "Tipo" },
            { key: "Entregas", label: "Entregas", align: "center" },
            { key: "Faltan", label: "Faltan", align: "center" },
            { key: "Result. medio", label: "Result. medio", align: "center", formato: "porcentaje" },
            { key: "Nota prom.", label: "Nota prom.", align: "center", formato: "nota" },
          ],
          filas: porEj,
        },
        {
          titulo: "Resumen por estudiante",
          columnas: [
            { key: "Estudiante", label: "Estudiante" },
            { key: "Entregas", label: "Entregas", align: "center" },
            { key: "Result. medio", label: "Result. medio", align: "center", formato: "porcentaje" },
            { key: "Nota prom.", label: "Nota prom.", align: "center", formato: "nota" },
          ],
          filas: porEst,
        },
      ],
    })
  }

  // ── CSV — Notas terminales ────────────────────────────────────────
  const csvNotasTerminales = () => {
    const filas = entregasGlobal.map(e => {
      const ej = ejerciciosPublicados.find(x => x.id === e.ejercicio_id) || {}
      return {
        "Estudiante":   e.usuario,
        "Ejercicio":    ej.titulo || `#${e.ejercicio_id}`,
        "Nivel":        ej.nivel ? `N${ej.nivel}` : "—",
        "Tipo":         ej.tipo || "—",
        "Nota":         e.nota ?? "Sin evaluar",
        "Resultado (%)": e.porcentaje != null ? `${e.porcentaje}%` : "—",
        "Estado":       e.estado || "—",
        "Fecha":        formatFecha(e.fecha_entrega),
      }
    })
    descargarCSV(filas, "notas-terminales.csv")
  }

  // ── CSV — Lista estudiantes ───────────────────────────────────────
  const csvListaEstudiantes = () => {
    const filas = estudiantes.map(u => {
      const ens = entregasGlobal.filter(e => e.usuario === u.nombre_usuario)
      const ns  = ens.filter(e => e.nota != null).map(e => e.nota)
      const prom = ns.length ? (ns.reduce((s, n) => s + n, 0) / ns.length).toFixed(1) : "—"
      return {
        "Usuario":            u.nombre_usuario,
        "Nombre":             u.nombre || u.nombre_usuario,
        "Correo":             u.correo || "—",
        "Entregas":           `${ens.length} / ${ejerciciosPublicados.length}`,
        "Nota promedio":      prom,
        "Estado":             prom !== "—" ? (parseFloat(prom) >= 4 ? "Aprobado" : "Reprobado") : "Pendiente",
      }
    })
    descargarCSV(filas, "lista-estudiantes.csv")
  }

  // ── CSV — Resumen aprobación ──────────────────────────────────────
  const csvResumenAprobacion = () => {
    const filas = estudiantes.map(u => {
      const ens      = entregasGlobal.filter(e => e.usuario === u.nombre_usuario)
      const evaluadas = ens.filter(e => e.nota != null)
      const ns       = evaluadas.map(e => e.nota)
      const prom     = ns.length ? (ns.reduce((s, n) => s + n, 0) / ns.length).toFixed(1) : "—"
      return {
        "Estudiante":    u.nombre || u.nombre_usuario,
        "Aprobados":     evaluadas.filter(e => e.nota >= 4).length,
        "Reprobados":    evaluadas.filter(e => e.nota < 4).length,
        "Sin entregar":  Math.max(0, ejerciciosPublicados.length - ens.length),
        "Nota promedio": prom,
        "Estado final":  prom !== "—" ? (parseFloat(prom) >= 4 ? "Aprobado" : "Reprobado") : "Pendiente",
      }
    })
    descargarCSV(filas, "resumen-aprobacion.csv")
  }

  // ── PDF — Notas del curso completo ───────────────────────────────
  const pdfNotasCurso = () => {
    const filas = []
    estudiantes.forEach(u => {
      ejerciciosPublicados.forEach(ej => {
        const e = entregasGlobal.find(x => x.usuario === u.nombre_usuario && x.ejercicio_id === ej.id)
        filas.push({
          "Estudiante": u.nombre || u.nombre_usuario,
          "Ejercicio":  ej.titulo,
          "Nivel":      `N${ej.nivel || 1}`,
          "Tipo":       ej.tipo,
          "Nota":       e?.nota ?? "—",
          "Resultado":  e?.porcentaje != null ? `${e.porcentaje}%` : "—",
          "Estado":     e ? (e.nota != null ? (e.nota >= 4 ? "Aprobado" : "Reprobado") : "Sin evaluar") : "Sin entregar",
        })
      })
    })
    abrirReporteImprimible({
      titulo:    "Notas del curso",
      subtitulo: `${estudiantes.length} estudiantes · ${ejerciciosPublicados.length} ejercicios`,
      columnas: [
        { key: "Estudiante", label: "Estudiante" },
        { key: "Ejercicio",  label: "Ejercicio" },
        { key: "Nivel",      label: "Nivel",      align: "center" },
        { key: "Tipo",       label: "Tipo" },
        { key: "Nota",       label: "Nota",       align: "center", formato: "nota" },
        { key: "Resultado",  label: "Resultado",  align: "center", formato: "porcentaje" },
        { key: "Estado",     label: "Estado",     align: "center", formato: "estado" },
      ],
      filas,
    })
  }

  // ── PDF — Notas individual por estudiante ─────────────────────────
  const pdfNotasIndividual = () => {
    const u = estudiantes.find(x => x.nombre_usuario === estudiantePDFSel)
    if (!u) return
    const filas = ejerciciosPublicados.map(ej => {
      const e = entregasGlobal.find(x => x.usuario === u.nombre_usuario && x.ejercicio_id === ej.id)
      return {
        "Ejercicio": ej.titulo,
        "Nivel":     `N${ej.nivel || 1}`,
        "Tipo":      ej.tipo,
        "Nota":      e?.nota ?? "—",
        "Resultado": e?.porcentaje != null ? `${e.porcentaje}%` : "—",
        "Estado":    e ? (e.nota != null ? (e.nota >= 4 ? "Aprobado" : "Reprobado") : "Sin evaluar") : "Sin entregar",
      }
    })
    const ens  = entregasGlobal.filter(e => e.usuario === u.nombre_usuario)
    const ns   = ens.filter(e => e.nota != null).map(e => e.nota)
    const prom = ns.length ? (ns.reduce((s, n) => s + n, 0) / ns.length).toFixed(1) : "—"
    const color = prom !== "—" ? (parseFloat(prom) >= 4 ? "#15803d" : "#b91c1c") : undefined
    abrirReporteImprimible({
      titulo:    `Notas — ${u.nombre || u.nombre_usuario}`,
      subtitulo: u.correo || "",
      resumen: [
        { label: "Entregas",     valor: `${ens.length} / ${ejerciciosPublicados.length}` },
        { label: "Aprobados",    valor: ns.filter(n => n >= 4).length, color: "#15803d" },
        { label: "Nota promedio", valor: prom, color },
        { label: "Estado final", valor: prom !== "—" ? (parseFloat(prom) >= 4 ? "Aprobado" : "Reprobado") : "Pendiente", color },
      ],
      columnas: [
        { key: "Ejercicio", label: "Ejercicio" },
        { key: "Nivel",     label: "Nivel",     align: "center" },
        { key: "Tipo",      label: "Tipo" },
        { key: "Nota",      label: "Nota",      align: "center", formato: "nota" },
        { key: "Resultado", label: "Resultado", align: "center", formato: "porcentaje" },
        { key: "Estado",    label: "Estado",    align: "center", formato: "estado" },
      ],
      filas,
    })
  }

  // ── PDF — Notas terminales ────────────────────────────────────────
  const pdfNotasTerminales = () => {
    const filas = entregasGlobal.map(e => {
      const ej = ejerciciosPublicados.find(x => x.id === e.ejercicio_id) || {}
      return {
        "Estudiante": e.usuario,
        "Ejercicio":  ej.titulo || `#${e.ejercicio_id}`,
        "Nivel":      ej.nivel ? `N${ej.nivel}` : "—",
        "Tipo":       ej.tipo || "—",
        "Nota":       e.nota ?? "—",
        "Resultado":  e.porcentaje != null ? `${e.porcentaje}%` : "—",
        "Estado":     e.estado || "—",
        "Fecha":      formatFecha(e.fecha_entrega),
      }
    })
    abrirReporteImprimible({
      titulo: "Notas terminales", subtitulo: "Todos los intentos con sus calificaciones",
      columnas: [
        { key: "Estudiante", label: "Estudiante" },
        { key: "Ejercicio",  label: "Ejercicio" },
        { key: "Nivel",      label: "Nivel",     align: "center" },
        { key: "Tipo",       label: "Tipo" },
        { key: "Nota",       label: "Nota",      align: "center", formato: "nota" },
        { key: "Resultado",  label: "Resultado", align: "center", formato: "porcentaje" },
        { key: "Estado",     label: "Estado",    align: "center", formato: "estado" },
        { key: "Fecha",      label: "Fecha" },
      ],
      filas,
    })
  }

  // ── PDF — Lista estudiantes ───────────────────────────────────────
  const pdfListaEstudiantes = () => {
    const filas = estudiantes.map(u => {
      const ens  = entregasGlobal.filter(e => e.usuario === u.nombre_usuario)
      const ns   = ens.filter(e => e.nota != null).map(e => e.nota)
      const prom = ns.length ? (ns.reduce((s, n) => s + n, 0) / ns.length).toFixed(1) : "—"
      return {
        "Nombre":        u.nombre || u.nombre_usuario,
        "Correo":        u.correo || "—",
        "Entregas":      `${ens.length} / ${ejerciciosPublicados.length}`,
        "Nota promedio": prom,
        "Estado":        prom !== "—" ? (parseFloat(prom) >= 4 ? "Aprobado" : "Reprobado") : "Pendiente",
      }
    })
    abrirReporteImprimible({
      titulo: "Lista de estudiantes", subtitulo: `${estudiantes.length} estudiantes registrados`,
      columnas: [
        { key: "Nombre",        label: "Nombre" },
        { key: "Correo",        label: "Correo" },
        { key: "Entregas",      label: "Entregas",      align: "center" },
        { key: "Nota promedio", label: "Nota promedio", align: "center", formato: "nota" },
        { key: "Estado",        label: "Estado",        align: "center", formato: "estado" },
      ],
      filas,
    })
  }

  // ── PDF — Resumen aprobación ──────────────────────────────────────
  const pdfResumenAprobacion = () => {
    const filas = estudiantes.map(u => {
      const ens      = entregasGlobal.filter(e => e.usuario === u.nombre_usuario)
      const evaluadas = ens.filter(e => e.nota != null)
      const ns       = evaluadas.map(e => e.nota)
      const prom     = ns.length ? (ns.reduce((s, n) => s + n, 0) / ns.length).toFixed(1) : "—"
      return {
        "Estudiante":    u.nombre || u.nombre_usuario,
        "Aprobados":     evaluadas.filter(e => e.nota >= 4).length,
        "Reprobados":    evaluadas.filter(e => e.nota < 4).length,
        "Sin entregar":  Math.max(0, ejerciciosPublicados.length - ens.length),
        "Nota promedio": prom,
        "Estado final":  prom !== "—" ? (parseFloat(prom) >= 4 ? "Aprobado" : "Reprobado") : "Pendiente",
      }
    })
    abrirReporteImprimible({
      titulo: "Resumen de aprobación", subtitulo: "Por estudiante: aprobados, reprobados y promedio",
      columnas: [
        { key: "Estudiante",    label: "Estudiante" },
        { key: "Aprobados",     label: "Aprobados",     align: "center" },
        { key: "Reprobados",    label: "Reprobados",    align: "center" },
        { key: "Sin entregar",  label: "Sin entregar",  align: "center" },
        { key: "Nota promedio", label: "Nota promedio", align: "center", formato: "nota" },
        { key: "Estado final",  label: "Estado final",  align: "center", formato: "estado" },
      ],
      filas,
    })
  }

  // ── CSV/PDF — Notas por ejercicio ────────────────────────────────
  const filasNotasPorEjercicio = () => {
    if (!ejercicioSeleccionado) return []
    return estudiantes.map(u => {
      const e = entregasGlobal.find(x => x.usuario === u.nombre_usuario && x.ejercicio_id === ejercicioSeleccionado.id)
      return {
        "Estudiante": u.nombre || u.nombre_usuario,
        "Correo":     u.correo || "—",
        "Nota":       e?.nota ?? "—",
        "Resultado":  e?.porcentaje != null ? `${e.porcentaje}%` : "—",
        "Estado":     e ? (e.nota != null ? (e.nota >= 4 ? "Aprobado" : "Reprobado") : "Sin evaluar") : "Sin entregar",
        "Fecha":      formatFecha(e?.fecha_entrega),
      }
    })
  }

  const csvNotasPorEjercicio = () => {
    const filas = filasNotasPorEjercicio()
    if (!filas.length || !ejercicioSeleccionado) return
    descargarCSV(filas, `notas-${ejercicioSeleccionado.titulo.toLowerCase().replace(/\s+/g, "-").slice(0, 40)}.csv`)
  }

  const pdfNotasPorEjercicio = () => {
    const filas = filasNotasPorEjercicio()
    if (!filas.length || !ejercicioSeleccionado) return
    const ns   = filas.filter(f => f["Nota"] !== "—").map(f => parseFloat(f["Nota"])).filter(n => !isNaN(n))
    const prom = ns.length ? (ns.reduce((s, n) => s + n, 0) / ns.length).toFixed(1) : "—"
    const sinEntregar = filas.filter(f => f["Estado"] === "Sin entregar").length
    abrirReporteImprimible({
      titulo:    ejercicioSeleccionado.titulo,
      subtitulo: `Nivel N${ejercicioSeleccionado.nivel || 1} · ${ejercicioSeleccionado.tipo}`,
      resumen: [
        { label: "Estudiantes",  valor: estudiantes.length },
        { label: "Con nota",     valor: ns.length },
        { label: "Sin entregar", valor: sinEntregar },
        { label: "Promedio",     valor: prom, color: prom !== "—" ? (parseFloat(prom) >= 4 ? "#15803d" : "#b91c1c") : undefined },
      ],
      columnas: [
        { key: "Estudiante", label: "Estudiante" },
        { key: "Nota",       label: "Nota",      align: "center", formato: "nota" },
        { key: "Resultado",  label: "Resultado", align: "center", formato: "porcentaje" },
        { key: "Estado",     label: "Estado",    align: "center", formato: "estado" },
        { key: "Fecha",      label: "Fecha entrega" },
      ],
      filas,
    })
  }

  // ── Estilos internos ─────────────────────────────────────────────
  const badge = (txt, color, bg, bd) => (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 6,
      color, background: bg, border: `1px solid ${bd}`, whiteSpace: "nowrap" }}>{txt}</span>
  )

  return (
    <GuardSesion>
      <div style={{ minHeight: "100vh", background: "var(--fondo)", fontFamily: "Inter, sans-serif" }}>
        <BarraSuperior paginaActiva="estadisticas" />
        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

          {/* Cabecera */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#f0f6fc", letterSpacing: "-0.5px" }}>◈ Exportar</h1>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "#8b949e" }}>Reportes e informes del curso: PDFs de análisis y descarga de notas en CSV y PDF.</p>
          </div>

          {/* Tabs principales: Informes | Notas */}
          <div style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: "1px solid #21262d" }}>
            {[
              { id: "informes", label: "📊 Informes" },
              { id: "notas",    label: "🎓 Notas" },
            ].map(({ id, label }) => (
              <button key={id} onClick={() => setTabPrincipal(id)} type="button" style={{
                padding: "11px 22px", fontSize: 14, fontWeight: 700, background: "transparent", border: "none",
                borderBottom: tabPrincipal === id ? "2px solid #2997ff" : "2px solid transparent",
                color: tabPrincipal === id ? "#2997ff" : "#8b949e", cursor: "pointer", marginBottom: -1,
              }}>{label}</button>
            ))}
          </div>

          {cargando ? <div style={estilos.cargando}>Cargando…</div> : error ? <div style={estilos.errorMsg}>{error}</div> : (
            <>
              {/* ══════════════ TAB: INFORMES ══════════════ */}
              {tabPrincipal === "informes" && (
                <>
                  {/* Card reporte PDF general */}
                  <div style={{ ...estilos.card, borderLeft: "4px solid #a78bfa", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
                    <div style={{ fontSize: 30 }}>📋</div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, color: "#f0f6fc", fontSize: 15 }}>Reporte general del curso</div>
                      <div style={{ fontSize: 13, color: "#8b949e", marginTop: 3 }}>
                        {estudiantes.length} estudiantes · {ejerciciosPublicados.length} ejercicios · {entregasGlobal.length} entregas. Cobertura, faltantes y promedios por ejercicio y por estudiante.
                      </div>
                    </div>
                    <button onClick={reporteGeneral} style={{ ...estilos.btnReporte, padding: "10px 18px", fontSize: 13 }}>⎙ Exportar PDF general</button>
                  </div>

                  {/* Sub-tabs: Por estudiante | Por ejercicio */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 22, borderBottom: "1px solid #21262d" }}>
                    {[{ id: "estudiante", label: "Por estudiante" }, { id: "ejercicio", label: "Por ejercicio" }].map(({ id, label }) => (
                      <button key={id} onClick={() => setVista(id)} type="button" style={{
                        padding: "10px 20px", fontSize: 14, fontWeight: 600, background: "transparent", border: "none",
                        borderBottom: vista === id ? "2px solid #2997ff" : "2px solid transparent",
                        color: vista === id ? "#2997ff" : "#8b949e", cursor: "pointer", marginBottom: -1,
                      }}>{label}</button>
                    ))}
                  </div>

                  {vista === "ejercicio"
                    ? <VistaPorEjercicio ejercicios={ejercicios} estudiantes={estudiantes} statsPorEj={statsPorEj} />
                    : <VistaPorEstudiante estudiantes={estudiantes} ejerciciosPublicados={ejerciciosPublicados} />}
                </>
              )}

              {/* ══════════════ TAB: NOTAS ══════════════ */}
              {tabPrincipal === "notas" && (
                <>
                  {/* Fila 1 — 3 tarjetas CSV */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 20 }}>
                    {[
                      {
                        icono: "📊", titulo: "Notas terminales",
                        desc: "Todos los intentos con sus calificaciones",
                        color: "#22d3ee", accionCSV: csvNotasTerminales, accionPDF: pdfNotasTerminales,
                      },
                      {
                        icono: "👥", titulo: "Lista estudiantes",
                        desc: "Todos los estudiantes registrados en el sistema",
                        color: "#a78bfa", accionCSV: csvListaEstudiantes, accionPDF: pdfListaEstudiantes,
                      },
                      {
                        icono: "🏆", titulo: "Resumen aprobación",
                        desc: "Por estudiante: aprobados, reprobados y promedio",
                        color: "#f59e0b", accionCSV: csvResumenAprobacion, accionPDF: pdfResumenAprobacion,
                      },
                    ].map(({ icono, titulo, desc, color, accionCSV, accionPDF }) => (
                      <div key={titulo} style={{ ...estilos.card, borderTop: `3px solid ${color}` }}>
                        <div style={{ fontSize: 26, marginBottom: 10 }}>{icono}</div>
                        <div style={{ fontWeight: 700, color: "#f0f6fc", fontSize: 14, marginBottom: 4 }}>{titulo}</div>
                        <div style={{ fontSize: 12.5, color: "#8b949e", flex: 1, marginBottom: 14 }}>{desc}</div>
                        {/* CSV */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          {badge("CSV", color, `${color}18`, `${color}44`)}
                          <button onClick={accionCSV} style={{ ...estilos.btnSecundario, fontSize: 12, padding: "5px 13px" }}>
                            Descargar ↓
                          </button>
                        </div>
                        {/* PDF */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {badge("PDF", "#818cf8", "#818cf818", "#818cf844")}
                          <button onClick={accionPDF} style={{ ...estilos.btnReporte, marginLeft: 0, fontSize: 12, padding: "5px 13px" }}>
                            ⎙ PDF ↓
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Fila 2 — tarjeta notas por ejercicio + tarjeta notas individuales */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                    {/* Notas por ejercicio con filtros */}
                    <div style={{ ...estilos.card, borderTop: "3px solid #818cf8" }}>
                      <div style={{ fontSize: 26, marginBottom: 10 }}>📄</div>
                      <div style={{ fontWeight: 700, color: "#f0f6fc", fontSize: 14, marginBottom: 4 }}>Notas por ejercicio</div>
                      <div style={{ fontSize: 12.5, color: "#8b949e", marginBottom: 14 }}>
                        Filtra por nivel y ejercicio para exportar las notas de todos los estudiantes en esa actividad.
                      </div>
                      {/* Selectores en cascada: Modo → Nivel → Ejercicio */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 10, marginBottom: 14 }}>
                        <div>
                          <label style={{ fontSize: 11, color: "#6e7681", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>Modo</label>
                          <select
                            value={modoFiltro}
                            onChange={e => handleModoChange(e.target.value)}
                            style={{ ...estilos.input, fontSize: 13, padding: "7px 10px", width: "100%" }}
                          >
                            <option value="ataque">⚔ Ataque</option>
                            <option value="defensa">🛡 Defensa</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: "#6e7681", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>Nivel</label>
                          <select
                            value={nivelFiltro ?? ""}
                            onChange={e => handleNivelChange(Number(e.target.value))}
                            style={{ ...estilos.input, fontSize: 13, padding: "7px 10px", width: "100%" }}
                          >
                            {nivelesDisponibles.map(n => <option key={n} value={n}>Nivel {n}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: "#6e7681", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>Ejercicio</label>
                          <select
                            value={ejercicioFiltroId ?? ""}
                            onChange={e => setEjercicioFiltroId(Number(e.target.value))}
                            style={{ ...estilos.input, fontSize: 13, padding: "7px 10px", width: "100%" }}
                          >
                            {ejerciciosPorNivel.map(ej => <option key={ej.id} value={ej.id}>{ej.titulo}</option>)}
                          </select>
                        </div>
                      </div>
                      {/* Botones CSV + PDF */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {badge("CSV", "#818cf8", "#818cf818", "#818cf844")}
                        <button onClick={csvNotasPorEjercicio} disabled={!ejercicioSeleccionado} style={{ ...estilos.btnSecundario, fontSize: 12, padding: "5px 13px", opacity: ejercicioSeleccionado ? 1 : 0.5 }}>
                          CSV ↓
                        </button>
                        {badge("PDF", "#818cf8", "#818cf818", "#818cf844")}
                        <button onClick={pdfNotasPorEjercicio} disabled={!ejercicioSeleccionado} style={{ ...estilos.btnReporte, marginLeft: 0, fontSize: 12, padding: "5px 13px", opacity: ejercicioSeleccionado ? 1 : 0.5 }}>
                          ⎙ PDF ↓
                        </button>
                      </div>
                    </div>

                    {/* PDF individual */}
                    <div style={{ ...estilos.card, borderTop: "3px solid #34d399" }}>
                      <div style={{ fontSize: 26, marginBottom: 10 }}>🎓</div>
                      <div style={{ fontWeight: 700, color: "#f0f6fc", fontSize: 14, marginBottom: 4 }}>Notas individuales — PDF</div>
                      <div style={{ fontSize: 12.5, color: "#8b949e", marginBottom: 14 }}>
                        Informe personal por estudiante: nota, resultado e intentos por ejercicio.
                      </div>
                      <label style={{ fontSize: 11, color: "#6e7681", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>Estudiante</label>
                      <select
                        value={estudiantePDFSel}
                        onChange={e => setEstudiantePDFSel(e.target.value)}
                        style={{ ...estilos.input, fontSize: 13, marginBottom: 14, padding: "8px 12px" }}
                      >
                        {estudiantes.map(u => (
                          <option key={u.nombre_usuario} value={u.nombre_usuario}>
                            {u.nombre || u.nombre_usuario}
                          </option>
                        ))}
                      </select>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {badge("PDF", "#34d399", "#34d39918", "#34d39944")}
                        <button onClick={pdfNotasIndividual} disabled={!estudiantePDFSel} style={{ ...estilos.btnReporte, marginLeft: 0, fontSize: 12.5, padding: "7px 16px", opacity: estudiantePDFSel ? 1 : 0.5 }}>
                          ⎙ Exportar PDF individual
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </GuardSesion>
  )
}

// ═══════════════════════════════════════════════════════════════════
const estilos = {
  cargando: { color: "#8b949e", textAlign: "center", padding: 60, fontSize: 14 },
  errorMsg: { color: "#f87171", textAlign: "center", padding: 40, fontSize: 14, background: "rgba(248,81,73,0.08)", borderRadius: 10 },
  card: { background: "#161b22", border: "1px solid #30363d", borderRadius: 14, padding: "18px 22px", display: "flex", flexDirection: "column" },
  input: { padding: "10px 14px", fontSize: 14, background: "rgba(255,255,255,0.05)", border: "1px solid #30363d", borderRadius: 10, color: "#f0f6fc", outline: "none" },
  btnSecundario: { padding: "9px 16px", fontSize: 13, fontWeight: 600, background: "#21262d", border: "1px solid #30363d", borderRadius: 8, color: "#c9d1d9", cursor: "pointer" },
  btnPag: { padding: "6px 12px", fontSize: 13, fontWeight: 600, background: "#21262d", border: "1px solid #30363d", borderRadius: 8, color: "#c9d1d9", cursor: "pointer" },
  btnReporte: { marginLeft: "auto", padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#2997ff,#5e5ce6)" },
  cajaMetrica: { background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: "13px 15px" },
  cajaLabel: { fontFamily: "monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", color: "#6e7681", textTransform: "uppercase", display: "block", marginBottom: 8 },
  cajaValor: { fontSize: 19, fontWeight: 900, color: "#f0f6fc" },
  cajaMini: { fontSize: 11, color: "#8b949e", marginTop: 4, fontFamily: "monospace" },
  miniStat: { textAlign: "center", padding: "7px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 },
  miniStatV: { fontSize: 14, fontWeight: 900, fontFamily: "monospace", color: "#f0f6fc", lineHeight: 1.2 },
  miniStatL: { fontSize: 9, color: "#6e7681", textTransform: "uppercase", letterSpacing: "0.05em" },
}
