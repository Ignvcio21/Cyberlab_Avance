"use client"
import { useEffect, useState, useRef } from "react"

export default function BarraProgreso() {
  const [activa, setActiva] = useState(false)
  const [ancho, setAncho] = useState(0)
  const ivRef = useRef(null)

  useEffect(() => {
    window.cyberProgress = {
      start: () => {
        clearInterval(ivRef.current)
        setAncho(0)
        setActiva(true)
        let w = 0
        ivRef.current = setInterval(() => {
          w += (92 - w) * 0.07
          setAncho(Math.min(w, 92))
        }, 40)
      },
      end: () => {
        clearInterval(ivRef.current)
        setAncho(100)
        setTimeout(() => {
          setActiva(false)
          setAncho(0)
        }, 450)
      },
    }
    return () => {
      clearInterval(ivRef.current)
      delete window.cyberProgress
    }
  }, [])

  if (!activa) return null

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0,
      height: 3, zIndex: 10000, pointerEvents: "none",
    }}>
      <div style={{
        height: "100%",
        width: ancho + "%",
        background: "linear-gradient(90deg, #2997ff, #5e5ce6)",
        boxShadow: "0 0 10px rgba(41,151,255,0.8), 0 0 4px rgba(94,92,230,0.6)",
        transition: ancho >= 100 ? "width .35s ease" : "none",
        borderRadius: "0 2px 2px 0",
      }} />
    </div>
  )
}
