"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import GuardSesion from "../componentes/GuardSesion"
import BarraSuperior from "../componentes/BarraSuperior"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"

const getAuthHeaders = () => ({
  "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
  "Content-Type": "application/json"
})

function extraerError(data) {
  if (!data) return "Error inesperado"
  const d = data.detail ?? data
  if (typeof d === "string") return d
  if (Array.isArray(d)) return d.map(x => x?.msg || JSON.stringify(x)).filter(Boolean).join(" | ")
  if (typeof d === "object") return d.msg || JSON.stringify(d)
  return String(d)
}

const formatFecha = (str) => {
  if (!str) return "—"
  try {
    const d = new Date(str)
    return d.toLocaleString("es-CL", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    })
  } catch { return str }
}


const NOMBRES_NIVELES_PANEL = {
  1: "Fuerza Bruta — Fundamentos",
  2: "Escaneo de Puertos",
  3: "Enumeración de Servicios",
  4: "Superficie de Ataque",
  5: "Fuerza Bruta Avanzada",
  6: "Ataque Multi-Etapa",
  7: "Operación Completa",
}

const nivelDeEj = (ej_id) => ej_id ? Math.ceil(ej_id / 5) : 1

function PanelPerfilNiveles({ nombreEstudiante, intentos, cargando, ordenDesc, setOrdenDesc, onVolver, onEvaluar }) {
  const [nivelAbierto, setNivelAbierto] = useState(null)

  // Agrupar por nivel
  const porNivel = {}
  intentos.forEach(it => {
    const n = nivelDeEj(it.ejercicio_id)
    if (!porNivel[n]) porNivel[n] = []
    porNivel[n].push(it)
  })

  const niveles = Object.keys(porNivel).map(Number).sort((a, b) => a - b)

  const ordenar = (lista) => [...lista].sort((a, b) => {
    const da = new Date(a.fecha_inicio || 0)
    const db = new Date(b.fecha_inicio || 0)
    return ordenDesc ? db - da : da - db
  })

  const evalCount = (lista) => lista.filter(it => it.tiene_evaluacion).length
  const aprobCount= (lista) => lista.filter(it => it.estado === "aprobado").length
  const notaMedia = (lista) => {
    const ev = lista.filter(it => it.nota != null)
    if (!ev.length) return null
    return (ev.reduce((s, it) => s + it.nota, 0) / ev.length).toFixed(1)
  }

  return (
    <div className="panel-body">
      <div className="perfil-detalle-header">
        <button className="btn-volver" onClick={onVolver}>← Volver</button>
        <div>
          <div className="perfil-detalle-nombre">{nombreEstudiante}</div>
          <div className="perfil-detalle-sub">
            {intentos.length} intentos · {niveles.length} niveles
          </div>
        </div>
        <button
          onClick={() => setOrdenDesc(v => !v)}
          style={{
            marginLeft:"auto", padding:"6px 12px",
            background:"rgba(255,255,255,0.06)",
            border:"1px solid rgba(255,255,255,0.10)",
            borderRadius:8, color:"var(--texto-secundario)",
            fontSize:12, fontWeight:700, cursor:"pointer"
          }}
        >
          {ordenDesc ? "↓ Más reciente primero" : "↑ Más antiguo primero"}
        </button>
      </div>

      {cargando && <div className="panel-cargando">Cargando...</div>}

      {/* Un acordeón por nivel */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {niveles.map(n => {
          const lista    = porNivel[n]
          const aprobados= aprobCount(lista)
          const nota     = notaMedia(lista)
          const eval_    = evalCount(lista)
          const abierto  = nivelAbierto === n

          return (
            <div key={n} style={{
              border:"1px solid rgba(255,255,255,0.08)",
              borderRadius:12, overflow:"hidden",
              background:"rgba(255,255,255,0.03)"
            }}>
              {/* Cabecera nivel */}
              <button
                onClick={() => setNivelAbierto(abierto ? null : n)}
                style={{
                  width:"100%", textAlign:"left", background:"none", border:"none",
                  padding:"14px 16px", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:14,
                  borderBottom: abierto ? "1px solid rgba(255,255,255,0.07)" : "none"
                }}
              >
                {/* Número de nivel */}
                <div style={{
                  width:36, height:36, borderRadius:8, flexShrink:0,
                  background: nota >= 4 ? "rgba(0,218,243,0.15)" : nota !== null ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)",
                  border:`1px solid ${nota >= 4 ? "rgba(0,218,243,0.28)" : nota !== null ? "rgba(239,68,68,0.22)" : "rgba(255,255,255,0.10)"}`,
                  display:"grid", placeItems:"center",
                  fontWeight:900, fontSize:14, fontFamily:"var(--mono)",
                  color: nota >= 4 ? "var(--terciario-dim)" : nota !== null ? "#ffb4ab" : "var(--texto-apagado)"
                }}>
                  {n}
                </div>

                {/* Info del nivel */}
                <div style={{ flex:1 }}>
                  <div style={{ color:"#fff", fontWeight:700, fontSize:14 }}>
                    Nivel {n} — {NOMBRES_NIVELES_PANEL[n] || ""}
                  </div>
                  <div style={{ color:"var(--texto-apagado)", fontSize:11, fontFamily:"var(--mono)", marginTop:2 }}>
                    {aprobados}/{lista.length} ejercicios completados
                    {eval_ > 0 ? ` · ${eval_} evaluados` : ""}
                  </div>
                </div>

                {/* Nota media */}
                {nota !== null ? (
                  <div style={{ textAlign:"center", marginRight:8 }}>
                    <div style={{
                      fontSize:20, fontWeight:900, fontFamily:"var(--mono)",
                      color: nota >= 4 ? "var(--terciario-dim)" : "#ffb4ab"
                    }}>
                      {nota}
                    </div>
                    <div style={{ fontSize:9, color:"var(--texto-apagado)" }}>media</div>
                  </div>
                ) : (
                  <div style={{ fontSize:11, color:"var(--texto-apagado)", fontFamily:"var(--mono)", marginRight:8 }}>
                    Sin nota
                  </div>
                )}

                {/* Barra progreso */}
                <div style={{ width:60, marginRight:8 }}>
                  <div style={{ height:4, borderRadius:999, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
                    <div style={{
                      height:"100%", borderRadius:999,
                      background: aprobados >= 5 ? "var(--terciario)" : "var(--primario)",
                      width:`${Math.min(aprobados/5,1)*100}%`
                    }}/>
                  </div>
                  <div style={{ fontSize:9, color:"var(--texto-apagado)", fontFamily:"var(--mono)", marginTop:2, textAlign:"right" }}>
                    {aprobados}/5 ej.
                  </div>
                </div>

                <span style={{ color:"var(--texto-apagado)", fontSize:14 }}>{abierto ? "▲" : "▼"}</span>
              </button>

              {/* Lista de ejercicios del nivel */}
              {abierto && (
                <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:8 }}>
                  {ordenar(lista).map(it => (
                    <div key={it.intento_id}
                      className={`intento-card ${it.estado==="aprobado"?"intento-aprobado":""}`}
                    >
                      <div className="intento-top">
                        <div className="intento-ej">
                          <span className="intento-ej-id">Ejercicio #{it.ejercicio_id}</span>
                          <span className="intento-ej-desc">{it.descripcion_ejercicio || "—"}</span>
                          <span style={{ fontSize:11, color:"var(--texto-apagado)", fontFamily:"var(--mono)", marginTop:2, display:"block" }}>
                            🕐 {formatFecha(it.fecha_inicio)}
                          </span>
                        </div>
                        <div className="intento-badges">
                          <span className={`intento-estado ${it.estado==="aprobado"?"est-verde":"est-gris"}`}>
                            {it.estado}
                          </span>
                          <span className="intento-pct">{it.porcentaje}%</span>
                          {it.tiene_evaluacion && it.nota != null && (
                            <span style={{
                              fontSize:14, fontWeight:900,
                              color: it.nota >= 4 ? "var(--terciario-dim)" : "#ffb4ab",
                              background: it.nota >= 4 ? "rgba(0,218,243,0.10)" : "rgba(255,180,171,0.10)",
                              border:`1px solid ${it.nota >= 4 ? "rgba(0,218,243,0.25)" : "rgba(255,180,171,0.25)"}`,
                              padding:"3px 10px", borderRadius:6, fontFamily:"var(--mono)"
                            }}>
                              Nota: {it.nota}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="intento-meta">
                        <span>⏱ {it.tiempo_seg}s</span>
                        <span>❌ {it.errores} errores</span>
                        {(it.ayudas_pedidas || 0) > 0 && (
                          <span className="intento-ayuda">
                            💡 {it.ayudas_pedidas} ayudas (-{Math.min(it.ayudas_pedidas*5,30)}%)
                          </span>
                        )}
                        {it.tiene_evaluacion && <span className="intento-eval-badge">📋 Evaluado</span>}
                      </div>
                      <button className="btn-evaluar" onClick={() => onEvaluar(it)} disabled={cargando}>
                        {it.tiene_evaluacion ? "✏ Editar evaluación" : "📋 Evaluar"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {niveles.length === 0 && !cargando && (
          <div className="panel-vacio">Este estudiante no tiene intentos registrados.</div>
        )}
      </div>
    </div>
  )
}

export default function PanelDocente() {
  const router = useRouter()
  const [nombreUsuario, setNombreUsuario] = useState("")
  const [rolUsuario,    setRolUsuario]    = useState("")
  const [tab,           setTab]           = useState("estudiantes")
  const [intentos,      setIntentos]      = useState([])
  const [usuarios,      setUsuarios]      = useState([])
  const [mensaje,       setMensaje]       = useState("")
  const [cargando,      setCargando]      = useState(false)
  const [perfilActivo,  setPerfilActivo]  = useState(null)
  const [ordenDesc,     setOrdenDesc]     = useState(true)   // más reciente primero

  const [modalEval,     setModalEval]     = useState(false)
  const [intentoSel,    setIntentoSel]    = useState(null)
  const [nota,          setNota]          = useState("")     // sin valor por defecto
  const [comentarios,   setComentarios]   = useState("")

  const [nuevoU, setNuevoU] = useState("")
  const [nuevaC, setNuevaC] = useState("")
  const [nuevoR, setNuevoR] = useState("estudiante")

  const [editandoRolId,  setEditandoRolId]  = useState(null)
  const [rolEditValor,   setRolEditValor]   = useState("")

  const esAdmin = rolUsuario === "admin"

  useEffect(() => {
    const u = localStorage.getItem("nombre_usuario") || ""
    const r = localStorage.getItem("rol_usuario")    || ""
    if (!u) { router.push("/"); return }
    if (r !== "admin" && r !== "docente") { router.push("/inicio"); return }
    setNombreUsuario(u); setRolUsuario(r)
  }, [router])

  useEffect(() => {
    if (!nombreUsuario) return
    if (tab === "estudiantes") cargarIntentos()
    if (tab === "usuarios")    cargarUsuarios()
  }, [tab, nombreUsuario])

  const cargarIntentos = async () => {
    setCargando(true); setMensaje("")
    try {
      const r = await fetch(
        `${API_URL}/docente/intentos?nombre_usuario_docente=${encodeURIComponent(nombreUsuario)}`,
        { headers: { "Authorization": `Bearer ${localStorage.getItem("token") || ""}` } }
      )
      const d = await r.json()
      if (!r.ok) { setMensaje(extraerError(d)); return }
      setIntentos(Array.isArray(d) ? d : (d?.intentos || []))
    } catch { setMensaje("No se pudo conectar con el backend") }
    finally { setCargando(false) }
  }

  const cargarUsuarios = async () => {
    if (!esAdmin) return
    setCargando(true); setMensaje("")
    try {
      const r = await fetch(
        `${API_URL}/admin/usuarios?nombre_usuario=${encodeURIComponent(nombreUsuario)}`,
        { headers: { "Authorization": `Bearer ${localStorage.getItem("token") || ""}` } }
      )
      const d = await r.json()
      if (!r.ok) { setMensaje(extraerError(d)); return }
      setUsuarios(Array.isArray(d) ? d : (d?.usuarios || []))
    } catch { setMensaje("No se pudo conectar con el backend") }
    finally { setCargando(false) }
  }

  // Agrupar intentos por estudiante
  const perfilesEstudiantes = useMemo(() => {
    const mapa = {}
    intentos.forEach(it => {
      const u = it.usuario || "desconocido"
      if (!mapa[u]) mapa[u] = { nombre: u, intentos: [], completados: 0, pendientes: 0, ayudas_total: 0 }
      mapa[u].intentos.push(it)
      if (it.estado === "aprobado" || it.porcentaje === 100) mapa[u].completados++
      else mapa[u].pendientes++
      mapa[u].ayudas_total += it.ayudas_pedidas || 0
    })
    return Object.values(mapa).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [intentos])

  // Intentos del perfil activo, ordenados
  const intentosPerfil = useMemo(() => {
    if (!perfilActivo) return []
    const lista = intentos.filter(it => it.usuario === perfilActivo)
    return [...lista].sort((a, b) => {
      const da = new Date(a.fecha_inicio || 0)
      const db = new Date(b.fecha_inicio || 0)
      return ordenDesc ? db - da : da - db
    })
  }, [perfilActivo, intentos, ordenDesc])

  const abrirEval = (it) => {
    setMensaje("")
    setIntentoSel(it)
    setNota(it?.nota != null ? String(it.nota) : "")
    setComentarios(it?.comentarios || "")
    setModalEval(true)
  }

  const enviarEval = async (e) => {
    e.preventDefault(); if (!intentoSel) return
    if (!nota.trim()) { setMensaje("Debes ingresar una nota antes de guardar."); return }
    const notaNum = parseFloat(nota)
    if (isNaN(notaNum) || notaNum < 1 || notaNum > 7) {
      setMensaje("La nota debe ser un número entre 1.0 y 7.0"); return
    }
    setMensaje(""); setCargando(true)
    try {
      const r = await fetch(`${API_URL}/docente/evaluar`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({
          nombre_usuario_docente: nombreUsuario,
          intento_id: intentoSel.intento_id,
          nota: notaNum,
          comentarios: comentarios || null
        })
      })
      const d = await r.json()
      if (!r.ok) { setMensaje(extraerError(d)); return }
      setMensaje(d?.mensaje || "Evaluación guardada")
      setModalEval(false); setIntentoSel(null)
      await cargarIntentos()
    } catch { setMensaje("No se pudo conectar con el backend") }
    finally { setCargando(false) }
  }

  const cambiarRol = async (nombreU, nuevoRol) => {
    if (!nombreU || !nuevoRol) return
    setMensaje(""); setCargando(true)
    try {
      const r = await fetch(`${API_URL}/admin/cambiar-rol`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ nombre_usuario: nombreU, nuevo_rol: nuevoRol })
      })
      const d = await r.json()
      if (!r.ok) { setMensaje(extraerError(d)); return }
      setMensaje(d?.mensaje || "Rol actualizado")
      setEditandoRolId(null)
      await cargarUsuarios()
    } catch { setMensaje("No se pudo conectar con el backend") }
    finally { setCargando(false) }
  }

  const crearUsuario = async (e) => {
    e.preventDefault(); if (!esAdmin) return
    if (!nuevoU.trim() || !nuevaC.trim()) { setMensaje("Completa usuario y contraseña"); return }
    setMensaje(""); setCargando(true)
    try {
      const r = await fetch(`${API_URL}/admin/crear-usuario`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({
          nombre_usuario_admin: nombreUsuario,
          nombre_usuario: nuevoU.trim(),
          contrasena: nuevaC, rol: nuevoR
        })
      })
      const d = await r.json()
      if (!r.ok) { setMensaje(extraerError(d)); return }
      setMensaje(d?.mensaje || "Usuario creado")
      setNuevoU(""); setNuevaC(""); setNuevoR("estudiante")
      await cargarUsuarios()
    } catch { setMensaje("No se pudo conectar con el backend") }
    finally { setCargando(false) }
  }

  return (
    <GuardSesion>
      <div className="dashboard-page">
        <div className="dashboard-container">

          <BarraSuperior paginaActiva="panel" />

          <header className="hero-panel">
            <div>
              <div className="hero-badge">PANEL DE GESTIÓN CYBERLAB</div>
              <h1 style={{ margin:"8px 0 4px", fontSize:22, color:"#fff", fontFamily:"var(--sans)", fontWeight:700 }}>
                Administración y evaluación
              </h1>
              <p className="hero-subtitle">
                Sesión: <strong style={{ color:"var(--primario-dim)" }}>{nombreUsuario}</strong>
                {" — "} Rol: <strong style={{ color:"var(--terciario-dim)" }}>{rolUsuario || "N/D"}</strong>
              </p>
            </div>
          </header>

          {/* Tabs */}
          <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
            <button
              className={`btn-secundario ${tab==="estudiantes"?"activo":""}`}
              onClick={() => { setTab("estudiantes"); setPerfilActivo(null) }}
            >
              👤 Estudiantes
            </button>
            {esAdmin && (
              <button
                className={`btn-secundario ${tab==="usuarios"?"activo":""}`}
                onClick={() => setTab("usuarios")}
              >
                ⚙ Usuarios
              </button>
            )}
          </div>

          {mensaje && (
            <div style={{
              padding:"10px 14px", background:"rgba(0,163,255,0.08)",
              border:"1px solid rgba(0,163,255,0.20)", borderRadius:8,
              fontSize:13, color:"var(--primario-dim)", marginBottom:12
            }}>{mensaje}</div>
          )}

          {/* ── TAB: Lista de perfiles ── */}
          {tab === "estudiantes" && !perfilActivo && (
            <div className="panel-body">
              <div className="panel-section-title">
                Perfiles de estudiantes
                <span className="panel-section-count">{perfilesEstudiantes.length} registrados</span>
              </div>
              {cargando && <div className="panel-cargando">Cargando...</div>}
              {perfilesEstudiantes.length === 0 && !cargando && (
                <div className="panel-vacio">No hay intentos registrados aún.</div>
              )}
              <div className="perfiles-grid">
                {perfilesEstudiantes.map(p => (
                  <button key={p.nombre} className="perfil-card" onClick={() => setPerfilActivo(p.nombre)}>
                    <div className="perfil-avatar">{p.nombre[0]?.toUpperCase()}</div>
                    <div className="perfil-info">
                      <div className="perfil-nombre">{p.nombre}</div>
                      <div className="perfil-stats">
                        <span className="perfil-stat verde">✓ {p.completados} completados</span>
                        <span className="perfil-stat gris">○ {p.pendientes} pendientes</span>
                        {p.ayudas_total > 0 && (
                          <span className="perfil-stat amarillo">💡 {p.ayudas_total} ayudas</span>
                        )}
                      </div>
                    </div>
                    <span className="perfil-arrow">›</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: Detalle de perfil — vista por niveles ── */}
          {tab === "estudiantes" && perfilActivo && (
            <PanelPerfilNiveles
              nombreEstudiante={perfilActivo}
              intentos={intentosPerfil}
              cargando={cargando}
              ordenDesc={ordenDesc}
              setOrdenDesc={setOrdenDesc}
              onVolver={() => setPerfilActivo(null)}
              onEvaluar={abrirEval}
            />
          )}

          {/* ── TAB: Usuarios ── */}
          {tab === "usuarios" && esAdmin && (
            <div className="panel-dos-col">
              <div className="panel-body">
                <div className="panel-section-title">Crear usuario</div>
                <form onSubmit={crearUsuario} style={{ display:"grid", gap:10 }}>
                  <input className="campo-inicio" placeholder="Nombre de usuario"
                    value={nuevoU} onChange={e => setNuevoU(e.target.value)}/>
                  <input className="campo-inicio" placeholder="Contraseña" type="password"
                    value={nuevaC} onChange={e => setNuevaC(e.target.value)}/>
                  <select className="campo-inicio" value={nuevoR} onChange={e => setNuevoR(e.target.value)}>
                    <option value="estudiante">estudiante</option>
                    <option value="docente">docente</option>
                  </select>
                  <button className="boton-principal" type="submit" disabled={cargando}>
                    {cargando ? "Guardando..." : "Crear usuario"}
                  </button>
                </form>
              </div>
              <div className="panel-body">
                <div className="panel-section-title">
                  Usuarios registrados
                  <span className="panel-section-count">{usuarios.length}</span>
                </div>
                <table className="panel-tabla">
                  <thead><tr><th>ID</th><th>Usuario</th><th>Rol</th><th></th></tr></thead>
                  <tbody>
                    {usuarios.map(u => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td><strong>{u.nombre_usuario}</strong></td>
                        <td>
                          {editandoRolId === u.id ? (
                            <select
                              className="campo-inicio"
                              style={{ padding:"2px 6px", fontSize:12, height:"auto" }}
                              value={rolEditValor}
                              onChange={e => setRolEditValor(e.target.value)}
                            >
                              <option value="estudiante">estudiante</option>
                              <option value="docente">docente</option>
                              <option value="admin">admin</option>
                            </select>
                          ) : (
                            <span style={{
                              color: u.rol === "admin" ? "var(--primario-dim)"
                                   : u.rol === "docente" ? "var(--terciario-dim)"
                                   : "var(--texto-secundario)"
                            }}>{u.rol}</span>
                          )}
                        </td>
                        <td style={{ whiteSpace:"nowrap" }}>
                          {editandoRolId === u.id ? (
                            <>
                              <button
                                className="btn-evaluar"
                                style={{ padding:"3px 10px", fontSize:11, marginRight:4 }}
                                onClick={() => cambiarRol(u.nombre_usuario, rolEditValor)}
                                disabled={cargando}
                              >Guardar</button>
                              <button
                                className="boton-secundario"
                                style={{ padding:"3px 10px", fontSize:11 }}
                                onClick={() => setEditandoRolId(null)}
                              >✕</button>
                            </>
                          ) : (
                            <button
                              className="boton-secundario"
                              style={{ padding:"3px 10px", fontSize:11 }}
                              onClick={() => { setEditandoRolId(u.id); setRolEditValor(u.rol) }}
                            >Cambiar rol</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {usuarios.length === 0 && (
                      <tr><td colSpan={4} style={{ opacity:0.6 }}>Sin usuarios</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Modal evaluación ── */}
      {modalEval && intentoSel && (
        <div className="modal-fondo">
          <div className="modal-tarjeta" style={{ maxWidth:520 }}>
            <div className="modal-cabecera">
              <h3 className="modal-titulo">
                Evaluar — {intentoSel.usuario} · Ejercicio #{intentoSel.ejercicio_id}
              </h3>
              <button className="boton-secundario" onClick={() => setModalEval(false)}>Cerrar</button>
            </div>
            <div className="modal-cuerpo">
              {/* Resumen del intento */}
              <div style={{
                background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
                borderRadius:10, padding:"12px 14px", marginBottom:16, fontSize:13
              }}>
                <div style={{ color:"#fff", fontWeight:700, marginBottom:8 }}>
                  {intentoSel.descripcion_ejercicio || "Ejercicio sin descripción"}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:12, color:"var(--texto-apagado)", fontFamily:"var(--mono)", fontSize:12 }}>
                  <span>Estado: <strong style={{ color:intentoSel.estado==="aprobado"?"var(--terciario-dim)":"#ffb4ab" }}>{intentoSel.estado}</strong></span>
                  <span>Porcentaje: <strong style={{ color:"#fff" }}>{intentoSel.porcentaje}%</strong></span>
                  <span>Tiempo: <strong style={{ color:"#fff" }}>{intentoSel.tiempo_seg}s</strong></span>
                  <span>Errores: <strong style={{ color:"#ffb4ab" }}>{intentoSel.errores}</strong></span>
                  {(intentoSel.ayudas_pedidas || 0) > 0 && (
                    <span>Ayudas: <strong style={{ color:"#fbbf24" }}>{intentoSel.ayudas_pedidas} (-{Math.min(intentoSel.ayudas_pedidas*5,30)}%)</strong></span>
                  )}
                </div>
              </div>

              {intentoSel.tiene_evaluacion && (
                <div style={{
                  background:"rgba(0,218,243,0.06)", border:"1px solid rgba(0,218,243,0.18)",
                  borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:12,
                  color:"var(--texto-secundario)"
                }}>
                  <strong style={{ color:"var(--terciario-dim)" }}>Evaluación existente:</strong>
                  {" "}Nota {intentoSel.nota}
                  {intentoSel.comentarios && ` — "${intentoSel.comentarios}"`}
                </div>
              )}

              <form onSubmit={enviarEval} style={{ display:"grid", gap:12 }}>
                <div>
                  <label style={{
                    display:"block", fontSize:11, fontFamily:"var(--mono)",
                    fontWeight:700, color:"var(--texto-apagado)",
                    letterSpacing:"0.06em", marginBottom:6
                  }}>
                    NOTA (1.0 — 7.0) *
                  </label>
                  <input
                    className="campo-inicio"
                    value={nota}
                    onChange={e => setNota(e.target.value)}
                    placeholder="Ej: 5.5"
                    type="number"
                    min="1" max="7" step="0.1"
                  />
                </div>
                <div>
                  <label style={{
                    display:"block", fontSize:11, fontFamily:"var(--mono)",
                    fontWeight:700, color:"var(--texto-apagado)",
                    letterSpacing:"0.06em", marginBottom:6
                  }}>
                    COMENTARIOS (opcional)
                  </label>
                  <textarea
                    className="campo-inicio"
                    style={{ minHeight:80, paddingTop:10, resize:"vertical" }}
                    value={comentarios}
                    onChange={e => setComentarios(e.target.value)}
                    placeholder="Escribe retroalimentación para el estudiante..."
                  />
                </div>
                {mensaje && (
                  <div style={{ fontSize:13, color:"#ffb4ab", fontFamily:"var(--mono)" }}>{mensaje}</div>
                )}
                <button className="boton-principal" type="submit" disabled={cargando || !nota.trim()}>
                  {cargando ? "Guardando..." : intentoSel.tiene_evaluacion ? "Actualizar evaluación" : "Guardar evaluación"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </GuardSesion>
  )
}