"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL

// Botón para mostrar/ocultar la contraseña
function OjoBtn({ ver, onClick }) {
  return (
    <button
      type="button" onClick={onClick} tabIndex={-1}
      aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
      style={{
        position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
        width: 34, height: 34, borderRadius: 9, padding: 0, cursor: "pointer",
        background: "rgba(255,255,255,0.06)", border: "1px solid #3a3a3c",
        display: "flex", alignItems: "center", justifyContent: "center", color: "#8e8e93",
        transition: "color .15s, background .15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.color = "#f5f5f7"; e.currentTarget.style.background = "rgba(41,151,255,0.14)" }}
      onMouseLeave={e => { e.currentTarget.style.color = "#8e8e93"; e.currentTarget.style.background = "rgba(255,255,255,0.06)" }}
    >
      {ver ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  )
}

export default function InicioSesion() {
  const router = useRouter()
  const canvasRef = useRef(null)
  const [modoRegistro, setModoRegistro] = useState(false)
  const [nombre, setNombre] = useState("")
  const [correo, setCorreo] = useState("")
  const [contrasena, setContrasena] = useState("")
  const [confirmarContrasena, setConfirmarContrasena] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [cargando, setCargando] = useState(false)
  const [verPass, setVerPass] = useState(false)
  const [verConfirm, setVerConfirm] = useState(false)
  const [sugerirRegistro, setSugerirRegistro] = useState(false)  // correo sin cuenta

  const manejarLogin = async (e) => {
    e.preventDefault()
    if (cargando) return
    setMensaje(""); setSugerirRegistro(false); setCargando(true)
    try {
      const respuesta = await fetch(`${API_URL}/iniciar-sesion`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correo.trim().toLowerCase(), contrasena })
      })
      const datos = await respuesta.json()
      if (!respuesta.ok) {
        // 404 = ese correo no tiene cuenta → ofrecer registrarse
        setSugerirRegistro(respuesta.status === 404)
        setMensaje(datos.detail || "Error al iniciar sesión")
        return
      }
      sessionStorage.setItem("nombre_usuario", datos.nombre_usuario)
      sessionStorage.setItem("nombre_display", datos.nombre || datos.nombre_usuario)
      if (datos.rol)   sessionStorage.setItem("rol_usuario", datos.rol)
      if (datos.token) sessionStorage.setItem("token", datos.token)
      router.push("/inicio")
    } catch { setMensaje("No se pudo conectar con el servidor") }
    finally { setCargando(false) }
  }

  const manejarRegistro = async (e) => {
    e.preventDefault()
    if (cargando) return
    setMensaje("")
    if (!nombre.trim()) { setMensaje("Ingresa tu nombre"); return }
    if (!correo.trim() || !correo.includes("@")) { setMensaje("Ingresa un correo electrónico válido"); return }
    if (!contrasena.trim()) { setMensaje("Ingresa una contraseña"); return }
    if (contrasena.length < 8) { setMensaje("La contraseña debe tener al menos 8 caracteres"); return }
    if (contrasena !== confirmarContrasena) { setMensaje("Las contraseñas no coinciden"); return }
    setCargando(true)
    try {
      const respuesta = await fetch(`${API_URL}/registrar`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), correo: correo.trim().toLowerCase(), contrasena })
      })
      const datos = await respuesta.json()
      if (!respuesta.ok) { setMensaje(datos.detail || "No se pudo completar el registro"); return }
      setMensaje("✓ Cuenta creada. Ya puedes iniciar sesión.")
      setModoRegistro(false); setConfirmarContrasena(""); setNombre("")
    } catch { setMensaje("No se pudo conectar con el servidor") }
    finally { setCargando(false) }
  }

  // Canvas partículas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    let animId
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener("resize", resize)

    const N = 55
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      r: Math.random() * 1.8 + 0.7,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(41,151,255,0.55)"
        ctx.fill()
      }
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pts[i].x - pts[j].x
          const dy = pts[i].y - pts[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 110) {
            ctx.beginPath()
            ctx.moveTo(pts[i].x, pts[i].y)
            ctx.lineTo(pts[j].x, pts[j].y)
            ctx.strokeStyle = `rgba(41,151,255,${(1 - d / 110) * 0.18})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize) }
  }, [])

  const alternarModo = () => {
    setMensaje(""); setSugerirRegistro(false); setModoRegistro(v => !v)
    setContrasena(""); setConfirmarContrasena(""); setNombre("")
    setVerPass(false); setVerConfirm(false)
  }

  return (
    <main style={{ minHeight: "100vh", background: "#141414", fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ── LOGIN CARD ── */}
      <section style={{ background: "#111113", padding: "60px 24px 60px", borderBottom: "1px solid #2c2c2e", position: "relative", overflow: "hidden" }}>
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
        <div id="login-card" style={{
          maxWidth: 420, margin: "0 auto",
          background: "#1c1c1e",
          border: "1px solid #2c2c2e",
          borderRadius: 24,
          padding: "40px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.60)",
        }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px", marginBottom: 6, color: "#f5f5f7" }}>
            {modoRegistro ? "Crear cuenta" : "Bienvenido de vuelta"}
          </h2>
          <p style={{ fontSize: 14, color: "#8e8e93", marginBottom: 28 }}>
            {modoRegistro
              ? "Crea tus credenciales para acceder al laboratorio"
              : "Ingresa tus credenciales para acceder al laboratorio"}
          </p>

          <form onSubmit={modoRegistro ? manejarRegistro : manejarLogin} style={{ display: "grid", gap: 16 }}>
            {/* Nombre (solo registro) */}
            {modoRegistro && (
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#f5f5f7", marginBottom: 6 }}>
                  Nombre completo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Ignacio Vidal"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  autoComplete="name"
                  style={{ width: "100%" }}
                />
              </div>
            )}

            {/* Correo */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#f5f5f7", marginBottom: 6 }}>
                Correo electrónico
              </label>
              <input
                type="email"
                placeholder="Ej: alumno@ici.cl"
                value={correo}
                onChange={e => setCorreo(e.target.value)}
                autoComplete="email"
                style={{ width: "100%" }}
              />
            </div>

            {/* Contraseña */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#f5f5f7", marginBottom: 6 }}>
                Contraseña
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={verPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={contrasena}
                  onChange={e => setContrasena(e.target.value)}
                  autoComplete={modoRegistro ? "new-password" : "current-password"}
                  style={{ width: "100%", paddingRight: 48 }}
                />
                <OjoBtn ver={verPass} onClick={() => setVerPass(v => !v)} />
              </div>
            </div>

            {/* Confirmar contraseña (solo registro) */}
            {modoRegistro && (
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#f5f5f7", marginBottom: 6 }}>
                  Confirmar contraseña
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={verConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmarContrasena}
                    onChange={e => setConfirmarContrasena(e.target.value)}
                    autoComplete="new-password"
                    style={{ width: "100%", paddingRight: 48 }}
                  />
                  <OjoBtn ver={verConfirm} onClick={() => setVerConfirm(v => !v)} />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="login-btn-ripple"
              style={{
                width: "100%", padding: "14px 16px", border: "none",
                borderRadius: 980, background: "#2997ff", color: "white",
                fontSize: 17, fontWeight: 600, cursor: cargando ? "not-allowed" : "pointer",
                opacity: cargando ? 0.6 : 1,
                boxShadow: "0 4px 18px rgba(41,151,255,0.30)",
                transition: "all 0.2s", fontFamily: "inherit",
                marginTop: 4,
              }}
              onMouseEnter={e => { if(!cargando){ e.target.style.background="#3aa4ff"; e.target.style.transform="scale(1.02)" }}}
              onMouseLeave={e => { e.target.style.background="#2997ff"; e.target.style.transform="scale(1)" }}
            >
              {cargando ? "Verificando..." : modoRegistro ? "Crear cuenta →" : "Ingresar al laboratorio"}
            </button>
          </form>

          {/* Link recuperar contraseña */}
          {!modoRegistro && (
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <a
                href="/recuperar"
                style={{ fontSize: 13, color: "#636366", textDecoration: "none" }}
                onMouseEnter={e => e.target.style.color = "#8e8e93"}
                onMouseLeave={e => e.target.style.color = "#636366"}
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          )}

          {/* Mensaje */}
          {mensaje && (
            <div style={{ marginTop: 14, textAlign: "center" }}>
              <p style={{
                margin: 0, fontSize: 13,
                color: mensaje.startsWith("✓") ? "#30d158" : "#ff453a",
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {mensaje}
              </p>
              {sugerirRegistro && (
                <button
                  type="button"
                  onClick={() => { setModoRegistro(true); setSugerirRegistro(false); setMensaje(""); setContrasena("") }}
                  style={{
                    marginTop: 10, padding: "9px 18px", borderRadius: 980, cursor: "pointer",
                    background: "rgba(41,151,255,0.12)", border: "1px solid rgba(41,151,255,0.40)",
                    color: "#6db8ff", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                    transition: "all .15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(41,151,255,0.20)" }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(41,151,255,0.12)" }}
                >
                  Crear una cuenta con este correo →
                </button>
              )}
            </div>
          )}

          {/* Toggle modo */}
          <p style={{ marginTop: 16, fontSize: 13, color: "#8e8e93", textAlign: "center" }}>
            {modoRegistro ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
            <button
              type="button"
              onClick={alternarModo}
              disabled={cargando}
              style={{ background: "none", border: "none", color: "#2997ff", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}
            >
              {modoRegistro ? "Iniciar sesión" : "Regístrate"}
            </button>
          </p>

          {/* Footer info */}
          <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid #2c2c2e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#8e8e93", fontFamily: "var(--mono)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#30d158", display: "inline-block", boxShadow: "0 0 8px #30d158" }}/>
              Sistema operativo
            </div>
            <span style={{ fontSize: 11, color: "#8e8e93", fontFamily: "var(--mono)" }}>AES-256-GCM</span>
            <span style={{ fontSize: 11, color: "#8e8e93", fontFamily: "var(--mono)" }}>v1.0</span>
          </div>
        </div>
      </section>

      {/* ── HERO ── */}
      <section style={{ background: "#1c1c1e", padding: "60px 24px 80px", textAlign: "center", borderTop: "1px solid #2c2c2e" }}>
        <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", color: "#2997ff", textTransform: "uppercase", marginBottom: 16 }}>
          Instituto de Ciberseguridad Industrial
        </p>
        <h1 style={{ fontSize: "clamp(48px, 6vw, 80px)", fontWeight: 800, letterSpacing: "-3px", lineHeight: 1.0, color: "#f5f5f7", marginBottom: 20 }}>
          Aprende<br />ciberseguridad<br />
          <span style={{ color: "#2997ff", fontStyle: "normal" }}>en práctica.</span>
        </h1>
        <p style={{ fontSize: 19, fontWeight: 400, color: "#8e8e93", maxWidth: 520, margin: "0 auto 36px", lineHeight: 1.5 }}>
          Laboratorio interactivo de pentesting y defensa para estudiantes de ICI.
          Simula ataques reales, analiza amenazas y certifica tus habilidades.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn-mock-primary" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            Iniciar sesión →
          </button>
          <button className="btn-mock-outline" onClick={() => {}}>
            Ver módulos
          </button>
        </div>
      </section>

    </main>
  )
}
