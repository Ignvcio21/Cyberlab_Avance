"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function BarraSuperior({ paginaActiva }) {
  const router = useRouter()
  const [nombreUsuario, setNombreUsuario] = useState("")
  const [rolUsuario, setRolUsuario] = useState("")

  useEffect(() => {
    const u = localStorage.getItem("nombre_usuario") || ""
    const r = localStorage.getItem("rol_usuario") || ""
    setNombreUsuario(u)
    setRolUsuario(r)
  }, [])

  const ir = (ruta) => router.push(ruta)

  const salir = () => {
    localStorage.removeItem("nombre_usuario")
    localStorage.removeItem("rol_usuario")
    router.push("/")
  }

  const puedeVerPanel = rolUsuario === "admin" || rolUsuario === "docente"

  return (
    <header className="barra-superior">
      <div className="barra-izquierda" onClick={() => ir("/inicio")}>
        <div className="marca-icono">CL</div>
        <div className="marca-texto">
          <div className="marca-nombre">CyberLab</div>
          <div className="marca-subtitulo">Entrenamiento práctico</div>
        </div>
      </div>

      <nav className="barra-nav" aria-label="Navegación">
        <button
          className={`pildora-nav ${paginaActiva === "inicio" ? "activa" : ""}`}
          onClick={() => ir("/inicio")}
          type="button"
        >
          Inicio
        </button>

        <button
          className={`pildora-nav ${paginaActiva === "laboratorio" ? "activa" : ""}`}
          onClick={() => ir("/dashboard")}
          type="button"
        >
          Laboratorio
        </button>

        <button
          className={`pildora-nav ${paginaActiva === "informacion" ? "activa" : ""}`}
          onClick={() => ir("/dashboard/informacion?nivel=1")}
          type="button"
        >
          Información
        </button>

        {puedeVerPanel ? (
          <button
            className={`pildora-nav ${paginaActiva === "panel" ? "activa" : ""}`}
            onClick={() => ir("/panel")}
            type="button"
          >
            Panel
          </button>
        ) : null}
      </nav>

      <div className="barra-derecha">
        <div className="usuario-pill">
          Operador: <strong>{nombreUsuario || "—"}</strong>
        </div>
        <button className="pildora-cta" type="button" onClick={salir}>
          Salir
        </button>
      </div>
    </header>
  )
}