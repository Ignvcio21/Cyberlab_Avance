"use client"

// La administración de contenido y ejercicios se unificó en el Panel.
// Esta ruta antigua redirige al Panel para no dejar una página huérfana.
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AdminRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace("/panel") }, [router])
  return null
}
