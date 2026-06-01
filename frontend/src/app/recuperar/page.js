"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const API = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"

export default function RecuperarContrasena() {
  const router = useRouter()
  const [correo, setCorreo] = useState("")
  const [enviado, setEnviado] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!correo.trim()) return
    setCargando(true); setError("")
    try {
      const r = await fetch(`${API}/auth/recuperar-contrasena`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correo.trim().toLowerCase() }),
      })
      if (r.ok) {
        setEnviado(true)
      } else {
        const d = await r.json()
        setError(d?.detail || "Error al enviar el correo")
      }
    } catch {
      setError("No se pudo conectar con el servidor")
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0d1117", padding: "24px 16px",
    }}>
      <div style={{
        width: "100%", maxWidth: 420,
        background: "#161b22", borderRadius: 16,
        border: "1px solid #30363d", padding: "40px 36px",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⚡</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#f0f6fc", letterSpacing: "-0.5px" }}>CyberLab</div>
          <div style={{ fontSize: 13, color: "#6e7681", marginTop: 4 }}>Recuperar contraseña</div>
        </div>

        {enviado ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
            <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 800, color: "#f0f6fc" }}>
              Correo enviado
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#8b949e", lineHeight: 1.6 }}>
              Si <strong style={{ color: "#c9d1d9" }}>{correo}</strong> está registrado en CyberLab,
              recibirás un enlace para restablecer tu contraseña en los próximos minutos.
              Revisa también tu carpeta de spam.
            </p>
            <button
              onClick={() => router.push("/")}
              style={{
                width: "100%", padding: "13px 0", fontSize: 15, fontWeight: 700,
                background: "#21262d", color: "#c9d1d9", border: "1px solid #30363d",
                borderRadius: 10, cursor: "pointer",
              }}
            >
              Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ margin: "0 0 8px", fontSize: 14, color: "#8b949e", lineHeight: 1.6 }}>
              Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
            </p>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#8b949e", marginBottom: 6 }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={correo}
                onChange={e => setCorreo(e.target.value)}
                placeholder="tu@correo.com"
                required
                style={{
                  width: "100%", padding: "12px 14px", fontSize: 14,
                  background: "#0d1117", border: "1px solid #30363d", borderRadius: 10,
                  color: "#f0f6fc", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {error && (
              <div style={{ fontSize: 13, color: "#f85149", background: "rgba(248,81,73,0.1)", border: "1px solid rgba(248,81,73,0.25)", borderRadius: 8, padding: "10px 14px" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              style={{
                padding: "13px 0", fontSize: 15, fontWeight: 700,
                background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
                color: "#fff", border: "none", borderRadius: 10,
                cursor: cargando ? "not-allowed" : "pointer", opacity: cargando ? 0.7 : 1,
              }}
            >
              {cargando ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              style={{
                padding: "11px 0", fontSize: 14, fontWeight: 600,
                background: "none", color: "#6e7681", border: "none", cursor: "pointer",
              }}
            >
              ← Volver al inicio
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
