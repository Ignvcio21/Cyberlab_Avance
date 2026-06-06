"use client"
import { useEffect, useState } from "react"

const COLORES = {
  ok:   { bg: "rgba(48,209,88,0.13)",  border: "rgba(48,209,88,0.30)",  color: "#30d158",  icono: "✓" },
  err:  { bg: "rgba(255,69,58,0.13)",  border: "rgba(255,69,58,0.30)",  color: "#ff453a",  icono: "✕" },
  info: { bg: "rgba(41,151,255,0.13)", border: "rgba(41,151,255,0.30)", color: "#6db8ff",  icono: "◈" },
  warn: { bg: "rgba(255,159,10,0.13)", border: "rgba(255,159,10,0.30)", color: "#ff9f0a",  icono: "⚠" },
}

export default function Toaster() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    window.cyberToast = (msg, tipo = "ok") => {
      const id = Date.now() + Math.random()
      setToasts(prev => [...prev, { id, msg, tipo, saliendo: false }])
      setTimeout(() => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, saliendo: true } : t))
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 320)
      }, 3500)
    }
    return () => { delete window.cyberToast }
  }, [])

  if (!toasts.length) return null

  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28,
      display: "flex", flexDirection: "column", gap: 10,
      zIndex: 9999, pointerEvents: "none",
    }}>
      {toasts.map(t => {
        const c = COLORES[t.tipo] || COLORES.ok
        return (
          <div key={t.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 18px", borderRadius: 12,
            minWidth: 260, maxWidth: 380,
            fontSize: 13, fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            background: c.bg,
            border: `1px solid ${c.border}`,
            color: c.color,
            boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
            backdropFilter: "blur(12px)",
            animation: t.saliendo
              ? "toastOut .28s ease-in forwards"
              : "toastIn .38s cubic-bezier(0.34,1.56,0.64,1) forwards",
          }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>{c.icono}</span>
            <span>{t.msg}</span>
          </div>
        )
      })}
    </div>
  )
}
