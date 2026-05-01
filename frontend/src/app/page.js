"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function Inicio() {
  const router = useRouter()
  const [nombreUsuario, setNombreUsuario] = useState("")
  const [contrasena, setContrasena] = useState("")
  const [mensaje, setMensaje] = useState("")

  const manejarLogin = async (e) => {
    e.preventDefault()

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
        return
      }

      localStorage.setItem("nombre_usuario", datos.nombre_usuario)
      router.push("/dashboard")
    } catch {
      setMensaje("No se pudo conectar con el backend")
    }
  }

  return (
    <main className="pagina-inicio">
      <section className="tarjeta-inicio">
        <div className="insignia-inicio">CYBERLAB</div>

        <h1 className="titulo-inicio">Acceso al sistema</h1>

        <p className="subtitulo-inicio">
          Plataforma web de entrenamiento práctico para análisis de eventos,
          simulación de ataques y respuesta ante incidentes en entornos controlados.
        </p>

        <form onSubmit={manejarLogin} className="formulario-inicio">
          <input
            type="text"
            placeholder="Nombre de usuario"
            value={nombreUsuario}
            onChange={(e) => setNombreUsuario(e.target.value)}
            className="campo-inicio"
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            className="campo-inicio"
          />

          <button type="submit" className="boton-principal">
            Ingresar al sistema
          </button>
        </form>

        <div className="mensaje-inicio">{mensaje}</div>

        <div className="caja-informacion">
          <div className="titulo-caja-informacion">Acceso de prueba</div>
          <div>Usuario: <strong>admin</strong></div>
          <div>Clave: <strong>admin123</strong></div>
        </div>
      </section>
    </main>
  )
}