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
    localStorage.removeItem("token")
    router.push("/")
  }

  const puedeVerPanel = rolUsuario === "admin" || rolUsuario === "docente"
  const puedeVerNotas = rolUsuario === "estudiante" || (!puedeVerPanel && rolUsuario !== "")

  return (
    <header className="barra-superior">
      <div className="barra-izquierda" onClick={() => ir("/inicio")}>
        <div className="marca-icono">CL</div>
        <div className="marca-texto">
          <div className="marca-nombre">CyberLab</div>
          <div className="marca-subtitulo">cyberlab@kali:~$</div>
        </div>
      </div>

      <nav className="barra-nav" aria-label="Navegación">
        <button
          className={`pildora-nav ${paginaActiva === "inicio" ? "activa" : ""}`}
          onClick={() => ir("/inicio")} type="button"
        >
          Inicio
        </button>

        <button
          className={`pildora-nav ${paginaActiva === "laboratorio" ? "activa" : ""}`}
          onClick={() => ir("/dashboard")} type="button"
        >
          ⚔ Ataque
        </button>

        {/* Defensa — nuevo tab */}
        <button
          className={`pildora-nav ${paginaActiva === "defensa" ? "activa" : ""}`}
          onClick={() => ir("/dashboard/defensa")} type="button"
          style={paginaActiva === "defensa" ? {
            background: "linear-gradient(135deg, rgba(0,218,243,0.80), rgba(0,163,255,0.80))",
          } : {}}
        >
          🛡 Defensa
        </button>

        <button
          className={`pildora-nav ${paginaActiva === "informacion" ? "activa" : ""}`}
          onClick={() => ir("/dashboard/informacion?nivel=1")} type="button"
        >
          Información
        </button>

        {puedeVerNotas && (
          <button
            className={`pildora-nav ${paginaActiva === "notas" ? "activa" : ""}`}
            onClick={() => ir("/notas")} type="button"
          >
            Notas
          </button>
        )}

        {puedeVerPanel && (
          <button
            className={`pildora-nav ${paginaActiva === "panel" ? "activa" : ""}`}
            onClick={() => ir("/panel")} type="button"
          >
            {rolUsuario === "admin" ? "⚙ Administrar" : "Panel"}
          </button>
        )}
      </nav>

      <div className="barra-derecha">
        <div className="usuario-pill">
          ▸ <strong>{nombreUsuario || "—"}</strong>
          {rolUsuario ? ` [${rolUsuario}]` : ""}
        </div>
        <button className="pildora-cta" type="button" onClick={salir}>
          Salir
        </button>
      </div>
    </header>
  )
}