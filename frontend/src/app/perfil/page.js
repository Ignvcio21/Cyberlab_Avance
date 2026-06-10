"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import GuardSesion from "../componentes/GuardSesion"
import BarraSuperior from "../componentes/BarraSuperior"

const API = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"
const h = () => ({ "Authorization": `Bearer ${sessionStorage.getItem("token") || ""}`, "Content-Type": "application/json" })

const ROLES = { admin: "#f59e0b", docente: "#2997ff", estudiante: "#30d158" }

function Msg({ texto, tipo }) {
  if (!texto) return null
  const ok = tipo === "ok"
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 8, fontSize: 13,
      background: ok ? "rgba(48,209,88,.1)" : "rgba(255,69,58,.1)",
      border: `1px solid ${ok ? "rgba(48,209,88,.25)" : "rgba(255,69,58,.25)"}`,
      color: ok ? "#30d158" : "#ff453a",
    }}>{texto}</div>
  )
}

export default function PerfilPage() {
  const router = useRouter()
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)

  // Edición de datos
  const [nombre, setNombre] = useState("")
  const [nombreUsuarioEdit, setNombreUsuarioEdit] = useState("")
  const [msgPerfil, setMsgPerfil] = useState({ texto: "", tipo: "" })
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)

  // Cambio de contraseña
  const [passActual, setPassActual] = useState("")
  const [passNueva, setPassNueva] = useState("")
  const [passConfirm, setPassConfirm] = useState("")
  const [msgPass, setMsgPass] = useState({ texto: "", tipo: "" })
  const [guardandoPass, setGuardandoPass] = useState(false)

  useEffect(() => {
    setCargando(true)
    fetch(`${API}/perfil`, { headers: h() })
      .then(r => r.json())
      .then(d => {
        setPerfil(d)
        setNombre(d.nombre || "")
        setNombreUsuarioEdit(d.nombre_usuario || "")
      })
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  const guardarPerfil = async (e) => {
    e.preventDefault()
    setGuardandoPerfil(true); setMsgPerfil({ texto: "", tipo: "" })
    try {
      const r = await fetch(`${API}/perfil/actualizar`, {
        method: "PUT", headers: h(),
        body: JSON.stringify({ nombre, nombre_usuario: nombreUsuarioEdit }),
      })
      const d = await r.json()
      if (r.ok) {
        if (d.username_cambio) {
          // El nombre de usuario cambió → el JWT queda inválido → forzar re-login
          setMsgPerfil({ texto: "Nombre de usuario actualizado. Debes iniciar sesión nuevamente.", tipo: "ok" })
          setTimeout(() => {
            ["nombre_usuario","nombre_display","rol_usuario","token"].forEach(k => localStorage.removeItem(k))
            router.push("/")
          }, 2000)
        } else {
          setMsgPerfil({ texto: "Perfil actualizado correctamente", tipo: "ok" })
          sessionStorage.setItem("nombre_display", nombre)
          setPerfil(prev => ({ ...prev, nombre }))
        }
      } else {
        setMsgPerfil({ texto: d?.detail || "Error al actualizar", tipo: "err" })
      }
    } catch {
      setMsgPerfil({ texto: "No se pudo conectar con el servidor", tipo: "err" })
    } finally {
      setGuardandoPerfil(false)
    }
  }

  const cambiarContrasena = async (e) => {
    e.preventDefault()
    if (passNueva !== passConfirm) { setMsgPass({ texto: "Las contraseñas no coinciden", tipo: "err" }); return }
    if (passNueva.length < 8) { setMsgPass({ texto: "La contraseña debe tener al menos 8 caracteres", tipo: "err" }); return }
    setGuardandoPass(true); setMsgPass({ texto: "", tipo: "" })
    try {
      const r = await fetch(`${API}/perfil/cambiar-contrasena`, {
        method: "PUT", headers: h(),
        body: JSON.stringify({ contrasena_actual: passActual, nueva_contrasena: passNueva }),
      })
      const d = await r.json()
      if (r.ok) {
        setMsgPass({ texto: "Contraseña actualizada correctamente", tipo: "ok" })
        setPassActual(""); setPassNueva(""); setPassConfirm("")
      } else {
        setMsgPass({ texto: d?.detail || "Error al cambiar contraseña", tipo: "err" })
      }
    } catch {
      setMsgPass({ texto: "No se pudo conectar con el servidor", tipo: "err" })
    } finally {
      setGuardandoPass(false)
    }
  }

  // Indicador fortaleza contraseña
  const fortaleza = (() => {
    if (!passNueva) return { nivel: 0, label: "", color: "" }
    let pts = 0
    if (passNueva.length >= 8) pts++
    if (passNueva.length >= 12) pts++
    if (/[A-Z]/.test(passNueva) && /[0-9]/.test(passNueva)) pts++
    if (/[^a-zA-Z0-9]/.test(passNueva)) pts++
    const map = [
      { label: "Muy débil", color: "#ff453a" },
      { label: "Débil", color: "#ff9f0a" },
      { label: "Media", color: "#ff9f0a" },
      { label: "Fuerte", color: "#30d158" },
      { label: "Muy fuerte", color: "#30d158" },
    ]
    return { nivel: pts, ...map[pts] }
  })()

  const iniciales = (perfil?.nombre || perfil?.nombre_usuario || "?")
    .split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()

  const formatFecha = (str) => {
    if (!str) return "—"
    return new Date(str).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })
  }

  return (
    <GuardSesion>
      <div style={{ minHeight: "100vh", background: "#0d1117", fontFamily: "Inter, sans-serif" }}>
        <BarraSuperior paginaActiva="perfil" />

        <main style={{ maxWidth: 960, margin: "0 auto", padding: "36px 24px" }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#f0f6fc", letterSpacing: "-0.4px" }}>
              Mi perfil
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "#8b949e" }}>
              Información personal y configuración de cuenta
            </p>
          </div>

          {cargando ? (
            <div style={{ color: "#8b949e", textAlign: "center", padding: 80 }}>Cargando perfil…</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>

              {/* ── COLUMNA IZQUIERDA ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Avatar + datos */}
                <div style={card}>
                  <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 24 }}>
                    <div style={{
                      width: 68, height: 68, borderRadius: "50%",
                      background: "linear-gradient(135deg,#2997ff,#5e5ce6)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 24, fontWeight: 900, color: "#fff", flexShrink: 0,
                    }}>{iniciales}</div>
                    <div>
                      <div style={{ fontSize: 19, fontWeight: 800, color: "#f0f6fc", marginBottom: 4 }}>
                        {perfil?.nombre || perfil?.nombre_usuario}
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: 12, color: "#8b949e", marginBottom: 8 }}>
                        @{perfil?.nombre_usuario}
                      </div>
                      <span style={{
                        padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                        fontFamily: "monospace",
                        background: `${ROLES[perfil?.rol] || "#8b949e"}22`,
                        color: ROLES[perfil?.rol] || "#8b949e",
                        border: `1px solid ${ROLES[perfil?.rol] || "#8b949e"}44`,
                      }}>{perfil?.rol}</span>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid #21262d", paddingTop: 20 }} />

                  {/* Formulario edición */}
                  <form onSubmit={guardarPerfil} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <label style={lbl}>Nombre completo</label>
                      <input value={nombre} onChange={e => setNombre(e.target.value)} style={inp} required />
                    </div>
                    <div>
                      <label style={lbl}>Nombre de usuario</label>
                      <input value={nombreUsuarioEdit} onChange={e => setNombreUsuarioEdit(e.target.value)} style={inp} required />
                      <div style={{ fontSize: 11, color: "#6e7681", marginTop: 4 }}>Si lo cambias, deberás iniciar sesión nuevamente</div>
                    </div>
                    <div>
                      <label style={lbl}>Correo electrónico</label>
                      <input value={perfil?.correo || ""} style={{ ...inp, color: "#6e7681", cursor: "not-allowed" }} readOnly />
                      <div style={{ fontSize: 11, color: "#6e7681", marginTop: 4 }}>El correo no se puede modificar</div>
                    </div>
                    <div>
                      <label style={lbl}>Miembro desde</label>
                      <input value={formatFecha(perfil?.fecha_creacion)} style={{ ...inp, color: "#6e7681", cursor: "not-allowed" }} readOnly />
                    </div>
                    <Msg texto={msgPerfil.texto} tipo={msgPerfil.tipo} />
                    <div style={{ display: "flex", gap: 10 }}>
                      <button type="submit" disabled={guardandoPerfil} style={{ ...btn, background: "linear-gradient(135deg,#2997ff,#5e5ce6)", color: "#fff", flex: 1 }}>
                        {guardandoPerfil ? "Guardando…" : "Guardar cambios"}
                      </button>
                      <button type="button" onClick={() => { setNombre(perfil?.nombre || ""); setNombreUsuarioEdit(perfil?.nombre_usuario || "") }} style={{ ...btn, background: "#21262d", color: "#c9d1d9", border: "1px solid #30363d" }}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>

                {/* Cambiar contraseña */}
                <div style={card}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#f0f6fc", marginBottom: 18 }}>Cambiar contraseña</div>
                  <form onSubmit={cambiarContrasena} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <label style={lbl}>Contraseña actual</label>
                      <input type="password" value={passActual} onChange={e => setPassActual(e.target.value)} placeholder="••••••••" style={inp} required />
                    </div>
                    <div>
                      <label style={lbl}>Nueva contraseña</label>
                      <input type="password" value={passNueva} onChange={e => setPassNueva(e.target.value)} placeholder="Mínimo 8 caracteres" style={inp} required />
                    </div>
                    {passNueva && (
                      <div>
                        <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
                          {[0, 1, 2, 3].map(i => (
                            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < fortaleza.nivel ? fortaleza.color : "#21262d" }} />
                          ))}
                        </div>
                        <div style={{ fontSize: 11, color: "#8b949e" }}>Fortaleza: <span style={{ color: fortaleza.color }}>{fortaleza.label}</span></div>
                      </div>
                    )}
                    <div>
                      <label style={lbl}>Confirmar nueva contraseña</label>
                      <input type="password" value={passConfirm} onChange={e => setPassConfirm(e.target.value)} placeholder="Repite la nueva contraseña" style={inp} required />
                    </div>
                    <Msg texto={msgPass.texto} tipo={msgPass.tipo} />
                    <button type="submit" disabled={guardandoPass} style={{ ...btn, background: "linear-gradient(135deg,#2997ff,#5e5ce6)", color: "#fff" }}>
                      {guardandoPass ? "Actualizando…" : "Actualizar contraseña"}
                    </button>
                  </form>
                </div>
              </div>

              {/* ── COLUMNA DERECHA ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Stats */}
                <div style={card}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#f0f6fc", marginBottom: 18 }}>Mi actividad</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                    {[
                      { lbl: "Ejercicios intentados", val: perfil?.stats?.intentos_total ?? 0, color: "#2997ff" },
                      { lbl: "Evaluados", val: perfil?.stats?.intentos_evaluados ?? 0, color: "#30d158" },
                      { lbl: "Nota promedio", val: perfil?.stats?.nota_promedio ?? "—", color: "#f59e0b" },
                      { lbl: "Entregas docente", val: perfil?.stats?.entregas_docente ?? 0, color: "#5e5ce6" },
                    ].map(({ lbl: l, val, color }) => (
                      <div key={l} style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 12, padding: "16px 18px", borderTop: `2px solid ${color}` }}>
                        <div style={{ fontSize: 26, fontWeight: 900, color }}>{val}</div>
                        <div style={{ fontSize: 12, color: "#8b949e", marginTop: 4 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Zona de cuenta */}
                <div style={{ ...card, borderColor: "rgba(255,69,58,.2)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#ff453a", marginBottom: 8 }}>Zona de cuenta</div>
                  <div style={{ fontSize: 13, color: "#8b949e", lineHeight: 1.6, marginBottom: 16 }}>
                    Cierra tu sesión actual y vuelve al inicio de sesión.
                  </div>
                  <button
                    onClick={() => {
                      ["nombre_usuario","nombre_display","rol_usuario","token"].forEach(k => localStorage.removeItem(k))
                      router.push("/")
                    }}
                    style={{ ...btn, background: "rgba(255,69,58,.1)", color: "#ff453a", border: "1px solid rgba(255,69,58,.25)" }}
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </GuardSesion>
  )
}

const card = {
  background: "#161b22", border: "1px solid #30363d", borderRadius: 16, padding: "24px",
}
const lbl = { display: "block", fontSize: 12, fontWeight: 600, color: "#8b949e", marginBottom: 6 }
const inp = {
  width: "100%", padding: "11px 14px", fontSize: 13,
  background: "#0d1117", border: "1px solid #30363d", borderRadius: 10,
  color: "#f0f6fc", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif",
}
const btn = {
  padding: "10px 18px", fontSize: 13, fontWeight: 700, border: "none",
  borderRadius: 10, cursor: "pointer",
}
