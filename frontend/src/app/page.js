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
      setMensaje("No se pudo conectar con el backend")
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

      setMensaje("Registro completado. Ahora puedes iniciar sesión.")
      setModoRegistro(false)
      setConfirmarContrasena("")
    } catch {
      setMensaje("No se pudo conectar con el backend")
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
      <section className="tarjeta-inicio">
        <div className="logo-login">
          <img src="/logo-cyberlab.png" alt="CyberLab" className="logo-login-img" />
        </div>

        <p className="subtitulo-inicio">
          {modoRegistro
            ? "Crea una cuenta de estudiante para acceder a la plataforma."
            : "Ingresa con tus credenciales para acceder a la plataforma."}
        </p>

        {!modoRegistro ? (
          <form onSubmit={manejarLogin} className="formulario-inicio">
            <input
              type="text"
              placeholder="Nombre de usuario"
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              className="campo-inicio"
              autoComplete="username"
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              className="campo-inicio"
              autoComplete="current-password"
            />

            <button type="submit" className="boton-principal" disabled={cargando}>
              {cargando ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        ) : (
          <form onSubmit={manejarRegistro} className="formulario-inicio">
            <input
              type="text"
              placeholder="Nombre de usuario"
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              className="campo-inicio"
              autoComplete="username"
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              className="campo-inicio"
              autoComplete="new-password"
            />

            <input
              type="password"
              placeholder="Confirmar contraseña"
              value={confirmarContrasena}
              onChange={(e) => setConfirmarContrasena(e.target.value)}
              className="campo-inicio"
              autoComplete="new-password"
            />

            <button type="submit" className="boton-principal" disabled={cargando}>
              {cargando ? "Registrando..." : "Crear cuenta "}
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
            {modoRegistro ? "Volver a iniciar sesión" : "¿No tienes una cuenta? Registrate"}
          </button>
        </div>

        
      </section>
    </main>
  )
}