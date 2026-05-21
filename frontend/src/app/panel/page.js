"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import GuardSesion from "../componentes/GuardSesion"
import BarraSuperior from "../componentes/BarraSuperior"

function extraerMensajeError(data) {
  if (!data) return "Error inesperado"
  const d = data.detail ?? data
  if (typeof d === "string") return d

  if (Array.isArray(d)) {
    const partes = d
      .map((x) => {
        if (!x) return null
        if (typeof x === "string") return x
        if (typeof x === "object" && x.msg) return x.msg
        return JSON.stringify(x)
      })
      .filter(Boolean)
    return partes.length ? partes.join(" | ") : "Error de validación"
  }

  if (typeof d === "object") {
    if (d.msg) return d.msg
    try {
      return JSON.stringify(d)
    } catch {
      return "Error inesperado"
    }
  }

  return String(d)
}

export default function PanelAdminDocente() {
  const router = useRouter()

  const [nombreUsuario, setNombreUsuario] = useState("")
  const [rolUsuario, setRolUsuario] = useState("")

  const [tab, setTab] = useState("intentos")

  const [usuarios, setUsuarios] = useState([])
  const [intentos, setIntentos] = useState([])

  const [mensaje, setMensaje] = useState("")
  const [cargando, setCargando] = useState(false)

  const [nuevoUsuario, setNuevoUsuario] = useState("")
  const [nuevaContrasena, setNuevaContrasena] = useState("")
  const [nuevoRol, setNuevoRol] = useState("estudiante")

  const [modalEvaluar, setModalEvaluar] = useState(false)
  const [intentoSeleccionado, setIntentoSeleccionado] = useState(null)
  const [nota, setNota] = useState("6.0")
  const [comentarios, setComentarios] = useState("")

  const puedeVerPanel = useMemo(() => rolUsuario === "admin" || rolUsuario === "docente", [rolUsuario])
  const esAdmin = rolUsuario === "admin"

  useEffect(() => {
    const u = localStorage.getItem("nombre_usuario") || ""
    const r = localStorage.getItem("rol_usuario") || ""
    if (!u) {
      router.push("/")
      return
    }
    setNombreUsuario(u)
    setRolUsuario(r)
  }, [router])

  useEffect(() => {
    if (!rolUsuario) return
    if (!puedeVerPanel) {
      router.push("/inicio")
      return
    }
    if (!esAdmin) setTab("intentos")
  }, [rolUsuario, puedeVerPanel, esAdmin, router])

  const cargarUsuarios = async () => {
    if (!esAdmin) return
    setMensaje("")
    setCargando(true)
    try {
      // ✅ FIX: este endpoint espera nombre_usuario (no nombre_usuario_admin)
      const res = await fetch(
        `http://127.0.0.1:8000/admin/usuarios?nombre_usuario=${encodeURIComponent(nombreUsuario)}`
      )
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setMensaje(extraerMensajeError(data) || "No se pudo cargar usuarios")
        return
      }

      if (Array.isArray(data)) setUsuarios(data)
      else setUsuarios(data?.usuarios || [])
    } catch {
      setMensaje("No se pudo conectar con el backend")
    } finally {
      setCargando(false)
    }
  }

  const cargarIntentos = async () => {
    setMensaje("")
    setCargando(true)
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/docente/intentos?nombre_usuario_docente=${encodeURIComponent(nombreUsuario)}`
      )
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setMensaje(extraerMensajeError(data) || "No se pudo cargar intentos")
        return
      }

      if (Array.isArray(data)) setIntentos(data)
      else setIntentos(data?.intentos || [])
    } catch {
      setMensaje("No se pudo conectar con el backend")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (!nombreUsuario || !rolUsuario) return
    if (tab === "usuarios") cargarUsuarios()
    if (tab === "intentos") cargarIntentos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, nombreUsuario, rolUsuario])

  const crearUsuarioDesdePanel = async (e) => {
    e.preventDefault()
    if (!esAdmin) return
    setMensaje("")

    if (!nuevoUsuario.trim() || !nuevaContrasena.trim()) {
      setMensaje("Completa usuario y contraseña")
      return
    }

    setCargando(true)
    try {
      const res = await fetch("http://127.0.0.1:8000/admin/crear-usuario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_usuario_admin: nombreUsuario,
          nombre_usuario: nuevoUsuario.trim(),
          contrasena: nuevaContrasena,
          rol: nuevoRol
        })
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setMensaje(extraerMensajeError(data) || "No se pudo crear usuario")
        return
      }

      setMensaje(data?.mensaje || "Usuario creado")
      setNuevoUsuario("")
      setNuevaContrasena("")
      setNuevoRol("estudiante")
      await cargarUsuarios()
    } catch {
      setMensaje("No se pudo conectar con el backend")
    } finally {
      setCargando(false)
    }
  }

  const abrirEvaluacion = async (it) => {
    setMensaje("")
    setCargando(true)
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/docente/intentos/${it.intento_id}?nombre_usuario_docente=${encodeURIComponent(
          nombreUsuario
        )}`
      )
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setMensaje(extraerMensajeError(data) || "No se pudo cargar detalle del intento")
        return
      }

      const detalle = data?.intento || data
      setIntentoSeleccionado(detalle)

      if (detalle?.evaluacion?.nota != null) setNota(String(detalle.evaluacion.nota))
      else setNota("6.0")

      setComentarios(detalle?.evaluacion?.comentarios || "")
      setModalEvaluar(true)
    } catch {
      setMensaje("No se pudo conectar con el backend")
    } finally {
      setCargando(false)
    }
  }

  const enviarEvaluacion = async (e) => {
    e.preventDefault()
    if (!intentoSeleccionado) return

    setMensaje("")
    setCargando(true)
    try {
      const res = await fetch("http://127.0.0.1:8000/docente/evaluar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_usuario_docente: nombreUsuario,
          intento_id: intentoSeleccionado.id,
          nota: Number(nota),
          comentarios: comentarios || null
        })
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setMensaje(extraerMensajeError(data) || "No se pudo guardar evaluación")
        return
      }

      setMensaje(data?.mensaje || "Evaluación guardada")
      setModalEvaluar(false)
      setIntentoSeleccionado(null)
      await cargarIntentos()
    } catch {
      setMensaje("No se pudo conectar con el backend")
    } finally {
      setCargando(false)
    }
  }

  return (
    <GuardSesion>
      <main className="dashboard-page">
        <BarraSuperior paginaActiva="panel" />

        <div className="dashboard-container">
          <header className="hero-panel">
            <div>
              <div className="hero-badge">PANEL DE GESTIÓN CYBERLAB</div>
              <h1 className="hero-title">Administración y evaluación</h1>
              <p className="hero-subtitle">
                Sesión: <strong>{nombreUsuario}</strong> — Rol: <strong>{rolUsuario || "N/D"}</strong>
              </p>
            </div>

            <button onClick={() => router.push("/inicio")} className="logout-button">
              Volver
            </button>
          </header>

          <section className="learning-panel">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className={`btn-secundario ${tab === "intentos" ? "activo" : ""}`}
                onClick={() => setTab("intentos")}
                disabled={cargando}
              >
                Intentos / Evaluaciones
              </button>

              {esAdmin && (
                <button
                  className={`btn-secundario ${tab === "usuarios" ? "activo" : ""}`}
                  onClick={() => setTab("usuarios")}
                  disabled={cargando}
                >
                  Usuarios
                </button>
              )}
            </div>

            {mensaje ? (
              <div className="login-message" style={{ marginTop: 12 }}>
                {mensaje}
              </div>
            ) : null}

            {tab === "usuarios" && esAdmin && (
              <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
                <div className="panel">
                  <h2 style={{ marginBottom: 10 }}>Crear usuario</h2>

                  <form onSubmit={crearUsuarioDesdePanel} style={{ display: "grid", gap: 10 }}>
                    <input
                      className="campo-inicio"
                      placeholder="Nuevo usuario"
                      value={nuevoUsuario}
                      onChange={(e) => setNuevoUsuario(e.target.value)}
                    />
                    <input
                      className="campo-inicio"
                      placeholder="Contraseña"
                      type="password"
                      value={nuevaContrasena}
                      onChange={(e) => setNuevaContrasena(e.target.value)}
                    />

                    <select className="campo-inicio" value={nuevoRol} onChange={(e) => setNuevoRol(e.target.value)}>
                      <option value="estudiante">estudiante</option>
                      <option value="docente">docente</option>
                    </select>

                    <button className="boton-principal" type="submit" disabled={cargando}>
                      {cargando ? "Guardando..." : "Crear"}
                    </button>
                  </form>
                </div>

                <div className="panel">
                  <h2 style={{ marginBottom: 10 }}>Usuarios registrados</h2>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", padding: 8 }}>ID</th>
                          <th style={{ textAlign: "left", padding: 8 }}>Usuario</th>
                          <th style={{ textAlign: "left", padding: 8 }}>Rol</th>
                          <th style={{ textAlign: "left", padding: 8 }}>Creación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usuarios.map((u) => (
                          <tr key={u.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                            <td style={{ padding: 8 }}>{u.id}</td>
                            <td style={{ padding: 8 }}>
                              <strong>{u.nombre_usuario}</strong>
                            </td>
                            <td style={{ padding: 8 }}>{u.rol}</td>
                            <td style={{ padding: 8 }}>{u.fecha_creacion || "-"}</td>
                          </tr>
                        ))}
                        {usuarios.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ padding: 10, opacity: 0.75 }}>
                              Sin usuarios
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {tab === "intentos" && (
              <div style={{ marginTop: 16 }} className="panel">
                <h2 style={{ marginBottom: 10 }}>Intentos de ejercicios</h2>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: 8 }}>ID</th>
                        <th style={{ textAlign: "left", padding: 8 }}>Usuario</th>
                        <th style={{ textAlign: "left", padding: 8 }}>Estado</th>
                        <th style={{ textAlign: "left", padding: 8 }}>%</th>
                        <th style={{ textAlign: "left", padding: 8 }}>Tiempo</th>
                        <th style={{ textAlign: "left", padding: 8 }}>Errores</th>
                        <th style={{ textAlign: "left", padding: 8 }}>Evaluado</th>
                        <th style={{ textAlign: "left", padding: 8 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {intentos.map((it) => (
                        <tr key={it.intento_id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                          <td style={{ padding: 8 }}>{it.intento_id}</td>
                          <td style={{ padding: 8 }}>
                            <strong>{it.usuario}</strong>
                          </td>
                          <td style={{ padding: 8 }}>{it.estado}</td>
                          <td style={{ padding: 8 }}>{it.porcentaje}%</td>
                          <td style={{ padding: 8 }}>{it.tiempo_seg}s</td>
                          <td style={{ padding: 8 }}>{it.errores}</td>
                          <td style={{ padding: 8 }}>{it.tiene_evaluacion ? "Sí" : "No"}</td>
                          <td style={{ padding: 8 }}>
                            <button className="btn-secundario" onClick={() => abrirEvaluacion(it)} disabled={cargando}>
                              Evaluar
                            </button>
                          </td>
                        </tr>
                      ))}
                      {intentos.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: 10, opacity: 0.75 }}>
                            Sin intentos aún
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {modalEvaluar && intentoSeleccionado ? (
            <div className="modal-overlay">
              <div className="modal-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>Evaluación</div>
                    <div style={{ opacity: 0.85, marginTop: 6 }}>
                      Intento <strong>#{intentoSeleccionado.id}</strong> — Usuario:{" "}
                      <strong>{intentoSeleccionado.usuario}</strong>
                    </div>
                    <div style={{ opacity: 0.85, marginTop: 6 }}>
                      Ejercicio: <strong>{intentoSeleccionado.descripcion_ejercicio || "-"}</strong>
                    </div>
                  </div>

                  <button className="logout-button" onClick={() => setModalEvaluar(false)}>
                    Cerrar
                  </button>
                </div>

                <form onSubmit={enviarEvaluacion} style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  <input
                    className="campo-inicio"
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    placeholder="Nota (ej: 6.5)"
                  />
                  <textarea
                    className="campo-inicio"
                    style={{ minHeight: 90, paddingTop: 10 }}
                    value={comentarios}
                    onChange={(e) => setComentarios(e.target.value)}
                    placeholder="Comentarios (opcional)"
                  />
                  <button className="boton-principal" type="submit" disabled={cargando}>
                    {cargando ? "Guardando..." : "Guardar evaluación"}
                  </button>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </GuardSesion>
  )
}