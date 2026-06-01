"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

const API = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"

function ResetForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get("token") || ""

  const [nueva, setNueva] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [estado, setEstado] = useState("form") // form | ok | error
  const [mensaje, setMensaje] = useState("")
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (!token) setEstado("error"), setMensaje("El enlace no es válido. Solicita uno nuevo.")
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (nueva.length < 6) { setMensaje("La contraseña debe tener al menos 6 caracteres"); return }
    if (nueva !== confirmar) { setMensaje("Las contraseñas no coinciden"); return }
    setCargando(true); setMensaje("")
    try {
      const r = await fetch(`${API}/auth/reset-contrasena`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nueva_contrasena: nueva }),
      })
      const d = await r.json()
      if (r.ok) {
        setEstado("ok")
      } else {
        setMensaje(d?.detail || "Error al cambiar la contraseña")
      }
    } catch {
      setMensaje("No se pudo conectar con el servidor")
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
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔐</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#f0f6fc", letterSpacing: "-0.5px" }}>CyberLab</div>
          <div style={{ fontSize: 13, color: "#6e7681", marginTop: 4 }}>Nueva contraseña</div>
        </div>

        {estado === "ok" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 800, color: "#22c55e" }}>
              ¡Contraseña actualizada!
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#8b949e", lineHeight: 1.6 }}>
              Tu contraseña fue cambiada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
            <button
              onClick={() => router.push("/")}
              style={{
                width: "100%", padding: "13px 0", fontSize: 15, fontWeight: 700,
                background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
                color: "#fff", border: "none", borderRadius: 10, cursor: "pointer",
              }}
            >
              Ir a iniciar sesión →
            </button>
          </div>
        ) : estado === "error" && !token ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⛔</div>
            <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 800, color: "#f85149" }}>
              Enlace inválido
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#8b949e" }}>{mensaje}</p>
            <button onClick={() => router.push("/recuperar")} style={{
              width: "100%", padding: "13px 0", fontSize: 15, fontWeight: 700,
              background: "#21262d", color: "#c9d1d9", border: "1px solid #30363d",
              borderRadius: 10, cursor: "pointer",
            }}>
              Solicitar nuevo enlace
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ margin: "0 0 8px", fontSize: 14, color: "#8b949e", lineHeight: 1.6 }}>
              Elige una nueva contraseña para tu cuenta de CyberLab.
            </p>

            {[
              { label: "Nueva contraseña", value: nueva, setter: setNueva },
              { label: "Confirmar contraseña", value: confirmar, setter: setConfirmar },
            ].map(({ label, value, setter }) => (
              <div key={label}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#8b949e", marginBottom: 6 }}>
                  {label}
                </label>
                <input
                  type="password"
                  value={value}
                  onChange={e => setter(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  style={{
                    width: "100%", padding: "12px 14px", fontSize: 14,
                    background: "#0d1117", border: "1px solid #30363d", borderRadius: 10,
                    color: "#f0f6fc", outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            ))}

            {mensaje && (
              <div style={{ fontSize: 13, color: "#f85149", background: "rgba(248,81,73,0.1)", border: "1px solid rgba(248,81,73,0.25)", borderRadius: 8, padding: "10px 14px" }}>
                {mensaje}
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
              {cargando ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetContrasena() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1117", color: "#8b949e" }}>
        Cargando...
      </div>
    }>
      <ResetForm />
    </Suspense>
  )
}
