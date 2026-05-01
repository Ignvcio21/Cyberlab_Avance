"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { marked } from "marked"

marked.setOptions({ mangle: false, headerIds: false })
export default function InformacionDashboard() {
  const router = useRouter()
  const finContenidoRef = useRef(null)

  const [nombreUsuario, setNombreUsuario] = useState("")
  const [nivelLeccion, setNivelLeccion] = useState(1)
  const [seccionLeccion, setSeccionLeccion] = useState("introduccion")
  const [nivelesCompletados, setNivelesCompletados] = useState({ nivel1: false })

  // ✅ NUEVO: texto cargado dinámicamente desde .md
  const [textoActual, setTextoActual] = useState("Cargando contenido...")

  const NIVELES = useMemo(
    () => [
      { id: 1, titulo: "Introducción y fundamentos", bloqueado: false },
      { id: 2, titulo: "Fuerza bruta y control de acceso", bloqueado: false },
      { id: 3, titulo: "Reconocimiento y escaneo de puertos", bloqueado: true }, // bloqueado por práctica nivel 1
      { id: 4, titulo: "Inyección SQL: detección y mitigación", bloqueado: true },
      { id: 5, titulo: "XSS: análisis y prevención", bloqueado: true },
      { id: 6, titulo: "Defensa: contención y hardening básico", bloqueado: true },
      { id: 7, titulo: "Defensa: monitoreo, eventos y alertas", bloqueado: true }
    ],
    []
  )

  const SECCIONES = useMemo(
    () => [
      { id: "introduccion", titulo: "Introducción" },
      { id: "objetivos", titulo: "Objetivos del nivel" },
      { id: "fundamentos", titulo: "Fundamentos teóricos" },
      { id: "metodologia", titulo: "Metodología de trabajo" },
      { id: "comandos", titulo: "Comandos y explicación" },
      { id: "evidencia", titulo: "Evidencia y análisis" },
      { id: "procedimiento", titulo: "Procedimiento guiado" },
      { id: "errores", titulo: "Errores comunes" },
      { id: "buenas_practicas", titulo: "Buenas prácticas" },
      { id: "criterio", titulo: "Criterio de aprobación" }
    ],
    []
  )

  const claveProgreso = useMemo(() => {
    if (!nombreUsuario) return null
    return `cyberlab_progreso_${nombreUsuario}`
  }, [nombreUsuario])

  const leerStorage = () => {
    if (!claveProgreso) return null
    const raw = localStorage.getItem(claveProgreso)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  const guardarStorage = (data) => {
    if (!claveProgreso) return
    const anterior = leerStorage() || {}
    localStorage.setItem(
      claveProgreso,
      JSON.stringify({
        ...anterior,
        ...data
      })
    )
  }

  const [seccionesVistas, setSeccionesVistas] = useState(() => {
    const plantilla = {}
    for (let n = 1; n <= 7; n++) {
      plantilla[`nivel${n}`] = {}
      for (const s of SECCIONES) {
        plantilla[`nivel${n}`][s.id] = false
      }
    }
    return plantilla
  })

  const puedeAccederNivel = (nivelId) => {
    const info = NIVELES.find((n) => n.id === nivelId)
    if (!info) return false
    if (!info.bloqueado) return true
    // Regla: desde nivel 3 en adelante, exige práctica de nivel 1 (como mínimo)
    return !!nivelesCompletados.nivel1
  }

  const progresoLecturaNivel = (nivelId) => {
    const clave = `nivel${nivelId}`
    const obj = seccionesVistas[clave]
    const total = SECCIONES.length
    const vistos = SECCIONES.reduce((acc, s) => acc + (obj?.[s.id] ? 1 : 0), 0)
    return Math.round((vistos / total) * 100)
  }

  const marcarSeccionComoVistaSiCorresponde = () => {
    const clave = `nivel${nivelLeccion}`
    const yaVista = !!seccionesVistas?.[clave]?.[seccionLeccion]
    if (yaVista) return

    const nuevo = {
      ...seccionesVistas,
      [clave]: {
        ...seccionesVistas[clave],
        [seccionLeccion]: true
      }
    }

    setSeccionesVistas(nuevo)

    const anterior = leerStorage() || {}
    localStorage.setItem(
      claveProgreso,
      JSON.stringify({
        ...anterior,
        nivelLeccion,
        seccionLeccion,
        seccionesVistas: nuevo
      })
    )
  }

  // ✅ NUEVO: Carga dinámica del contenido desde public/...
  useEffect(() => {
    const cargar = async () => {
      try {
        setTextoActual("Cargando contenido...")

        const ruta = `/contenidos/informacion/nivel${nivelLeccion}/${seccionLeccion}.md`
        const res = await fetch(ruta, { cache: "no-store" })

        if (!res.ok) {
          setTextoActual(
            "Contenido no disponible (archivo .md no encontrado).\n\n" +
              `Ruta esperada:\n${ruta}\n\n` +
              "Verifica que el archivo exista en:\n" +
              `public${ruta}`
          )
          return
        }

        const txt = await res.text()
        setTextoActual(txt)
      } catch {
        setTextoActual("Error al cargar el contenido.")
      }
    }

    cargar()
  }, [nivelLeccion, seccionLeccion])

  // Auto-marca "vista" al llegar al final del contenido usando scroll del navegador
  useEffect(() => {
    if (!finContenidoRef.current) return

    const el = finContenidoRef.current
    const obs = new IntersectionObserver(
      (entries) => {
        const entro = entries.some((e) => e.isIntersecting)
        if (entro) {
          marcarSeccionComoVistaSiCorresponde()
        }
      },
      { threshold: 0.25 }
    )

    obs.observe(el)
    return () => obs.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivelLeccion, seccionLeccion])

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem("nombre_usuario")
    if (!usuarioGuardado) {
      router.push("/")
      return
    }
    setNombreUsuario(usuarioGuardado)
  }, [router])

  useEffect(() => {
    if (!nombreUsuario) return
    const raw = localStorage.getItem(`cyberlab_progreso_${nombreUsuario}`)
    if (!raw) return

    try {
      const datos = JSON.parse(raw)
      setNivelLeccion(datos.nivelLeccion || 1)
      setSeccionLeccion(datos.seccionLeccion || "introduccion")
      setNivelesCompletados(datos.nivelesCompletados || { nivel1: false })

      if (datos.seccionesVistas) {
        setSeccionesVistas(datos.seccionesVistas)
      }
    } catch {}
  }, [nombreUsuario])

  useEffect(() => {
    if (!claveProgreso) return
    guardarStorage({
      nivelLeccion,
      seccionLeccion,
      seccionesVistas
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivelLeccion, seccionLeccion])

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">
        <header className="hero-panel">
          <div>
            <div className="hero-badge">CONTENIDO DIDÁCTICO CYBERLAB</div>
            <h1 className="hero-title">Información del nivel</h1>
            <p className="hero-subtitle">
              Operador activo: <strong>{nombreUsuario}</strong>
            </p>
          </div>

          <button onClick={() => router.push("/dashboard")} className="logout-button">
            Volver
          </button>
        </header>

        <section className="learning-panel">
          <div className="aprendizaje-layout">
            <aside className="aprendizaje-sidebar">
              <div className="aprendizaje-sidebar-top">
                <h3>Guía didáctica</h3>
              </div>

              <div className="aprendizaje-niveles" style={{ gridTemplateColumns: "1fr" }}>
                {NIVELES.map((n) => {
                  const bloqueado = !puedeAccederNivel(n.id)
                  const activo = nivelLeccion === n.id
                  return (
                    <button
                      key={n.id}
                      className={`aprendizaje-nivel ${activo ? "activo" : ""}`}
                      onClick={() => {
                        if (bloqueado) return
                        setNivelLeccion(n.id)
                        setSeccionLeccion("introduccion")
                        guardarStorage({ nivelLeccion: n.id, seccionLeccion: "introduccion" })
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }}
                      disabled={bloqueado}
                      title={
                        bloqueado
                          ? "Bloqueado: completa el Nivel 1 práctico para desbloquear niveles avanzados"
                          : ""
                      }
                      style={{ textAlign: "left" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <span>
                          <strong>Nivel {n.id}:</strong> {n.titulo}
                        </span>
                        <span style={{ fontWeight: 900 }}>{progresoLecturaNivel(n.id)}%</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="aprendizaje-menu">
                {SECCIONES.map((sec) => {
                  const clave = `nivel${nivelLeccion}`
                  const visto = !!seccionesVistas?.[clave]?.[sec.id]
                  return (
                    <button
                      key={sec.id}
                      className={`aprendizaje-item ${seccionLeccion === sec.id ? "activo" : ""}`}
                      onClick={() => {
                        setSeccionLeccion(sec.id)
                        guardarStorage({ seccionLeccion: sec.id })
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }}
                    >
                      <span>{sec.titulo}</span>
                      <span className={`aprendizaje-badge ${visto ? "ok" : ""}`}>
                        {visto ? "Vista" : "Pendiente"}
                      </span>
                    </button>
                  )
                })}
              </div>
            </aside>

            <article className="aprendizaje-contenido">
              <div className="aprendizaje-contenido-top">
                <h3>
                  Nivel {nivelLeccion} · {SECCIONES.find((s) => s.id === seccionLeccion)?.titulo}
                </h3>

                <div className="aprendizaje-progreso">
                  Progreso lectura nivel {nivelLeccion}:{" "}
                  <strong>{progresoLecturaNivel(nivelLeccion)}%</strong>
                </div>
              </div>

              <div className="aprendizaje-cuerpo">
                <div
  className="markdown-contenido"
  dangerouslySetInnerHTML={{ __html: marked.parse(textoActual) }}
/>

                <div ref={finContenidoRef} style={{ height: 1 }} />

                <div style={{ marginTop: 14, color: "#52606d", fontSize: 13 }}>
                  <strong>Nota:</strong> Esta sección se marca automáticamente como “Vista” cuando
                  llegas al final del contenido.
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  )
}