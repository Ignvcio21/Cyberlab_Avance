"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { marked } from "marked"
import GuardSesion from "../../componentes/GuardSesion"
import BarraSuperior from "../../componentes/BarraSuperior"
import TransicionPagina from "../../componentes/TransicionPagina"

marked.setOptions({ mangle: false, headerIds: false })

// ================================================================
// DEFINICIÓN DE NIVELES — ATAQUE Y DEFENSA
// ================================================================
const NIVELES_ATAQUE = [
  { id: 1, titulo: "Introducción y fundamentos" },
  { id: 2, titulo: "Fuerza bruta y control de acceso" },
  { id: 3, titulo: "Reconocimiento y escaneo de puertos" },
  { id: 4, titulo: "Inyección SQL: detección y mitigación" },
  { id: 5, titulo: "XSS: análisis y prevención" },
  { id: 6, titulo: "Defensa: contención y hardening básico" },
  { id: 7, titulo: "Defensa: monitoreo, eventos y alertas" },
]

const NIVELES_DEFENSA = [
  { id: 1, titulo: "Monitoreo básico y orientación SOC" },
  { id: 2, titulo: "Detección de fuerza bruta" },
  { id: 3, titulo: "Reconocimiento y escaneo — defensa" },
  { id: 4, titulo: "Investigación de incidentes" },
  { id: 5, titulo: "Respuesta defensiva activa" },
  { id: 6, titulo: "Escenarios complejos multi-vector" },
  { id: 7, titulo: "Defensa integral autónoma" },
]

const SECCIONES = [
  { id: "introduccion",    titulo: "Introducción" },
  { id: "objetivos",       titulo: "Objetivos del nivel" },
  { id: "fundamentos",     titulo: "Fundamentos teóricos" },
  { id: "metodologia",     titulo: "Metodología de trabajo" },
  { id: "comandos",        titulo: "Comandos y explicación" },
  { id: "evidencia",       titulo: "Evidencia y análisis" },
  { id: "procedimiento",   titulo: "Procedimiento guiado" },
  { id: "errores",         titulo: "Errores comunes" },
  { id: "buenas_practicas",titulo: "Buenas prácticas" },
  { id: "criterio",        titulo: "Criterio de aprobación" },
]

// ================================================================
// COMPONENTE PRINCIPAL
// ================================================================
export default function InformacionDashboard() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const contenedorScrollRef = useRef(null)

  const [nombreUsuario,    setNombreUsuario]    = useState("")
  const [modo,             setModo]             = useState("ataque")   // "ataque" | "defensa"
  const [nivelLeccion,     setNivelLeccion]     = useState(1)
  const [seccionLeccion,   setSeccionLeccion]   = useState("introduccion")
  const [textoActual,      setTextoActual]      = useState("Cargando contenido...")
  const [cargandoProgreso, setCargandoProgreso] = useState(true)

  // Niveles desbloqueados — uno por modo
  const [desbloqueadosAtaque,  setDesbloqueadosAtaque]  = useState([1, 2])
  const [desbloqueadosDefensa, setDesbloqueadosDefensa] = useState([1, 2])

  // Progreso de lectura — claves separadas por modo
  // { "ataque_nivel1": { introduccion: true, ... }, "defensa_nivel1": {...}, ... }
  const [seccionesVistas, setSeccionesVistas] = useState(() => {
    const plantilla = {}
    for (const m of ["ataque", "defensa"]) {
      for (let n = 1; n <= 7; n++) {
        plantilla[`${m}_nivel${n}`] = {}
        for (const s of SECCIONES) plantilla[`${m}_nivel${n}`][s.id] = false
      }
    }
    return plantilla
  })

  // ── Claves LS ──────────────────────────────────────────────────
  const claveAtaque  = useMemo(() => nombreUsuario ? `cyberlab_progreso_${nombreUsuario}`         : null, [nombreUsuario])
  const claveDefensa = useMemo(() => nombreUsuario ? `cyberlab_info_defensa_${nombreUsuario}`     : null, [nombreUsuario])
  const claveActiva  = modo === "ataque" ? claveAtaque : claveDefensa

  const leerLS = useCallback((clave) => {
    if (!clave) return null
    try { return JSON.parse(localStorage.getItem(clave) || "null") } catch { return null }
  }, [])

  const guardarLS = useCallback((clave, data) => {
    if (!clave) return
    const anterior = (() => { try { return JSON.parse(localStorage.getItem(clave) || "null") } catch { return null } })() || {}
    localStorage.setItem(clave, JSON.stringify({ ...anterior, ...data }))
  }, [])

  // ── Niveles activos según modo ─────────────────────────────────
  const NIVELES_ACTIVOS = modo === "ataque" ? NIVELES_ATAQUE : NIVELES_DEFENSA
  const desbloqueadosActivos = modo === "ataque" ? desbloqueadosAtaque : desbloqueadosDefensa

  const puedeAccederNivel = (nivelId) => desbloqueadosActivos.includes(nivelId)

  const NIVELES = NIVELES_ACTIVOS.map(n => ({
    ...n,
    bloqueado: !puedeAccederNivel(n.id),
  }))

  // ── Progreso de lectura ────────────────────────────────────────
  const claveVista = (nivelId) => `${modo}_nivel${nivelId}`

  const progresoLecturaNivel = (nivelId) => {
    const obj    = seccionesVistas[claveVista(nivelId)]
    const vistos = SECCIONES.reduce((acc, s) => acc + (obj?.[s.id] ? 1 : 0), 0)
    return Math.round((vistos / SECCIONES.length) * 100)
  }

  // ── Marcar sección como vista ──────────────────────────────────
  const marcarSeccionVista = useCallback(() => {
    const clave   = claveVista(nivelLeccion)
    if (seccionesVistas?.[clave]?.[seccionLeccion]) return

    const nuevo = {
      ...seccionesVistas,
      [clave]: { ...seccionesVistas[clave], [seccionLeccion]: true },
    }
    setSeccionesVistas(nuevo)
    guardarLS(claveActiva, { seccionesVistas: nuevo, nivelLeccion, seccionLeccion })
    enviarProgresoABackend(nivelLeccion, seccionLeccion)
  }, [nivelLeccion, seccionLeccion, seccionesVistas, claveActiva, modo])

  // ── Backend: cargar progreso de lectura de ataque ──────────────
  const cargarProgresoAtaqueDesdeBackend = async (usuario) => {
    try {
      const r = await fetch(`http://127.0.0.1:8000/progreso/${encodeURIComponent(usuario)}`)
      if (!r.ok) return
      const d = await r.json()
      const registros = Array.isArray(d.progreso) ? d.progreso : []

      const nuevoMapa = { ...seccionesVistas }
      for (let n = 1; n <= 7; n++) {
        nuevoMapa[`ataque_nivel${n}`] = {}
        for (const s of SECCIONES) nuevoMapa[`ataque_nivel${n}`][s.id] = false
      }
      registros.forEach(reg => {
        if (reg.porcentaje >= 100 || reg.completado) {
          const idx    = reg.leccion_id - 1
          const niv    = Math.floor(idx / SECCIONES.length) + 1
          const secIdx = idx % SECCIONES.length
          const sec    = SECCIONES[secIdx]
          if (niv >= 1 && niv <= 7 && sec) nuevoMapa[`ataque_nivel${niv}`][sec.id] = true
        }
      })
      setSeccionesVistas(prev => ({ ...prev, ...nuevoMapa }))
      guardarLS(claveAtaque, { seccionesVistas: nuevoMapa })
    } catch (e) {
      console.warn("No se pudo cargar progreso de ataque:", e)
      const raw = leerLS(claveAtaque)
      if (raw?.seccionesVistas) setSeccionesVistas(prev => ({ ...prev, ...raw.seccionesVistas }))
    }
  }

  // ── Backend: cargar progreso defensa (localStorage como fuente) ──
  const cargarProgresoDefensaDesdeLS = () => {
    const raw = leerLS(claveDefensa)
    if (raw?.seccionesVistas) {
      setSeccionesVistas(prev => ({ ...prev, ...raw.seccionesVistas }))
    }
  }

  // ── Backend: enviar progreso (solo ataque usa backend) ──────────
  const enviarProgresoABackend = async (nivel, seccion) => {
    if (!nombreUsuario || modo !== "ataque") return
    const secIdx = SECCIONES.findIndex(s => s.id === seccion)
    if (secIdx < 0) return
    const leccionId = (nivel - 1) * SECCIONES.length + (secIdx + 1)
    try {
      await fetch("http://127.0.0.1:8000/progreso/actualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre_usuario: nombreUsuario, leccion_id: leccionId, porcentaje: 100 })
      })
    } catch (e) { console.warn("No se pudo guardar progreso en backend:", e) }
  }

  // ── Backend: niveles desbloqueados ataque ──────────────────────
  const cargarNivelesDesbloqueadosAtaque = async (usuario) => {
    try {
      const r = await fetch(`http://127.0.0.1:8000/progreso/laboratorio/${encodeURIComponent(usuario)}`)
      if (!r.ok) return
      const d = await r.json()
      const completados = Array.isArray(d.niveles_completados) ? d.niveles_completados : []
      const desbloqueados = [1]
      for (let n = 2; n <= 7; n++) { if (completados.includes(n - 1)) desbloqueados.push(n) }
      setDesbloqueadosAtaque(desbloqueados)
      guardarLS(claveAtaque, { nivelesDesbloqueados: desbloqueados })
    } catch {
      const raw = leerLS(claveAtaque)
      if (Array.isArray(raw?.nivelesDesbloqueados)) setDesbloqueadosAtaque(raw.nivelesDesbloqueados)
    }
  }

  // ── Niveles desbloqueados defensa (desde progreso defensivo LS) ─
  const cargarNivelesDesbloqueadosDefensa = (usuario) => {
    try {
      const raw = JSON.parse(localStorage.getItem(`cyberlab_defensa_${usuario}`) || "null")
      if (!raw?.ejercicios) return
      const desbloqueados = [1]
      for (let n = 2; n <= 7; n++) {
        if ((raw.ejercicios[n - 1]?.completados || 0) >= 5) desbloqueados.push(n)
      }
      if (desbloqueados.length < 2) desbloqueados.push(2) // mínimo nivel 2 libre
      setDesbloqueadosDefensa(desbloqueados)
    } catch {
      setDesbloqueadosDefensa([1, 2])
    }
  }

  // ── Cargar markdown ────────────────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      setTextoActual("Cargando contenido...")
      try {
        // Ataque: /contenidos/informacion/nivel{N}/{seccion}.md
        // Defensa: /contenidos/defensa/nivel{N}/{seccion}.md
        const carpeta = modo === "ataque" ? "ataque" : "defensa"
        const ruta    = `/contenidos/${carpeta}/nivel${nivelLeccion}/${seccionLeccion}.md`
        const res     = await fetch(ruta, { cache: "no-store" })
        if (!res.ok) {
          setTextoActual(
            `# Contenido no encontrado\n\nArchivo esperado:\n\`public${ruta}\`\n\n` +
            `Crea el archivo en:\n**frontend/public/contenidos/${carpeta}/nivel${nivelLeccion}/${seccionLeccion}.md**`
          )
          return
        }
        setTextoActual(await res.text())
      } catch { setTextoActual("Error al cargar el contenido.") }
    }
    cargar()
  }, [nivelLeccion, seccionLeccion, modo])

  // ── Scroll → marcar vista ──────────────────────────────────────
  useEffect(() => {
    const contenedor = contenedorScrollRef.current
    if (!contenedor) return
    contenedor.scrollTop = 0
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = contenedor
      if (scrollHeight - scrollTop - clientHeight < 50) marcarSeccionVista()
    }
    contenedor.addEventListener("scroll", handleScroll)
    return () => contenedor.removeEventListener("scroll", handleScroll)
  }, [nivelLeccion, seccionLeccion, modo, marcarSeccionVista])

  // ── Init usuario ───────────────────────────────────────────────
  useEffect(() => {
    const u = localStorage.getItem("nombre_usuario")
    if (!u) { router.push("/"); return }
    setNombreUsuario(u)
  }, [router])

  // ── Init datos ─────────────────────────────────────────────────
  useEffect(() => {
    if (!nombreUsuario) return
    setCargandoProgreso(true)

    // Leer modo desde URL si viene
    const modoParam  = searchParams?.get("modo")
    const nivelParam = searchParams?.get("nivel")
    const modoFinal  = modoParam === "defensa" ? "defensa" : "ataque"
    setModo(modoFinal)

    if (nivelParam) {
      const n = parseInt(nivelParam, 10)
      if (n >= 1 && n <= 7) setNivelLeccion(n)
    }

    // Cargar todo en paralelo
    Promise.all([
      cargarProgresoAtaqueDesdeBackend(nombreUsuario),
      cargarNivelesDesbloqueadosAtaque(nombreUsuario),
    ]).finally(() => setCargandoProgreso(false))

    cargarProgresoDefensaDesdeLS()
    cargarNivelesDesbloqueadosDefensa(nombreUsuario)

    // Restaurar última posición del modo correspondiente
    const raw = leerLS(modoFinal === "ataque" ? claveAtaque : claveDefensa)
    if (raw?.nivelLeccion && !nivelParam) setNivelLeccion(raw.nivelLeccion)
    if (raw?.seccionLeccion) setSeccionLeccion(raw.seccionLeccion)

  }, [nombreUsuario])

  // Resetear nivel/sección al cambiar de modo
  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo)
    setNivelLeccion(1)
    setSeccionLeccion("introduccion")
    // Restaurar última posición guardada del nuevo modo
    const clave = nuevoModo === "ataque" ? claveAtaque : claveDefensa
    const raw   = leerLS(clave)
    if (raw?.nivelLeccion)   setNivelLeccion(raw.nivelLeccion)
    if (raw?.seccionLeccion) setSeccionLeccion(raw.seccionLeccion)
    // Refrescar desbloqueos defensa al cambiar
    if (nuevoModo === "defensa") cargarNivelesDesbloqueadosDefensa(nombreUsuario)
  }

  const tituloSeccionActual = SECCIONES.find(s => s.id === seccionLeccion)?.titulo || "—"
  const progresoNivelActual = progresoLecturaNivel(nivelLeccion)

  // Colores según modo
  const COLOR_MODO   = modo === "defensa" ? "var(--terciario)"     : "var(--primario)"
  const COLOR_DIM    = modo === "defensa" ? "var(--terciario-dim)" : "var(--primario-dim)"
  const BG_MODO      = modo === "defensa" ? "rgba(0,218,243,0.10)" : "rgba(0,163,255,0.10)"
  const BORDER_MODO  = modo === "defensa" ? "rgba(0,218,243,0.25)" : "rgba(0,163,255,0.22)"
  const LABEL_MODO   = modo === "defensa" ? "🛡 CONTENIDO DEFENSIVO CYBERLAB" : "⚔ CONTENIDO OFENSIVO CYBERLAB"

  return (
    <GuardSesion>
      <TransicionPagina>
        <main className="dashboard-page">
          <div className="dashboard-container">

            <BarraSuperior paginaActiva="informacion" />

            {/* ── Header ── */}
            <header className="hero-panel">
              <div>
                <div className="hero-badge" style={{ background: BG_MODO, borderColor: BORDER_MODO, color: COLOR_DIM }}>
                  {LABEL_MODO}
                </div>
                <h1 style={{ margin: "8px 0 4px", fontSize: 22, color: "#fff", fontFamily: "var(--sans)", fontWeight: 700 }}>
                  Información del nivel
                </h1>
                <p className="hero-subtitle">
                  Operador activo: <strong style={{ color: COLOR_DIM }}>{nombreUsuario}</strong>
                  {cargandoProgreso && (
                    <span style={{ marginLeft: 10, fontSize: 11, color: "var(--texto-apagado)", fontFamily: "var(--mono)" }}>
                      Sincronizando progreso...
                    </span>
                  )}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => router.push(modo === "defensa" ? "/dashboard/defensa" : "/dashboard")} className="logout-button">
                  {modo === "defensa" ? "Volver a Defensa" : "Volver al laboratorio"}
                </button>
              </div>
            </header>

            {/* ── Selector de modo ── */}
            <div style={{
              display: "flex", gap: 8, padding: "14px 18px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderTop: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16,
              backdropFilter: "blur(20px)",
            }}>
              <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--texto-apagado)", display: "flex", alignItems: "center", marginRight: 8 }}>
                MODO:
              </span>
              {[
                { id: "ataque",  label: "⚔ Modo Ataque",  color: "var(--primario-dim)",  bg: "rgba(0,163,255,0.12)",   border: "rgba(0,163,255,0.30)" },
                { id: "defensa", label: "🛡 Modo Defensa", color: "var(--terciario-dim)", bg: "rgba(0,218,243,0.12)",   border: "rgba(0,218,243,0.30)" },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => cambiarModo(m.id)}
                  style={{
                    padding: "8px 18px", borderRadius: 999, fontSize: 13, fontWeight: 700,
                    fontFamily: "var(--cuerpo)", cursor: "pointer",
                    border: `1px solid ${modo === m.id ? m.border : "rgba(255,255,255,0.10)"}`,
                    background: modo === m.id ? m.bg : "rgba(255,255,255,0.04)",
                    color: modo === m.id ? m.color : "var(--texto-apagado)",
                    boxShadow: modo === m.id ? `0 0 16px ${m.border}` : "none",
                    transition: "all 0.22s ease",
                  }}
                >
                  {m.label}
                </button>
              ))}
              {/* Descripción del modo activo */}
              <span style={{ marginLeft: "auto", fontSize: 11, fontFamily: "var(--mono)", color: "var(--texto-apagado)", display: "flex", alignItems: "center" }}>
                {modo === "defensa"
                  ? "Análisis, detección y mitigación de incidentes"
                  : "Pentesting, reconocimiento y explotación controlada"}
              </span>
            </div>

            {/* ── Panel principal de contenido ── */}
            <section className="learning-panel">
              <div className="info-layout">

                {/* ── Lista de niveles ── */}
                <aside className="info-panel">
                  <div className="info-panel-header" style={{ background: `${BG_MODO}` }}>
                    <div>
                      <div className="info-panel-title" style={{ color: COLOR_DIM }}>
                        {modo === "defensa" ? "🛡 Niveles Defensa" : "⚔ Niveles Ataque"}
                      </div>
                      <div className="info-panel-sub">Progreso por lectura</div>
                    </div>
                  </div>
                  <div className="info-scroll">
                    <div className="info-list">
                      {NIVELES.map(n => {
                        const activo = nivelLeccion === n.id
                        const prog   = progresoLecturaNivel(n.id)
                        return (
                          <button
                            key={n.id}
                            className={`info-item ${activo ? "activo" : ""}`}
                            onClick={() => {
                              if (n.bloqueado) return
                              setNivelLeccion(n.id)
                              setSeccionLeccion("introduccion")
                              guardarLS(claveActiva, { nivelLeccion: n.id, seccionLeccion: "introduccion" })
                            }}
                            disabled={n.bloqueado}
                            title={n.bloqueado
                              ? modo === "defensa"
                                ? `Completa el Nivel ${n.id - 1} de defensa para desbloquear`
                                : `Completa el laboratorio del Nivel ${n.id - 1} para desbloquear`
                              : ""}
                            style={activo ? { borderColor: BORDER_MODO, background: BG_MODO } : {}}
                          >
                            <div className="info-item-top">
                              <div className="info-item-name">
                                {n.bloqueado ? "🔒 " : ""}{modo === "defensa" ? "D" : "N"}{n.id}: {n.titulo}
                              </div>
                              <div className="info-item-meta">
                                <span className="info-mini-progreso" style={{ color: COLOR_DIM, borderColor: BORDER_MODO, background: BG_MODO }}>
                                  {prog}%
                                </span>
                                <span className={`badge-estado ${prog === 100 ? "ok" : ""}`}>
                                  {prog === 100 ? "Completo" : "En progreso"}
                                </span>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </aside>

                {/* ── Lista de secciones ── */}
                <aside className="info-panel">
                  <div className="info-panel-header" style={{ background: BG_MODO }}>
                    <div>
                      <div className="info-panel-title" style={{ color: COLOR_DIM }}>Secciones</div>
                      <div className="info-panel-sub">Se marca al llegar al final</div>
                    </div>
                  </div>
                  <div className="info-scroll">
                    <div className="info-list">
                      {SECCIONES.map(sec => {
                        const visto  = !!seccionesVistas?.[claveVista(nivelLeccion)]?.[sec.id]
                        const activo = seccionLeccion === sec.id
                        return (
                          <button
                            key={sec.id}
                            className={`info-item ${activo ? "activo" : ""}`}
                            onClick={() => {
                              setSeccionLeccion(sec.id)
                              guardarLS(claveActiva, { seccionLeccion: sec.id })
                            }}
                            style={activo ? { borderColor: BORDER_MODO, background: BG_MODO } : {}}
                          >
                            <div className="info-item-top">
                              <div className="info-item-name">{sec.titulo}</div>
                              <span className={`badge-estado ${visto ? "ok" : ""}`}>
                                {visto ? "Vista ✓" : "Pendiente"}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </aside>

                {/* ── Contenido markdown ── */}
                <section className="info-content">
                  <div className="info-content-header" style={{ background: BG_MODO }}>
                    <div className="info-content-left">
                      <h2>
                        {modo === "defensa" ? "D" : "Nivel "}{nivelLeccion} · {tituloSeccionActual}
                      </h2>
                      <p>
                        {modo === "defensa"
                          ? "Lectura académica orientada a defensa y análisis SOC"
                          : "Lectura académica orientada a pentesting"}
                      </p>
                    </div>
                    <div className="info-content-right">
                      <div className="info-progress" style={{ color: COLOR_DIM, borderColor: BORDER_MODO, background: BG_MODO }}>
                        {modo === "defensa" ? "D" : "N"}{nivelLeccion}: <strong>{progresoNivelActual}%</strong>
                      </div>
                    </div>
                  </div>

                  <div
                    ref={contenedorScrollRef}
                    className="info-content-body info-anim"
                    key={`${modo}-${nivelLeccion}-${seccionLeccion}`}
                    style={{ overflowY: "auto" }}
                  >
                    <div
                      className="markdown-contenido"
                      dangerouslySetInnerHTML={{ __html: marked.parse(textoActual) }}
                    />
                    <div style={{
                      marginTop: 14, color: "var(--texto-apagado)", fontSize: 12,
                      fontFamily: "var(--mono)", letterSpacing: "0.04em",
                      borderTop: `1px solid ${BORDER_MODO}`, paddingTop: 12,
                    }}>
                      {modo === "defensa" ? "🛡" : "✦"} Esta sección se marca como "Vista" al llegar al final del contenido.
                      El progreso se guarda y persiste entre sesiones.
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