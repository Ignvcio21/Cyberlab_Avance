"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

const NAV_ITEMS = [
  { id: "inicio",       label: "Inicio",        icon: "⌂",  ruta: "/inicio" },
  { id: "laboratorio",  label: "Laboratorio",   icon: "⚡",  ruta: "/dashboard" },
  { id: "informacion",  label: "Información",   icon: "📖",  ruta: "/dashboard/informacion?nivel=1" },
  { id: "panel",        label: "Panel",         icon: "🛡",  ruta: "/panel",   rolRequerido: ["admin","docente"] },
  { id: "admin",        label: "Administrar",   icon: "⚙",  ruta: "/admin",   rolRequerido: ["admin"] },
]

export default function SidebarNav({ paginaActiva }) {
  const router = useRouter()
  const [nombreUsuario, setNombreUsuario] = useState("")
  const [rolUsuario, setRolUsuario]       = useState("")
  const [colapsado, setColapsado]         = useState(false)

  useEffect(() => {
    setNombreUsuario(localStorage.getItem("nombre_usuario") || "")
    setRolUsuario(localStorage.getItem("rol_usuario") || "")
  }, [])

  const salir = () => {
    localStorage.removeItem("nombre_usuario")
    localStorage.removeItem("rol_usuario")
    router.push("/")
  }

  const itemsVisibles = NAV_ITEMS.filter(item => {
    if (!item.rolRequerido) return true
    return item.rolRequerido.includes(rolUsuario)
  })

  return (
    <aside className={`sidebar ${colapsado ? "sidebar-colapsado" : ""}`}>
      <div className="sidebar-logo" onClick={() => router.push("/inicio")}>
        <div className="sidebar-logo-icono">CL</div>
        {!colapsado && (
          <div className="sidebar-logo-texto">
            <span className="sidebar-logo-nombre">CyberLab</span>
            <span className="sidebar-logo-sub">cyberlab@kali:~$</span>
          </div>
        )}
      </div>

      <button className="sidebar-toggle" onClick={() => setColapsado(v => !v)} title={colapsado ? "Expandir" : "Colapsar"}>
        {colapsado ? "▶" : "◀"}
      </button>

      <nav className="sidebar-nav">
        {itemsVisibles.map(item => (
          <button
            key={item.id}
            className={`sidebar-item ${paginaActiva === item.id ? "sidebar-item-activo" : ""}`}
            onClick={() => router.push(item.ruta)}
            title={colapsado ? item.label : ""}
          >
            <span className="sidebar-item-icono">{item.icon}</span>
            {!colapsado && <span className="sidebar-item-label">{item.label}</span>}
            {!colapsado && paginaActiva === item.id && <span className="sidebar-item-dot" />}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!colapsado && (
          <div className="sidebar-usuario">
            <div className="sidebar-usuario-nombre">{nombreUsuario || "—"}</div>
            <div className="sidebar-usuario-rol">[{rolUsuario || "estudiante"}]</div>
          </div>
        )}
        <button className="sidebar-salir" onClick={salir} title="Cerrar sesión">
          {colapsado ? "✕" : "Cerrar sesión"}
        </button>
      </div>
    </aside>
  )
}