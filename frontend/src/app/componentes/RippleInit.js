"use client"
import { useEffect } from "react"

// Aplica efecto ripple en todos los botones principales del proyecto
const SELECTORES = [
  ".boton-principal",
  ".btn-evaluar",
  ".boton-secundario",
  ".pildora-nav",
  ".pildora-cta",
  ".login-btn-ripple",
].join(", ")

export default function RippleInit() {
  useEffect(() => {
    const handler = (e) => {
      const btn = e.target.closest(SELECTORES)
      if (!btn) return

      const rect = btn.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height) * 2.2
      const x = e.clientX - rect.left - size / 2
      const y = e.clientY - rect.top - size / 2

      const circle = document.createElement("span")
      circle.style.cssText = `
        position:absolute;
        border-radius:50%;
        width:${size}px;
        height:${size}px;
        left:${x}px;
        top:${y}px;
        background:rgba(255,255,255,0.22);
        transform:scale(0);
        animation:cyberRipple .65s linear forwards;
        pointer-events:none;
        z-index:0;
      `

      // Asegurar que el botón tenga overflow hidden y position relative
      const prevPos = getComputedStyle(btn).position
      if (prevPos === "static") btn.style.position = "relative"
      btn.style.overflow = "hidden"

      btn.appendChild(circle)
      setTimeout(() => circle.remove(), 680)
    }

    document.addEventListener("click", handler)
    return () => document.removeEventListener("click", handler)
  }, [])

  return null
}
