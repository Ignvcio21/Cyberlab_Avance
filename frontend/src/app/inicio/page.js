"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import GuardSesion from "../componentes/GuardSesion"
import BarraSuperior from "../componentes/BarraSuperior"
import TransicionPagina from "../componentes/TransicionPagina"

const NOMBRES_NIV = {
  1: "Fundamentos", 2: "Reconocimiento", 3: "Enumeración",
  4: "Explotación", 5: "Post-explotación", 6: "Avanzado", 7: "Operación completa"
}
const vacioNiveles = () => Object.fromEntries([1,2,3,4,5,6,7].map(n => [n, { completados: 0, total: 0 }]))

const API_URL_INICIO = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"

export default function InicioPlataforma() {
  const router = useRouter()
  const [nombreUsuario, setNombreUsuario] = useState("")
  const [rolUsuario, setRolUsuario] = useState("")
  const [progAtaque,  setProgAtaque]  = useState(vacioNiveles())
  const [progDefensa, setProgDefensa] = useState(vacioNiveles())
  const [entregasPend, setEntregasPend] = useState([])
  const [statsDocente, setStatsDocente] = useState(null)
  const [statsAnimadas, setStatsAnimadas] = useState({ estudiantes: 0, pendientes: 0, notaPromedio: 0, ejercicios: 0 })

  // Contador animado easeOutCubic
  const animarContador = (clave, target, decimales = 0, duracion = 1100) => {
    if (!target || isNaN(Number(target))) return
    const num = Number(target)
    const inicio = performance.now()
    const tick = (ahora) => {
      const p = Math.min((ahora - inicio) / duracion, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setStatsAnimadas(prev => ({ ...prev, [clave]: (num * ease).toFixed(decimales) }))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  // Lanzar animación cuando llegan los stats
  useEffect(() => {
    if (!statsDocente) return
    animarContador("estudiantes",   statsDocente.estudiantes  ?? 0, 0, 900)
    animarContador("pendientes",    statsDocente.pendientes   ?? 0, 0, 1000)
    animarContador("notaPromedio",  statsDocente.notaPromedio ?? 0, 1, 1200)
    animarContador("ejercicios",    statsDocente.ejercicios   ?? 0, 0, 800)
  }, [statsDocente])

  const cargarProgreso = async (usuario, token) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL
    const headers = { "Authorization": `Bearer ${token}` }
    const parsear = (d) => {
      const det = d?.detalle || {}
      // total = ejercicios realmente publicados por el docente en ese nivel
      return Object.fromEntries([1,2,3,4,5,6,7].map(n => [n, {
        completados: det[String(n)]?.completados || 0,
        total: det[String(n)]?.total || 0,
      }]))
    }
    try {
      const [rA, rD] = await Promise.all([
        fetch(`${API_URL}/progreso/laboratorio/${encodeURIComponent(usuario)}?tipo=ataque`,  { headers }),
        fetch(`${API_URL}/progreso/laboratorio/${encodeURIComponent(usuario)}?tipo=defensa`, { headers }),
      ])
      if (rA.ok) setProgAtaque(parsear(await rA.json()))
      if (rD.ok) setProgDefensa(parsear(await rD.json()))
    } catch {}
  }

  useEffect(() => {
    const nombre  = sessionStorage.getItem("nombre_display") || sessionStorage.getItem("nombre_usuario") || ""
    const usuario = sessionStorage.getItem("nombre_usuario") || ""
    const r       = sessionStorage.getItem("rol_usuario") || ""
    setNombreUsuario(nombre); setRolUsuario(r)
    if (usuario) cargarProgreso(usuario, sessionStorage.getItem("token") || "")
    const tok = sessionStorage.getItem("token") || ""
    if (tok) {
      const hdr = { "Authorization": `Bearer ${tok}` }
      // Si es docente/admin, cargar datos del panel
      if (r === "admin" || r === "docente") {
        Promise.all([
          fetch(`${API_URL_INICIO}/admin/usuarios`, { headers: hdr }).then(res => res.json()),
          fetch(`${API_URL_INICIO}/docente/entregas`, { headers: hdr }).then(res => res.json()),
          fetch(`${API_URL_INICIO}/ejercicios-docente`, { headers: hdr }).then(res => res.json()),
        ]).then(([us, it, ej]) => {
          const usuarios = Array.isArray(us) ? us : []
          const intentos = it?.entregas || []
          const ejercicios = Array.isArray(ej) ? ej : (ej?.ejercicios || [])
          const pendientes = intentos.filter(i => !i.tiene_evaluacion)
          setEntregasPend(pendientes.slice(0, 4))
          const evaluados = intentos.filter(i => i.nota != null)
          const notaProm = evaluados.length
            ? (evaluados.reduce((s, i) => s + i.nota, 0) / evaluados.length).toFixed(1)
            : "—"
          setStatsDocente({
            estudiantes: usuarios.filter(u => u.rol === "estudiante").length,
            pendientes: pendientes.length,
            notaPromedio: notaProm,
            ejercicios: ejercicios.length,
          })
        }).catch(() => {})
      }
    }
  }, [])

  const totalAtaque   = Object.values(progAtaque).reduce((s, v)  => s + (v.completados || 0), 0)
  const totalDefensa  = Object.values(progDefensa).reduce((s, v) => s + (v.completados || 0), 0)
  const dispAtaque    = Object.values(progAtaque).reduce((s, v)  => s + (v.total || 0), 0)
  const dispDefensa   = Object.values(progDefensa).reduce((s, v) => s + (v.total || 0), 0)
  const totalComp     = totalAtaque + totalDefensa
  const totalDisp     = dispAtaque + dispDefensa
  const nivelActual   = Object.keys(progAtaque).find(n =>
    (progAtaque[n]?.total || 0) > (progAtaque[n]?.completados || 0)
  ) || Object.keys(progAtaque).find(n => (progAtaque[n]?.total || 0) > 0) || "1"

  const esDocente = rolUsuario === "admin" || rolUsuario === "docente"

  if (esDocente) {
    return (
      <GuardSesion>
        <TransicionPagina>
          <main style={{ minHeight: "100vh", background: "#141414", fontFamily: "Inter, sans-serif" }}>
            <BarraSuperior paginaActiva="inicio" />

            {/* ── HERO DOCENTE/ADMIN ── */}
            <section style={{ maxWidth: 1100, margin: "0 auto", padding: "52px 32px 40px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#6e6e73", letterSpacing: ".08em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 14 }}>
                {rolUsuario === "admin" ? "Panel de administración" : "Panel docente"}
              </p>
              <h1 style={{ fontSize: 34, fontWeight: 900, color: "#f5f5f7", letterSpacing: "-.7px", lineHeight: 1.15, marginBottom: 12 }}>
                Hola, <span style={{ background: "linear-gradient(135deg,#2997ff,#5e5ce6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{nombreUsuario || "Administrador"}</span>.
              </h1>
              <p style={{ fontSize: 15, color: "#aeaeb2", lineHeight: 1.65, maxWidth: 540, marginBottom: 28 }}>
                {statsDocente?.pendientes > 0
                  ? <>Tienes <strong style={{ color: "#f5f5f7" }}>{statsDocente.pendientes} entrega{statsDocente.pendientes !== 1 ? "s" : ""} pendiente{statsDocente.pendientes !== 1 ? "s" : ""}</strong> de corrección. Revisa el panel para evaluar el trabajo de tus estudiantes.</>
                  : rolUsuario === "admin"
                    ? "Gestiona usuarios, contenido y configuración del sistema desde aquí."
                    : "Todo al día. Puedes crear nuevos ejercicios o revisar las estadísticas del curso."}
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button onClick={() => router.push("/panel")} style={{ padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700, background: "linear-gradient(135deg,#2997ff,#5e5ce6)", color: "#fff", border: "none", cursor: "pointer" }}>
                  {rolUsuario === "admin" ? "⚙ Ir a Administrar →" : "Ver entregas pendientes →"}
                </button>
                <button onClick={() => router.push("/estadisticas")} style={{ padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700, background: "rgba(255,255,255,.06)", color: "#aeaeb2", border: "1px solid rgba(255,255,255,.10)", cursor: "pointer" }}>
                  ◈ Ver estadísticas
                </button>
              </div>
            </section>

            {/* ── STATS ── */}
            <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 36px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 32 }}>
                {[
                  { lbl: "Estudiantes", val: statsDocente ? statsAnimadas.estudiantes : "—", color: "#30d158", sub: "registrados" },
                  { lbl: "Por corregir", val: statsDocente ? statsAnimadas.pendientes : "—", color: "#ff9f0a", sub: "esperando evaluación" },
                  { lbl: "Nota promedio", val: statsDocente ? statsAnimadas.notaPromedio : "—", color: "#2997ff", sub: "del curso" },
                  { lbl: "Ejercicios", val: statsDocente ? statsAnimadas.ejercicios : "—", color: "#5e5ce6", sub: "publicados" },
                ].map(({ lbl, val, color, sub }) => (
                  <div key={lbl} style={{ background: "#1c1c1e", border: "1px solid rgba(255,255,255,.10)", borderTop: `3px solid ${color}`, borderRadius: 14, padding: "20px 22px" }}>
                    <div style={{ fontSize: 30, fontWeight: 900, color, marginBottom: 4 }}>{val}</div>
                    <div style={{ fontSize: 13, color: "#aeaeb2" }}>{lbl}</div>
                    <div style={{ fontSize: 11, color: "#6e6e73", marginTop: 4, fontFamily: "monospace" }}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* ── ACCESOS RÁPIDOS ── */}
              <div style={{ fontSize: 16, fontWeight: 800, color: "#f5f5f7", marginBottom: 6 }}>Accesos rápidos</div>
              <div style={{ fontSize: 13, color: "#aeaeb2", marginBottom: 18 }}>Navega directamente a las secciones más usadas</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
                {(rolUsuario === "admin"
                  ? [
                      { icon: "👥", titulo: "Gestión de usuarios", desc: "Crea, edita y elimina cuentas. Cambia roles y busca por nombre o correo.", ruta: "/panel", flecha: "Ir a usuarios →" },
                      { icon: "📝", titulo: "Editor de contenido", desc: "Edita los módulos teóricos de cada nivel directamente desde el panel.", ruta: "/panel", flecha: "Editar contenido →" },
                      { icon: "📋", titulo: "Logs de auditoría", desc: "Revisa todas las acciones de usuarios con filtros y exportación CSV.", ruta: "/estadisticas", flecha: "Ver logs →" },
                    ]
                  : [
                      { icon: "👤", titulo: "Panel de estudiantes", desc: "Revisa intentos, evalúa entregas y asigna notas a tus estudiantes.", ruta: "/panel", flecha: "Ir al panel →" },
                      { icon: "⚔️", titulo: "Gestionar ejercicios", desc: "Crea, edita y administra los ejercicios del semestre con asistencia IA.", ruta: "/panel", flecha: "Ver ejercicios →" },
                      { icon: "◈", titulo: "Estadísticas del curso", desc: "Visualiza el rendimiento general, tasa de aprobación y exporta notas.", ruta: "/estadisticas", flecha: "Ver estadísticas →" },
                    ]
                ).map(({ icon, titulo, desc, ruta, flecha }) => (
                  <div key={titulo} onClick={() => router.push(ruta)} style={{ background: "#1c1c1e", border: "1px solid rgba(255,255,255,.10)", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 10, cursor: "pointer", transition: "border .18s, transform .15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.22)"; e.currentTarget.style.transform = "translateY(-2px)" }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.10)"; e.currentTarget.style.transform = "translateY(0)" }}
                  >
                    <div style={{ fontSize: 24 }}>{icon}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#f5f5f7" }}>{titulo}</div>
                    <div style={{ fontSize: 12, color: "#aeaeb2", lineHeight: 1.55, flex: 1 }}>{desc}</div>
                    <div style={{ fontSize: 12, color: "#6e6e73", marginTop: 4 }}>{flecha}</div>
                  </div>
                ))}
              </div>

              {/* ── FILA INFERIOR ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>

                {/* Entregas pendientes */}
                <div style={{ background: "#1c1c1e", border: "1px solid rgba(255,255,255,.10)", borderRadius: 14, padding: 22 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#f5f5f7" }}>Entregas pendientes</div>
                    {statsDocente?.pendientes > 0 && (
                      <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "rgba(255,159,10,.13)", color: "#ff9f0a", border: "1px solid rgba(255,159,10,.22)" }}>
                        {statsDocente.pendientes} sin corregir
                      </span>
                    )}
                  </div>
                  {entregasPend.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#6e6e73", textAlign: "center", padding: "20px 0" }}>Sin entregas pendientes ✓</div>
                  ) : (
                    <>
                      {entregasPend.map((e, i) => {
                        const ini = (e.usuario || "?").slice(0, 2).toUpperCase()
                        return (
                          <div key={e.intento_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < entregasPend.length - 1 ? "1px solid rgba(255,255,255,.06)" : "none" }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#2997ff,#5e5ce6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{ini}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#f5f5f7" }}>{e.usuario}</div>
                              <div style={{ fontSize: 11, color: "#6e6e73", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{e.descripcion_ejercicio || `Ejercicio ${e.ejercicio_id}`}</div>
                            </div>
                            <button onClick={() => router.push("/panel")} style={{ padding: "5px 12px", fontSize: 11, fontWeight: 700, background: "linear-gradient(135deg,#2997ff,#5e5ce6)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Evaluar</button>
                          </div>
                        )
                      })}
                      <div style={{ marginTop: 14, textAlign: "center" }}>
                        <button onClick={() => router.push("/panel")} style={{ fontSize: 12, color: "#2997ff", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Ver todas las entregas →</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
          </main>
        </TransicionPagina>
      </GuardSesion>
    )
  }

  return (
    <GuardSesion>
      <TransicionPagina>
        <main style={{ minHeight: "100vh", background: "#141414" }}>
          <BarraSuperior paginaActiva="inicio" />

          {/* ── HERO ── */}
          <section className="home-hero">
            <p className="home-eyebrow">Dashboard de progreso</p>
            <h1>
              Hola, <em>{nombreUsuario || "Operador"}</em>.{" "}
              <span style={{ fontStyle: "normal" }}>👋</span>
            </h1>
            <p>
              {totalComp > 0
                ? <>Llevas <strong style={{ color: "#f5f5f7" }}>{totalComp} ejercicio{totalComp !== 1 ? "s" : ""} completado{totalComp !== 1 ? "s" : ""}</strong>{totalDisp > 0 && <> de {totalDisp}</>}. Sigue avanzando en el Nivel {nivelActual}.</>
                : "Bienvenido al laboratorio. Comienza tu primer ejercicio para desbloquear los módulos."}
            </p>
            <div className="home-hero-actions">
              <button className="btn-mock-primary" onClick={() => router.push("/dashboard")}>
                Continuar Nivel {nivelActual} →
              </button>
              <button className="btn-mock-outline" onClick={() => router.push("/dashboard/informacion?nivel=1")}>
                Ver módulo teórico
              </button>
            </div>
          </section>

          {/* ── PROGRESO ── */}
          <section className="home-section-dark">
            <h2 className="home-section-title">Tu progreso</h2>
            <p className="home-section-sub">Avance por niveles del semestre</p>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>

              {/* ── Ataque ── */}
              <div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:12 }}>
                  <span style={{ fontSize:18 }}>⚔️</span>
                  <span style={{ fontWeight:700, fontSize:15, color:"#f5f5f7" }}>Ataque</span>
                  <span style={{ fontSize:12, color:"#8e8e93", fontFamily:"var(--mono)" }}>{totalAtaque}/{dispAtaque || "—"}</span>
                </div>
                <div className="progress-card-mock">
                  {[1,2,3,4,5,6,7].map(n => {
                    const comp  = progAtaque[n]?.completados || 0
                    const tot   = progAtaque[n]?.total || 0
                    const pct   = tot ? Math.round((comp / tot) * 100) : 0
                    return (
                      <div className="prog-row" key={n}>
                        <span className="prog-row-label">Nivel {n}</span>
                        <div className="prog-row-track">
                          <div className={`prog-row-fill${pct === 100 ? " green" : pct === 0 ? " orange" : ""}`} style={{ width:`${pct}%` }}/>
                        </div>
                        <span className="prog-row-pct">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ── Defensa ── */}
              <div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:12 }}>
                  <span style={{ fontSize:18 }}>🛡️</span>
                  <span style={{ fontWeight:700, fontSize:15, color:"#f5f5f7" }}>Defensa</span>
                  <span style={{ fontSize:12, color:"#8e8e93", fontFamily:"var(--mono)" }}>{totalDefensa}/{dispDefensa || "—"}</span>
                </div>
                <div className="progress-card-mock">
                  {[1,2,3,4,5,6,7].map(n => {
                    const comp  = progDefensa[n]?.completados || 0
                    const tot   = progDefensa[n]?.total || 0
                    const pct   = tot ? Math.round((comp / tot) * 100) : 0
                    return (
                      <div className="prog-row" key={n}>
                        <span className="prog-row-label">Nivel {n}</span>
                        <div className="prog-row-track">
                          <div style={{ height:"100%", borderRadius:999, width:`${pct}%`, background: pct === 100 ? "#30d158" : pct > 0 ? "#30d158" : "transparent", opacity: pct > 0 && pct < 100 ? 0.75 : 1 }}/>
                        </div>
                        <span className="prog-row-pct" style={{ color: pct > 0 ? "#30d158" : undefined }}>{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </section>

          {/* ── MÓDULOS ── */}
          <section className="home-section-light" style={{ borderTop: "1px solid #2c2c2e" }}>
            <h2 className="home-section-title">Módulos disponibles</h2>
            <p className="home-section-sub">Explora y practica cada área de ciberseguridad</p>
            <div className="home-grid-3">
              <div className="home-card-mock" onClick={() => router.push("/dashboard")}>
                <div className="home-card-icon">🛡️</div>
                <h3>Defensa IDS</h3>
                <p>Responde incidentes en tiempo real. Monitorea alertas, bloquea IPs y genera reportes técnicos.</p>
              </div>
              <div className="home-card-mock" onClick={() => router.push("/dashboard")}>
                <div className="home-card-icon">⚡</div>
                <h3>Fuerza Bruta</h3>
                <p>Detecta y mitiga ataques de fuerza bruta. Analiza patrones de login fallidos y aplica contención.</p>
              </div>
              <div className="home-card-mock" onClick={() => router.push("/dashboard")}>
                <div className="home-card-icon">🔍</div>
                <h3>Reconocimiento</h3>
                <p>Enumera servicios, escanea puertos y mapea la red objetivo paso a paso.</p>
              </div>
              <div className="home-card-mock" onClick={() => router.push("/dashboard")}>
                <div className="home-card-icon">🧬</div>
                <h3>Vulnerabilidades</h3>
                <p>Identifica CVEs activos, analiza banners de servicios y prioriza el parcheo de sistemas.</p>
              </div>
              <div className="home-card-mock" onClick={() => router.push("/dashboard/informacion?nivel=1")}>
                <div className="home-card-icon">📖</div>
                <h3>Módulo Teórico</h3>
                <p>Fundamentos, metodología y buenas prácticas de pentesting. Lee cada sección para desbloquear prácticas.</p>
              </div>
              <div className="home-card-mock" onClick={() => router.push(rolUsuario === "estudiante" ? "/notas" : "/panel")}>
                <div className="home-card-icon">📊</div>
                <h3>{rolUsuario === "estudiante" ? "Evaluaciones" : "Panel de gestión"}</h3>
                <p>
                  {rolUsuario === "estudiante"
                    ? "Revisa tus notas, puntajes por ejercicio y retroalimentación del docente."
                    : "Administra estudiantes, crea ejercicios y gestiona evaluaciones."}
                </p>
              </div>
            </div>
          </section>

        </main>
      </TransicionPagina>
    </GuardSesion>
  )
}
