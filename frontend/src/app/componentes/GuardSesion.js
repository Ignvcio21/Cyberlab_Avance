"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function GuardSesion({ children }) {
  const router = useRouter()
  const [listo, setListo] = useState(false)

  useEffect(() => {
    const usuario = localStorage.getItem("nombre_usuario")
    if (!usuario) {
      router.replace("/")
      return
    }
    setListo(true)
  }, [router])

  if (!listo) return null
  return children
}