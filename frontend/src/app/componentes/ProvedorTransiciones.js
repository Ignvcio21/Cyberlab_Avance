"use client"

import { motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

export default function ProvedorTransiciones({ children }) {
  const ruta = usePathname()
  const rutaAnteriorRef = useRef(null)
  const [animar, setAnimar] = useState(false)

  useEffect(() => {
    const anterior = rutaAnteriorRef.current
    // SOLO login (/) -> inicio (/inicio)
    const debeAnimar = anterior === "/" && ruta === "/inicio"
    setAnimar(debeAnimar)
    rutaAnteriorRef.current = ruta
  }, [ruta])

  return (
    <>
      {/* Overlay SOLO cuando corresponde */}
      {animar && (
        <motion.div
          key="overlay-login-inicio"
          initial={{ y: "100%" }}
          animate={{ y: ["100%", "0%", "-100%"] }}
          transition={{
            duration: 0.25,
            times: [0, 0.25, 1],
            ease: [0.22, 1, 0.36, 1]
          }}
          onAnimationComplete={() => setAnimar(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            pointerEvents: "none"
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg, rgba(79,140,255,.92), rgba(124,92,255,.90), rgba(34,199,255,.88))"
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 20% 30%, rgba(255,255,255,.25), transparent 45%), radial-gradient(circle at 80% 60%, rgba(255,255,255,.18), transparent 50%)",
              mixBlendMode: "soft-light"
            }}
          />
        </motion.div>
      )}

      {/* Contenido normal (sin animar rutas) */}
      {children}
    </>
  )
}