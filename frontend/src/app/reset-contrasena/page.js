"use client"

// =============================================================================
// PÁGINA: /reset-contrasena (segundo paso de recuperación de contraseña)
// -----------------------------------------------------------------------------
// El usuario llega aquí desde el enlace del correo, que incluye un ?token=...
// en la URL. La página valida que el token exista, pide la nueva contraseña
// (con confirmación), la envía al backend y muestra el resultado.
// El primer paso (solicitar el correo) ocurre en /recuperar.
//
// Se usa <Suspense> porque useSearchParams() debe ejecutarse del lado del
// cliente; el componente real es ResetForm y el export envuelve ese formulario.
// =============================================================================

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

// URL base del backend (variable de entorno o servidor de producción).
const API = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"

// Formulario real de restablecimiento. Se separa para poder envolverlo en
// <Suspense>, requisito de useSearchParams() en Next.js App Router.
function ResetForm() {
  const router = useRouter()
  // Lee los parámetros de la URL para extraer el token de recuperación.
  const params = useSearchParams()
  const token = params.get("token") || ""

  // Estados del formulario:
  const [nueva, setNueva] = useState("")          // nueva contraseña
  const [confirmar, setConfirmar] = useState("")  // repetición para validar
  const [estado, setEstado] = useState("form") // controla qué vista mostrar: form | ok | error
  const [mensaje, setMensaje] = useState("")      // mensaje de error/validación
  const [cargando, setCargando] = useState(false) // true mientras se envía la petición

  // Al montar: si no hay token en la URL, el enlace es inválido y se muestra
  // directamente la vista de error.
  useEffect(() => {
    if (!token) setEstado("error"), setMensaje("El enlace no es válido. Solicita uno nuevo.")
  }, [token])

  // Valida y envía la nueva contraseña al backend.
  const handleSubmit = async (e) => {
    e.preventDefault()
    // Validaciones del lado del cliente antes de llamar al servidor.
    if (nueva.length < 8) { setMensaje("La contraseña debe tener al menos 8 caracteres"); return }
    if (nueva !== confirmar) { setMensaje("Las contraseñas no coinciden"); return }
    setCargando(true); setMensaje("")
    try {
      // POST con el token (identifica al usuario) y la nueva contraseña.
      const r = await fetch(`${API}/auth/reset-contrasena`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nueva_contrasena: nueva }),
      })
      const d = await r.json()
      if (r.ok) {
        // Éxito: se muestra la pantalla de confirmación.
        setEstado("ok")
      } else {
        // El backend rechazó la petición (token vencido, etc.).
        setMensaje(d?.detail || "Error al cambiar la contraseña")
      }
    } catch {
      // Fallo de red / servidor inalcanzable.
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

        {/* Renderizado según el estado:
            - "ok": contraseña cambiada con éxito.
            - "error" sin token: enlace inválido.
            - en otro caso: formulario para escribir la nueva contraseña. */}
        {estado === "ok" ? (
          // --- Vista de éxito ---
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
          // --- Vista de enlace inválido (no llegó token en la URL) ---
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
          // --- Vista de formulario: escribir la nueva contraseña ---
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ margin: "0 0 8px", fontSize: 14, color: "#8b949e", lineHeight: 1.6 }}>
              Elige una nueva contraseña para tu cuenta de CyberLab.
            </p>

            {/* Se genera un campo de contraseña por cada entrada del arreglo
                (nueva y confirmación) para no repetir el mismo JSX dos veces. */}
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
                  placeholder="Mínimo 8 caracteres"
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

// Componente exportado por defecto: envuelve el formulario en <Suspense>
// para que Next.js pueda resolver useSearchParams() del lado del cliente,
// mostrando un "Cargando..." mientras tanto.
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
