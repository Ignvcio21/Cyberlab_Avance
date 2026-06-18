"use client"

// =============================================================================
// PÁGINA: /admin (ruta de redirección legacy)
// -----------------------------------------------------------------------------
// Antiguamente esta ruta mostraba la administración de contenido y ejercicios.
// Esa funcionalidad se movió al Panel, por lo que esta página ya no renderiza
// nada propio: su único trabajo es redirigir automáticamente al usuario a
// "/panel" en cuanto se monta, evitando dejar una URL rota o huérfana.
// =============================================================================

// La administración de contenido y ejercicios se unificó en el Panel.
// Esta ruta antigua redirige al Panel para no dejar una página huérfana.
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AdminRedirect() {
  // Hook de navegación de Next.js para cambiar de ruta mediante código.
  const router = useRouter()
  // Al montar el componente se reemplaza la URL actual por "/panel".
  // Se usa replace() (en vez de push()) para que "/admin" no quede en el
  // historial del navegador y el botón "atrás" no devuelva aquí.
  useEffect(() => { router.replace("/panel") }, [router])
  // No se muestra nada en pantalla: la redirección es inmediata.
  return null
}
