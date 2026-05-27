"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function InicioSesion() {
  const router = useRouter()

  const [modoRegistro, setModoRegistro] = useState(false)

  const [nombreUsuario, setNombreUsuario] = useState("")
  const [contrasena, setContrasena] = useState("")
  const [confirmarContrasena, setConfirmarContrasena] = useState("")

  const [mensaje, setMensaje] = useState("")
  const [cargando, setCargando] = useState(false)

  const manejarLogin = async (e) => {
    e.preventDefault()
    if (cargando) return
    setMensaje("")
    setCargando(true)

    try {
      const respuesta = await fetch("http://127.0.0.1:8000/iniciar-sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_usuario: nombreUsuario,
          contrasena: contrasena
        })
      })

      const datos = await respuesta.json()

      if (!respuesta.ok) {
        setMensaje(datos.detail || "Error al iniciar sesión")
        setCargando(false)
        return
      }

      localStorage.setItem("nombre_usuario", datos.nombre_usuario)
      if (datos.rol) localStorage.setItem("rol_usuario", datos.rol)

      router.push("/inicio")
    } catch {
      setMensaje("No se pudo conectar con el servidor")
    } finally {
      setCargando(false)
    }
  }

  const manejarRegistro = async (e) => {
    e.preventDefault()
    if (cargando) return
    setMensaje("")

    if (!nombreUsuario.trim() || !contrasena.trim()) {
      setMensaje("Completa nombre de usuario y contraseña")
      return
    }

    if (contrasena.length < 4) {
      setMensaje("La contraseña debe tener al menos 4 caracteres")
      return
    }

    if (contrasena !== confirmarContrasena) {
      setMensaje("Las contraseñas no coinciden")
      return
    }

    setCargando(true)

    try {
      const respuesta = await fetch("http://127.0.0.1:8000/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_usuario: nombreUsuario,
          contrasena: contrasena
        })
      })

      const datos = await respuesta.json()

      if (!respuesta.ok) {
        setMensaje(datos.detail || "No se pudo completar el registro")
        setCargando(false)
        return
      }

      setMensaje("✓ Cuenta creada. Ya puedes iniciar sesión.")
      setModoRegistro(false)
      setConfirmarContrasena("")
    } catch {
      setMensaje("No se pudo conectar con el servidor")
    } finally {
      setCargando(false)
    }
  }

  const alternarModo = () => {
    setMensaje("")
    setModoRegistro((v) => !v)
    setContrasena("")
    setConfirmarContrasena("")
  }

  return (
    <main className="pagina-inicio">
      {/* Panel izquierdo — branding */}
      <div className="pagina-inicio-branding">
        <div className="branding-logo">
          <div className="branding-logo-icono">CL</div>
          <div className="branding-logo-texto">
            <div className="branding-nombre">CyberLab</div>
            <div className="branding-subtitulo">SECURITY OPERATIONS CENTER</div>
          </div>
        </div>

        <h1 className="branding-titular">
          Aprende ciberseguridad en{" "}
          <span className="branding-acento">entornos reales</span>
        </h1>

        <p className="branding-desc">
          Plataforma de entrenamiento práctico en pentesting y respuesta ante incidentes.
          Simulaciones controladas, progreso verificable y evaluación docente integrada.
        </p>

        <div className="branding-chips">
          <span className="branding-chip">Fuerza Bruta</span>
          <span className="branding-chip">Escaneo de Puertos</span>
          <span className="branding-chip">Terminal Kali</span>
          <span className="branding-chip">SOC Dashboard</span>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="pagina-inicio-form">
        <div className="tarjeta-inicio">
          <div className="login-header">
            <div className="login-tag">
              <span className="login-footer-dot" />
              {modoRegistro ? "NUEVA CUENTA" : "ACCESO AL SISTEMA"}
            </div>
            <h2 className="titulo-inicio">
              {modoRegistro ? "Crear cuenta" : "Iniciar sesión"}
            </h2>
            <p className="subtitulo-inicio">
              {modoRegistro
                ? "Crea tus credenciales de acceso para la plataforma."
                : "Ingresa tus credenciales para acceder al entorno de entrenamiento."}
            </p>
          </div>

          {!modoRegistro ? (
            <form onSubmit={manejarLogin} className="formulario-inicio">
              <div className="campo-grupo">
                <label className="campo-label">IDENTIFICADOR</label>
                <input
                  type="text"
                  placeholder="Nombre de usuario"
                  value={nombreUsuario}
                  onChange={(e) => setNombreUsuario(e.target.value)}
                  className="campo-inicio"
                  autoComplete="username"
                />
              </div>

              <div className="campo-grupo">
                <label className="campo-label">CONTRASEÑA</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  className="campo-inicio"
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" className="boton-principal" disabled={cargando}>
                {cargando ? "Verificando..." : "Ingresar al sistema →"}
              </button>
            </form>
          ) : (
            <form onSubmit={manejarRegistro} className="formulario-inicio">
              <div className="campo-grupo">
                <label className="campo-label">IDENTIFICADOR</label>
                <input
                  type="text"
                  placeholder="Nombre de usuario"
                  value={nombreUsuario}
                  onChange={(e) => setNombreUsuario(e.target.value)}
                  className="campo-inicio"
                  autoComplete="username"
                />
              </div>

              <div className="campo-grupo">
                <label className="campo-label">CONTRASEÑA</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  className="campo-inicio"
                  autoComplete="new-password"
                />
              </div>

              <div className="campo-grupo">
                <label className="campo-label">CONFIRMAR CONTRASEÑA</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmarContrasena}
                  onChange={(e) => setConfirmarContrasena(e.target.value)}
                  className="campo-inicio"
                  autoComplete="new-password"
                />
              </div>

              <button type="submit" className="boton-principal" disabled={cargando}>
                {cargando ? "Creando cuenta..." : "Crear cuenta →"}
              </button>
            </form>
          )}

          <div className="mensaje-inicio">{mensaje}</div>

          <div className="acciones-login">
            <button
              type="button"
              className="boton-secundario"
              onClick={alternarModo}
              disabled={cargando}
            >
              {modoRegistro
                ? "← Volver a iniciar sesión"
                : "¿No tienes cuenta? Regístrate"}
            </button>
          </div>

          <div className="login-footer">
            <div className="login-footer-stat">
              <span className="login-footer-dot" />
              Sistema operativo
            </div>
            <div className="login-footer-stat">AES-256-GCM</div>
            <div className="login-footer-stat">v1.0</div>
          </div>
        </div>
      </div>
    </main>
  )
}
