"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const TEXTO_TW = "cyberlab@kali:~$"

export default function BarraSuperior({ paginaActiva }) {
  const router = useRouter()
  const [nombreUsuario, setNombreUsuario] = useState("")
  const [rolUsuario, setRolUsuario] = useState("")
  const [twTexto, setTwTexto] = useState("")
  const [twListo, setTwListo] = useState(false)

  useEffect(() => {
    const u = sessionStorage.getItem("nombre_display") || sessionStorage.getItem("nombre_usuario") || ""
    const r = sessionStorage.getItem("rol_usuario") || ""
    setNombreUsuario(u)
    setRolUsuario(r)
  }, [])

  // Animación typewriter al montar
  useEffect(() => {
    let i = 0
    const iv = setInterval(() => {
      i++
      setTwTexto(TEXTO_TW.slice(0, i))
      if (i === TEXTO_TW.length) { clearInterval(iv); setTwListo(true) }
    }, 55)
    return () => clearInterval(iv)
  }, [])

  const ir = (ruta) => router.push(ruta)

  const salir = () => {
    sessionStorage.removeItem("nombre_usuario")
    sessionStorage.removeItem("nombre_display")
    sessionStorage.removeItem("rol_usuario")
    sessionStorage.removeItem("token")
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
          <div className="marca-subtitulo" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
            {twTexto}
            <span style={{
              display: "inline-block", width: 1, height: 11,
              background: "#00daf3", marginLeft: 1,
              verticalAlign: "middle",
              animation: twListo ? "twCursor 1s step-end infinite" : "none",
              opacity: twListo ? 1 : 1,
            }} />
          </div>
        </div>
      </div>

      <nav className="barra-nav" aria-label="Navegación">
        <button
          className={`pildora-nav ${paginaActiva === "inicio" ? "activa" : ""}`}
          onClick={() => ir("/inicio")} type="button"
        >
          Inicio
        </button>

        {!puedeVerPanel && (
          <button
            className={`pildora-nav ${paginaActiva === "laboratorio" ? "activa" : ""}`}
            onClick={() => ir("/dashboard")} type="button"
          >
            ⚔ Ataque
          </button>
        )}

        {!puedeVerPanel && (
          <button
            className={`pildora-nav ${paginaActiva === "defensa" ? "activa" : ""}`}
            onClick={() => ir("/dashboard/defensa")} type="button"
            style={paginaActiva === "defensa" ? {
              background: "linear-gradient(135deg, rgba(0,218,243,0.80), rgba(0,163,255,0.80))",
            } : {}}
          >
            🛡 Defensa
          </button>
        )}

        {!puedeVerPanel && (
          <button
            className={`pildora-nav ${paginaActiva === "informacion" ? "activa" : ""}`}
            onClick={() => ir("/dashboard/informacion?nivel=1")} type="button"
          >
            Información
          </button>
        )}

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

        {puedeVerPanel && (
          <button
            className={`pildora-nav ${paginaActiva === "estadisticas" ? "activa" : ""}`}
            onClick={() => ir("/estadisticas")} type="button"
          >
            ◈ Exportar
          </button>
        )}
      </nav>

      <div className="barra-derecha">
        <button
          type="button"
          onClick={() => ir("/perfil")}
          title="Ver mi perfil"
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "6px 14px", borderRadius: 20,
            background: paginaActiva === "perfil" ? "rgba(94,92,230,0.18)" : "rgba(255,255,255,0.06)",
            border: paginaActiva === "perfil" ? "1px solid rgba(94,92,230,0.45)" : "1px solid rgba(255,255,255,0.10)",
            color: paginaActiva === "perfil" ? "#5e5ce6" : "#aeaeb2",
            cursor: "pointer", fontSize: 13, fontWeight: 600,
            transition: "all .15s",
          }}
        >
          <span style={{ fontSize: 14 }}>👤</span>
          Perfil
        </button>
        <button className="pildora-cta" type="button" onClick={salir}>
          Salir
        </button>
      </div>

      <style>{`
        @keyframes twCursor {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </header>
  )
}
