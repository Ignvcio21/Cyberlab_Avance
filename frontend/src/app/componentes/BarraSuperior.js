"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function BarraSuperior({ paginaActiva }) {
  const router = useRouter()
  const [nombreUsuario, setNombreUsuario] = useState("")

  useEffect(() => {
    const u = localStorage.getItem("nombre_usuario") || ""
    setNombreUsuario(u)
  }, [])

  const ir = (ruta) => router.push(ruta)

  const salir = () => {
    localStorage.removeItem("nombre_usuario")
    router.push("/")
  }

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