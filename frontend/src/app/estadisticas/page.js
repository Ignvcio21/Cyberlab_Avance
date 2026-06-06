"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import GuardSesion from "../componentes/GuardSesion"
import BarraSuperior from "../componentes/BarraSuperior"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"

const getAuthHeaders = () => ({
  "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
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

// ── Colores consistentes por rol ──────────────────────────────────
const colorRol = { admin: "#f59e0b", docente: "#2997ff", estudiante: "#22c55e" }

// ── Descarga CSV ──────────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════
// TAB 1 — DASHBOARD
// ═══════════════════════════════════════════════════════════════════
function TabDashboard() {
  const [usuarios, setUsuarios] = useState([])
  const [intentos, setIntentos] = useState([])
  const [ejercicios, setEjercicios] = useState([])
  const [entregas, setEntregas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const h = getAuthHeaders()
    setCargando(true)
    Promise.all([
      fetch(`${API_URL}/admin/usuarios`, { headers: h }).then(r => r.json()),
      fetch(`${API_URL}/docente/intentos`, { headers: h }).then(r => r.json()),
      fetch(`${API_URL}/ejercicios-docente`, { headers: h }).then(r => r.json()),
    ]).then(([us, it, ej]) => {
      setUsuarios(Array.isArray(us) ? us : [])
      setIntentos(it?.intentos || [])
      setEjercicios(ej?.ejercicios || [])
    }).catch(() => setError("No se pudo cargar los datos"))
      .finally(() => setCargando(false))
  }, [])

  const stats = useMemo(() => {
    const estudiantes = usuarios.filter(u => u.rol === "estudiante").length
    const docentes = usuarios.filter(u => u.rol === "docente").length
    const admins = usuarios.filter(u => u.rol === "admin").length

    const evaluados = intentos.filter(it => it.nota != null)
    const aprobados = evaluados.filter(it => it.nota >= 4.0)
    const tasaAprobacion = evaluados.length ? Math.round((aprobados.length / evaluados.length) * 100) : 0
    const notaPromedio = evaluados.length
      ? (evaluados.reduce((s, it) => s + it.nota, 0) / evaluados.length).toFixed(1)
      : "—"

    // Notas por estudiante para ranking
    const notasPorUsuario = {}
    evaluados.forEach(it => {
      if (!notasPorUsuario[it.usuario]) notasPorUsuario[it.usuario] = []
      notasPorUsuario[it.usuario].push(it.nota)
    })
    const ranking = Object.entries(notasPorUsuario)
      .map(([u, notas]) => ({ usuario: u, promedio: (notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(1), total: notas.length }))
      .sort((a, b) => b.promedio - a.promedio)
      .slice(0, 5)

    // Stats por ejercicio (terminal)
    const porEjercicio = {}
    intentos.forEach(it => {
      const k = it.descripcion_ejercicio || `Ejercicio ${it.ejercicio_id}`
      if (!porEjercicio[k]) porEjercicio[k] = { total: 0, evaluados: 0, aprobados: 0, sumaNotas: 0 }
      porEjercicio[k].total++
      if (it.nota != null) {
        porEjercicio[k].evaluados++
        porEjercicio[k].sumaNotas += it.nota
        if (it.nota >= 4.0) porEjercicio[k].aprobados++
      }
    })
    const statsEj = Object.entries(porEjercicio).map(([nombre, d]) => ({
      nombre: nombre.length > 40 ? nombre.slice(0, 37) + "…" : nombre,
      intentos: d.total,
      evaluados: d.evaluados,
      promedio: d.evaluados ? (d.sumaNotas / d.evaluados).toFixed(1) : "—",
      aprobacion: d.evaluados ? Math.round((d.aprobados / d.evaluados) * 100) : 0,
    }))

    return { estudiantes, docentes, admins, tasaAprobacion, notaPromedio, ranking, statsEj }
  }, [usuarios, intentos])

  if (cargando) return <div style={estilos.cargando}>Cargando estadísticas…</div>
  if (error) return <div style={estilos.errorMsg}>{error}</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Cards resumen */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        {[
          { label: "Estudiantes", valor: stats.estudiantes, color: "#22c55e" },
          { label: "Docentes", valor: stats.docentes, color: "#2997ff" },
          { label: "Nota promedio", valor: stats.notaPromedio, color: "#f59e0b" },
          { label: "Tasa aprobación", valor: `${stats.tasaAprobacion}%`, color: "#a78bfa" },
        ].map(({ label, valor, color }) => (
          <div key={label} style={{ ...estilos.card, borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: 32, fontWeight: 900, color }}>{valor}</div>
            <div style={{ fontSize: 13, color: "#8b949e", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Tabla ejercicios */}
        <div style={estilos.panel}>
          <h3 style={estilos.panelTitulo}>Rendimiento por ejercicio (terminal)</h3>
          {stats.statsEj.length === 0 ? (
            <p style={{ color: "#8b949e", fontSize: 13 }}>Sin datos aún.</p>
          ) : (
            <table style={estilos.tabla}>
              <thead>
                <tr>
                  {["Ejercicio", "Intentos", "Promedio", "Aprobación"].map(h => (
                    <th key={h} style={estilos.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.statsEj.map((ej, i) => (
                  <tr key={i} style={i % 2 === 0 ? estilos.trPar : {}}>
                    <td style={{ ...estilos.td, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={ej.nombre}>{ej.nombre}</td>
                    <td style={{ ...estilos.td, textAlign: "center" }}>{ej.intentos}</td>
                    <td style={{ ...estilos.td, textAlign: "center", color: ej.promedio !== "—" && parseFloat(ej.promedio) >= 4 ? "#22c55e" : "#f87171" }}>
                      {ej.promedio}
                    </td>
                    <td style={{ ...estilos.td, textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ flex: 1, height: 6, background: "#21262d", borderRadius: 3 }}>
                          <div style={{ width: `${ej.aprobacion}%`, height: "100%", background: ej.aprobacion >= 60 ? "#22c55e" : "#f59e0b", borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, color: "#8b949e", minWidth: 32 }}>{ej.aprobacion}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Ranking top estudiantes */}
        <div style={estilos.panel}>
          <h3 style={estilos.panelTitulo}>Top 5 estudiantes</h3>
          {stats.ranking.length === 0 ? (
            <p style={{ color: "#8b949e", fontSize: 13 }}>Sin evaluaciones registradas.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stats.ranking.map((est, i) => (
                <div key={est.usuario} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#0d1117", borderRadius: 10, border: "1px solid #21262d" }}>
                  <div style={{ fontSize: 20, minWidth: 32, textAlign: "center" }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#f0f6fc", fontSize: 14 }}>{est.usuario}</div>
                    <div style={{ fontSize: 12, color: "#8b949e" }}>{est.total} evaluacion{est.total !== 1 ? "es" : ""}</div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: parseFloat(est.promedio) >= 4 ? "#22c55e" : "#f87171" }}>
                    {est.promedio}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resumen roles */}
          <div style={{ marginTop: 20, padding: "14px 16px", background: "#0d1117", borderRadius: 10, border: "1px solid #21262d" }}>
            <div style={{ fontSize: 12, color: "#8b949e", marginBottom: 10, fontWeight: 600 }}>USUARIOS EN EL SISTEMA</div>
            {[
              { label: "Estudiantes", n: stats.estudiantes, color: colorRol.estudiante },
              { label: "Docentes", n: stats.docentes, color: colorRol.docente },
              { label: "Administradores", n: stats.admins, color: colorRol.admin },
            ].map(({ label, n, color }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "#c9d1d9" }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// TAB 2 — AUDITORÍA
// ═══════════════════════════════════════════════════════════════════
function TabAuditoria() {
  const [logs, setLogs] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [pagina, setPagina] = useState(1)
  const POR_PAGINA = 20

  useEffect(() => {
    setCargando(true)
    fetch(`${API_URL}/admin/logs?limite=200`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => setLogs(d.logs || []))
      .catch(() => setError("No se pudieron cargar los logs"))
      .finally(() => setCargando(false))
  }, [])

  const filtrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    if (!t) return logs
    return logs.filter(l =>
      l.usuario?.toLowerCase().includes(t) ||
      l.comando?.toLowerCase().includes(t) ||
      l.resultado?.toLowerCase().includes(t)
    )
  }, [logs, busqueda])

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA)
  const pagActual = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const handleBusqueda = (v) => { setBusqueda(v); setPagina(1) }

  const colorCmd = (cmd) => {
    if (!cmd) return "#8b949e"
    if (cmd.includes("error") || cmd.includes("ERROR")) return "#f87171"
    if (cmd.includes("pedir-ayuda")) return "#f59e0b"
    if (cmd.includes("login") || cmd.includes("sesion")) return "#2997ff"
    return "#c9d1d9"
  }

  if (cargando) return <div style={estilos.cargando}>Cargando logs…</div>
  if (error) return <div style={estilos.errorMsg}>{error}</div>

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={busqueda}
          onChange={e => handleBusqueda(e.target.value)}
          placeholder="Buscar por usuario, comando o resultado…"
          style={{ ...estilos.input, flex: 1, minWidth: 220 }}
        />
        <span style={{ fontSize: 13, color: "#8b949e", whiteSpace: "nowrap" }}>
          {filtrados.length} registro{filtrados.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => descargarCSV(filtrados.map(l => ({ id: l.id, usuario: l.usuario, rol: l.rol, comando: l.comando, resultado: l.resultado, fecha: l.fecha })), "logs-auditoria.csv")}
          style={estilos.btnSecundario}
        >
          ⬇ CSV
        </button>
      </div>

      {pagActual.length === 0 ? (
        <div style={{ color: "#8b949e", textAlign: "center", padding: 40, fontSize: 14 }}>
          {busqueda ? "No se encontraron registros." : "No hay acciones registradas aún."}
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ ...estilos.tabla, width: "100%" }}>
              <thead>
                <tr>
                  {["#", "Fecha", "Usuario", "Rol", "Comando", "Resultado"].map(h => (
                    <th key={h} style={estilos.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagActual.map((l, i) => (
                  <tr key={l.id} style={i % 2 === 0 ? estilos.trPar : {}}>
                    <td style={{ ...estilos.td, color: "#6e7681", fontSize: 11 }}>{l.id}</td>
                    <td style={{ ...estilos.td, fontSize: 12, whiteSpace: "nowrap" }}>{formatFecha(l.fecha)}</td>
                    <td style={{ ...estilos.td, fontWeight: 700, color: "#f0f6fc" }}>{l.usuario || "—"}</td>
                    <td style={{ ...estilos.td }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: colorRol[l.rol] || "#8b949e", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 12 }}>
                        {l.rol || "—"}
                      </span>
                    </td>
                    <td style={{ ...estilos.td, fontFamily: "monospace", fontSize: 12, color: colorCmd(l.comando), maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l.comando}>
                      {l.comando}
                    </td>
                    <td style={{ ...estilos.td, fontSize: 12, color: "#8b949e", maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l.resultado}>
                      {l.resultado || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
              <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} style={estilos.btnPag}>‹</button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPagina(p)} style={{ ...estilos.btnPag, ...(p === pagina ? { background: "#2997ff", color: "#fff" } : {}) }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} style={estilos.btnPag}>›</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// TAB 3 — EXPORTAR
// ═══════════════════════════════════════════════════════════════════
function TabExportar() {
  const [intentos, setIntentos] = useState([])
  const [entregas, setEntregas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("todos")

  useEffect(() => {
    const h = getAuthHeaders()
    setCargando(true)
    Promise.all([
      fetch(`${API_URL}/docente/intentos`, { headers: h }).then(r => r.json()),
      fetch(`${API_URL}/admin/usuarios`, { headers: h }).then(r => r.json()),
    ]).then(([it, us]) => {
      setIntentos(it?.intentos || [])
      setUsuarios(Array.isArray(us) ? us.filter(u => u.rol === "estudiante") : [])
    }).catch(() => setError("No se pudieron cargar los datos"))
      .finally(() => setCargando(false))
  }, [])

  const filasNotas = useMemo(() => {
    return intentos
      .filter(it => {
        if (filtroEstado === "evaluados") return it.nota != null
        if (filtroEstado === "pendientes") return it.nota == null
        if (filtroEstado === "aprobados") return it.nota != null && it.nota >= 4.0
        if (filtroEstado === "reprobados") return it.nota != null && it.nota < 4.0
        return true
      })
      .map(it => ({
        "Usuario": it.usuario || "—",
        "Ejercicio": it.descripcion_ejercicio || `Ej ${it.ejercicio_id}`,
        "Estado": it.estado || "—",
        "Porcentaje": `${it.porcentaje}%`,
        "Tiempo (seg)": it.tiempo_seg ?? "—",
        "Errores": it.errores ?? "—",
        "Nota": it.nota != null ? it.nota : "Sin evaluar",
        "Comentarios": it.comentarios || "—",
        "Fecha inicio": formatFecha(it.fecha_inicio),
        "Fecha fin": formatFecha(it.fecha_fin),
      }))
  }, [intentos, filtroEstado])

  if (cargando) return <div style={estilos.cargando}>Cargando datos…</div>
  if (error) return <div style={estilos.errorMsg}>{error}</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Tarjetas de descarga */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {[
          {
            titulo: "Notas terminales",
            descripcion: "Todos los intentos con sus calificaciones",
            icono: "📊",
            color: "#22c55e",
            accion: () => descargarCSV(filasNotas, "notas-terminales.csv"),
            formato: "CSV",
          },
          {
            titulo: "Lista estudiantes",
            descripcion: "Todos los estudiantes registrados en el sistema",
            icono: "👥",
            color: "#2997ff",
            accion: () => descargarCSV(
              usuarios.map(u => ({ "ID": u.id, "Usuario": u.nombre_usuario, "Nombre": u.nombre || "—", "Correo": u.correo || "—", "Registro": formatFecha(u.fecha_creacion) })),
              "estudiantes.csv"
            ),
            formato: "CSV",
          },
          {
            titulo: "Resumen aprobación",
            descripcion: "Por estudiante: promedio y estado final",
            icono: "🏆",
            color: "#a78bfa",
            accion: () => {
              const porUsuario = {}
              intentos.forEach(it => {
                if (it.nota == null) return
                if (!porUsuario[it.usuario]) porUsuario[it.usuario] = []
                porUsuario[it.usuario].push(it.nota)
              })
              const filas = Object.entries(porUsuario).map(([u, notas]) => {
                const prom = (notas.reduce((s, n) => s + n, 0) / notas.length)
                return { "Estudiante": u, "Promedio": prom.toFixed(1), "Total evaluaciones": notas.length, "Estado": prom >= 4.0 ? "Aprobado" : "Reprobado" }
              }).sort((a, b) => parseFloat(b.Promedio) - parseFloat(a.Promedio))
              descargarCSV(filas, "resumen-aprobacion.csv")
            },
            formato: "CSV",
          },
        ].map(({ titulo, descripcion, icono, color, accion, formato }) => (
          <div key={titulo} style={{ ...estilos.card, borderLeft: `4px solid ${color}`, cursor: "pointer", transition: "transform 0.15s" }}
            onClick={accion}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>{icono}</div>
            <div style={{ fontWeight: 700, color: "#f0f6fc", fontSize: 15, marginBottom: 6 }}>{titulo}</div>
            <div style={{ fontSize: 13, color: "#8b949e", lineHeight: 1.5, marginBottom: 14 }}>{descripcion}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}22`, padding: "2px 10px", borderRadius: 12, border: `1px solid ${color}44` }}>{formato}</span>
              <span style={{ fontSize: 12, color: "#8b949e" }}>Descargar ↓</span>
            </div>
          </div>
        ))}
      </div>

      {/* Vista previa */}
      <div style={estilos.panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ ...estilos.panelTitulo, marginBottom: 0 }}>Vista previa — Notas terminales</h3>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { val: "todos", label: "Todos" },
              { val: "evaluados", label: "Evaluados" },
              { val: "pendientes", label: "Pendientes" },
              { val: "aprobados", label: "Aprobados" },
              { val: "reprobados", label: "Reprobados" },
            ].map(({ val, label }) => (
              <button key={val} onClick={() => setFiltroEstado(val)}
                style={{ ...estilos.btnPag, ...(filtroEstado === val ? { background: "#2997ff", color: "#fff" } : {}) }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {filasNotas.length === 0 ? (
          <p style={{ color: "#8b949e", fontSize: 13 }}>Sin datos para el filtro seleccionado.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ ...estilos.tabla, width: "100%" }}>
              <thead>
                <tr>
                  {["Usuario", "Ejercicio", "Estado", "%", "Tiempo", "Nota", "Comentarios", "Fecha fin"].map(h => (
                    <th key={h} style={estilos.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filasNotas.slice(0, 30).map((f, i) => (
                  <tr key={i} style={i % 2 === 0 ? estilos.trPar : {}}>
                    <td style={{ ...estilos.td, fontWeight: 700 }}>{f["Usuario"]}</td>
                    <td style={{ ...estilos.td, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }} title={f["Ejercicio"]}>{f["Ejercicio"]}</td>
                    <td style={{ ...estilos.td, fontSize: 12 }}>{f["Estado"]}</td>
                    <td style={{ ...estilos.td, textAlign: "center" }}>{f["Porcentaje"]}</td>
                    <td style={{ ...estilos.td, textAlign: "center", fontSize: 12 }}>{f["Tiempo (seg)"]}</td>
                    <td style={{ ...estilos.td, textAlign: "center", fontWeight: 700, color: f["Nota"] === "Sin evaluar" ? "#8b949e" : parseFloat(f["Nota"]) >= 4 ? "#22c55e" : "#f87171" }}>
                      {f["Nota"]}
                    </td>
                    <td style={{ ...estilos.td, fontSize: 12, color: "#8b949e", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={f["Comentarios"]}>{f["Comentarios"]}</td>
                    <td style={{ ...estilos.td, fontSize: 12, whiteSpace: "nowrap" }}>{f["Fecha fin"]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filasNotas.length > 30 && (
              <div style={{ textAlign: "center", padding: "10px 0", fontSize: 13, color: "#8b949e" }}>
                Mostrando 30 de {filasNotas.length} — descarga el CSV para ver todos.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// ESTILOS COMPARTIDOS
// ═══════════════════════════════════════════════════════════════════
const estilos = {
  cargando: { color: "#8b949e", textAlign: "center", padding: 60, fontSize: 14 },
  errorMsg: { color: "#f87171", textAlign: "center", padding: 40, fontSize: 14, background: "rgba(248,81,73,0.08)", borderRadius: 10 },
  card: {
    background: "#161b22", border: "1px solid #30363d", borderRadius: 14,
    padding: "20px 22px", display: "flex", flexDirection: "column",
  },
  panel: {
    background: "#161b22", border: "1px solid #30363d", borderRadius: 14,
    padding: "20px 22px",
  },
  panelTitulo: { margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#f0f6fc" },
  tabla: { borderCollapse: "collapse", width: "100%", fontSize: 13 },
  th: { padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#8b949e", borderBottom: "1px solid #21262d", background: "#0d1117", textTransform: "uppercase", letterSpacing: "0.05em" },
  td: { padding: "10px 12px", color: "#c9d1d9", borderBottom: "1px solid #21262d" },
  trPar: { background: "rgba(255,255,255,0.015)" },
  input: {
    padding: "10px 14px", fontSize: 14, background: "#0d1117",
    border: "1px solid #30363d", borderRadius: 10, color: "#f0f6fc", outline: "none",
  },
  btnSecundario: {
    padding: "9px 16px", fontSize: 13, fontWeight: 600,
    background: "#21262d", border: "1px solid #30363d", borderRadius: 8,
    color: "#c9d1d9", cursor: "pointer",
  },
  btnPag: {
    padding: "6px 12px", fontSize: 13, fontWeight: 600,
    background: "#21262d", border: "1px solid #30363d", borderRadius: 8,
    color: "#c9d1d9", cursor: "pointer",
  },
}

// ═══════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
const TABS = [
  { id: "dashboard", label: "▸ Resumen general", Componente: TabDashboard },
  { id: "auditoria", label: "▸ Auditoría", Componente: TabAuditoria },
  { id: "exportar", label: "▸ Exportar notas", Componente: TabExportar },
]

export default function EstadisticasPage() {
  const router = useRouter()
  const [tabActiva, setTabActiva] = useState("dashboard")
  const [rol, setRol] = useState("")

  useEffect(() => {
    setRol(localStorage.getItem("rol_usuario") || "")
  }, [])

  const ComponenteActivo = TABS.find(t => t.id === tabActiva)?.Componente

  return (
    <GuardSesion>
      <div style={{ minHeight: "100vh", background: "#0d1117", fontFamily: "Inter, sans-serif" }}>
        <BarraSuperior paginaActiva="estadisticas" />

        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
          {/* Encabezado */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#f0f6fc", letterSpacing: "-0.5px" }}>
              ◈ Estadísticas
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "#8b949e" }}>
              Panel de análisis, auditoría y exportación de datos.
            </p>
          </div>

          {/* Sub-tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 28, borderBottom: "1px solid #21262d", paddingBottom: 0 }}>
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTabActiva(id)}
                type="button"
                style={{
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  background: "transparent",
                  border: "none",
                  borderBottom: tabActiva === id ? "2px solid #2997ff" : "2px solid transparent",
                  color: tabActiva === id ? "#2997ff" : "#8b949e",
                  cursor: "pointer",
                  transition: "color 0.15s",
                  marginBottom: -1,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Contenido */}
          {ComponenteActivo && <ComponenteActivo />}
        </main>
      </div>
    </GuardSesion>
  )
}
