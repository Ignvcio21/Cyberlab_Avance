"use client"

// =============================================================================
// PÁGINA: /recuperar (solicitud de recuperación de contraseña)
// -----------------------------------------------------------------------------
// Primer paso del flujo "olvidé mi contraseña". El usuario escribe su correo
// y el sistema le envía (vía SendGrid en el backend) un enlace con un token
// para restablecerla. Por seguridad, la respuesta es siempre la misma aunque
// el correo no exista, para no revelar qué cuentas están registradas.
// El segundo paso (crear la nueva contraseña) ocurre en /reset-contrasena.
// =============================================================================

import { useState } from "react"
import { useRouter } from "next/navigation"

// URL base del backend. Usa la variable de entorno si existe; si no, cae al
// servidor de producción en Railway por defecto.
const API = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"

export default function RecuperarContrasena() {
  // Router para volver al login una vez enviado el correo.
  const router = useRouter()
  // Estados del formulario:
  const [correo, setCorreo] = useState("")      // correo ingresado por el usuario
  const [enviado, setEnviado] = useState(false)  // true tras enviar la solicitud con éxito
  const [cargando, setCargando] = useState(false) // true mientras se espera al backend
  const [error, setError] = useState("")          // mensaje de error a mostrar

  // Envía la solicitud de recuperación al backend.
  const handleSubmit = async (e) => {
    e.preventDefault()
    // Si el campo está vacío no se hace nada.
    if (!correo.trim()) return
    setCargando(true); setError("")
    try {
      // POST al endpoint de recuperación con el correo normalizado (sin
      // espacios y en minúsculas) para evitar duplicados por formato.
      const r = await fetch(`${API}/auth/recuperar-contrasena`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correo.trim().toLowerCase() }),
      })
      if (r.ok) {
        // Éxito: se muestra la pantalla de "correo enviado".
        setEnviado(true)
      } else {
        // El backend devolvió un error; se intenta leer el detalle.
        const d = await r.json()
        setError(d?.detail || "Error al enviar el correo")
      }
    } catch {
      // Fallo de red / servidor no alcanzable.
      setError("No se pudo conectar con el servidor")
    } finally {
      // Pase lo que pase, se desactiva el spinner de carga.
      setCargando(false)
    }
  }

  return (
    // Contenedor a pantalla completa que centra la tarjeta vertical y
    // horizontalmente sobre el fondo oscuro característico de CyberLab.
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0d1117", padding: "24px 16px",
    }}>
      {/* Tarjeta central que contiene el logo y el formulario / confirmación. */}
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

        {/* Renderizado condicional: si ya se envió la solicitud se muestra el
            mensaje de confirmación; si no, se muestra el formulario. */}
        {enviado ? (
          // --- Vista de confirmación: el correo fue enviado ---
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
          // --- Vista de formulario: pedir el correo electrónico ---
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

            {/* Caja de error (solo visible si hay un mensaje de error). */}
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
