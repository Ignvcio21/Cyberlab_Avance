"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { marked } from "marked"
import GuardSesion from "../../componentes/GuardSesion"
import BarraSuperior from "../../componentes/BarraSuperior"
import TransicionPagina from "../../componentes/TransicionPagina"

marked.setOptions({ mangle: false, headerIds: false })

export default function InformacionDashboard() {
  const router = useRouter()
  const finContenidoRef = useRef(null)

  const [nombreUsuario, setNombreUsuario] = useState("")
  const [nivelLeccion, setNivelLeccion] = useState(1)
  const [seccionLeccion, setSeccionLeccion] = useState("introduccion")
  const [nivelesCompletados, setNivelesCompletados] = useState({ nivel1: false })

  const [textoActual, setTextoActual] = useState("Cargando contenido...")

  const NIVELES = useMemo(
    () => [
      { id: 1, titulo: "Introducción y fundamentos", bloqueado: false },
      { id: 2, titulo: "Fuerza bruta y control de acceso", bloqueado: false },
      { id: 3, titulo: "Reconocimiento y escaneo de puertos", bloqueado: true },
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

  const tituloSeccionActual = SECCIONES.find((s) => s.id === seccionLeccion)?.titulo || "—"
  const progresoNivelActual = progresoLecturaNivel(nivelLeccion)

  return (
    <GuardSesion> 
      <TransicionPagina>
      <main className="dashboard-page">
        <BarraSuperior paginaActiva="informacion" />

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
            <div className="info-layout">
              {/* Panel 1: Niveles */}
              <aside className="info-panel">
                <div className="info-panel-header">
                  <div>
                    <div className="info-panel-title">Niveles</div>
                    <div className="info-panel-sub">Progreso por lectura</div>
                  </div>
                </div>

                <div className="info-scroll">
                  <div className="info-list">
                    {NIVELES.map((n) => {
                      const bloqueado = !puedeAccederNivel(n.id)
                      const activo = nivelLeccion === n.id
                      const progreso = progresoLecturaNivel(n.id)

                      return (
                        <button
                          key={n.id}
                          className={`info-item ${activo ? "activo" : ""}`}
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
                        >
                          <div className="info-item-top">
                            <div className="info-item-name">
                              Nivel {n.id}: {n.titulo}
                            </div>

                            <div className="info-item-meta">
                              <span className="info-mini-progreso">{progreso}%</span>
                              <span className={`badge-estado ${progreso === 100 ? "ok" : ""}`}>
                                {progreso === 100 ? "Completo" : "En progreso"}
                              </span>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </aside>

              {/* Panel 2: Secciones */}
              <aside className="info-panel">
                <div className="info-panel-header">
                  <div>
                    <div className="info-panel-title">Secciones</div>
                    <div className="info-panel-sub">
                      Se marca “Vista” al llegar al final
                    </div>
                  </div>
                </div>

                <div className="info-scroll">
                  <div className="info-list">
                    {SECCIONES.map((sec) => {
                      const clave = `nivel${nivelLeccion}`
                      const visto = !!seccionesVistas?.[clave]?.[sec.id]
                      const activo = seccionLeccion === sec.id

                      return (
                        <button
                          key={sec.id}
                          className={`info-item ${activo ? "activo" : ""}`}
                          onClick={() => {
                            setSeccionLeccion(sec.id)
                            guardarStorage({ seccionLeccion: sec.id })
                            window.scrollTo({ top: 0, behavior: "smooth" })
                          }}
                        >
                          <div className="info-item-top">
                            <div className="info-item-name">{sec.titulo}</div>
                            <span className={`badge-estado ${visto ? "ok" : ""}`}>
                              {visto ? "Vista" : "Pendiente"}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </aside>

              {/* Panel 3: Contenido */}
              <section className="info-content">
                <div className="info-content-header">
                  <div className="info-content-left">
                    <h2>
                      Nivel {nivelLeccion} · {tituloSeccionActual}
                    </h2>
                    <p>Lectura académica + práctica guiada (orientado a pentesting)</p>
                  </div>

                  <div className="info-content-right">
                    <div className="info-progress">
                      Progreso nivel {nivelLeccion}: <strong>{progresoNivelActual}%</strong>
                    </div>
                  </div>
                </div>

                {/* key => fuerza animación al cambiar sección/nivel */}
                <div className="info-content-body info-anim" key={`${nivelLeccion}-${seccionLeccion}`}>
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
              </section>
            </div>
          </section>
        </div>
      </main>
      </TransicionPagina>
    </GuardSesion>
  )
}