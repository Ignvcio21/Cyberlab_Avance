"use client"

// =============================================================================
// PÁGINA: /inicio — Página de entrada tras iniciar sesión
// -----------------------------------------------------------------------------
// Es la "home" del usuario autenticado y se adapta según su rol:
//   • Estudiante: muestra su progreso por niveles (ataque/defensa), accesos a
//     los módulos y atajos al dashboard.
//   • Docente/Admin: muestra un panel resumen con estadísticas del curso
//     (estudiantes, entregas por corregir, nota promedio, ejercicios) con
//     contadores animados, accesos rápidos y la lista de entregas pendientes.
// Protegida por <GuardSesion> (requiere sesión activa).
// =============================================================================

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import GuardSesion from "../componentes/GuardSesion"          // bloquea el acceso sin sesión
import BarraSuperior from "../componentes/BarraSuperior"      // barra de navegación superior
import TransicionPagina from "../componentes/TransicionPagina" // animación de entrada de página

// Nombres legibles de cada uno de los 7 niveles del semestre.
const NOMBRES_NIV = {
  1: "Fundamentos", 2: "Reconocimiento", 3: "Enumeración",
  4: "Explotación", 5: "Post-explotación", 6: "Avanzado", 7: "Operación completa"
}
// Crea un objeto de progreso "vacío" (0 completados / 0 totales) para los 7 niveles.
const vacioNiveles = () => Object.fromEntries([1,2,3,4,5,6,7].map(n => [n, { completados: 0, total: 0 }]))

// URL base del backend (variable de entorno o servidor de producción).
const API_URL_INICIO = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"

export default function InicioPlataforma() {
  const router = useRouter()
  // --- Estado de la página ---
  const [nombreUsuario, setNombreUsuario] = useState("")          // nombre a mostrar
  const [rolUsuario, setRolUsuario] = useState("")                // estudiante / docente / admin
  const [progAtaque,  setProgAtaque]  = useState(vacioNiveles())  // progreso en ejercicios de ataque
  const [progDefensa, setProgDefensa] = useState(vacioNiveles())  // progreso en ejercicios de defensa
  const [entregasPend, setEntregasPend] = useState([])            // entregas sin corregir (vista docente)
  const [statsDocente, setStatsDocente] = useState(null)          // estadísticas del curso (vista docente)
  // Versión "animada" de las estadísticas: arranca en 0 y sube hasta el valor real.
  const [statsAnimadas, setStatsAnimadas] = useState({ estudiantes: 0, pendientes: 0, notaPromedio: 0, ejercicios: 0 })

  // Contador animado easeOutCubic
  // Anima un número desde 0 hasta `target` usando una curva easeOutCubic
  // (rápido al inicio, suave al final). Actualiza la clave indicada de statsAnimadas.
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
  // Cuando llegan las estadísticas del docente, dispara la animación de cada contador.
  useEffect(() => {
    if (!statsDocente) return
    animarContador("estudiantes",   statsDocente.estudiantes  ?? 0, 0, 900)
    animarContador("pendientes",    statsDocente.pendientes   ?? 0, 0, 1000)
    animarContador("notaPromedio",  statsDocente.notaPromedio ?? 0, 1, 1200)
    animarContador("ejercicios",    statsDocente.ejercicios   ?? 0, 0, 800)
  }, [statsDocente])

  // Carga el progreso del estudiante (ataque y defensa) desde el backend.
  const cargarProgreso = async (usuario, token) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL
    const headers = { "Authorization": `Bearer ${token}` }
    // Normaliza la respuesta del backend a { nivel: {completados, total} } para los 7 niveles.
    const parsear = (d) => {
      const det = d?.detalle || {}
      // total = ejercicios realmente publicados por el docente en ese nivel
      return Object.fromEntries([1,2,3,4,5,6,7].map(n => [n, {
        completados: det[String(n)]?.completados || 0,
        total: det[String(n)]?.total || 0,
      }]))
    }
    try {
      // Pide en paralelo el progreso de ataque y el de defensa.
      const [rA, rD] = await Promise.all([
        fetch(`${API_URL}/progreso/laboratorio/${encodeURIComponent(usuario)}?tipo=ataque`,  { headers }),
        fetch(`${API_URL}/progreso/laboratorio/${encodeURIComponent(usuario)}?tipo=defensa`, { headers }),
      ])
      if (rA.ok) setProgAtaque(parsear(await rA.json()))
      if (rD.ok) setProgDefensa(parsear(await rD.json()))
    } catch {}
  }

  // Al montar: lee la sesión, carga el progreso y, si es docente/admin, las stats del panel.
  useEffect(() => {
    // Datos de sesión guardados al iniciar sesión.
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
        // Pide en paralelo: lista de usuarios, entregas y ejercicios publicados.
        Promise.all([
          fetch(`${API_URL_INICIO}/admin/usuarios`, { headers: hdr }).then(res => res.json()),
          fetch(`${API_URL_INICIO}/docente/entregas`, { headers: hdr }).then(res => res.json()),
          fetch(`${API_URL_INICIO}/ejercicios-docente`, { headers: hdr }).then(res => res.json()),
        ]).then(([us, it, ej]) => {
          // Normaliza las respuestas (pueden venir como arreglo o como objeto).
          const usuarios = Array.isArray(us) ? us : []
          const intentos = it?.entregas || []
          const ejercicios = Array.isArray(ej) ? ej : (ej?.ejercicios || [])
          // Entregas que aún no tienen evaluación → pendientes de corregir.
          const pendientes = intentos.filter(i => !i.tiene_evaluacion)
          setEntregasPend(pendientes.slice(0, 4)) // solo se muestran las primeras 4
          // Promedio de las entregas que ya tienen nota.
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

  // --- Valores derivados del progreso (se recalculan en cada render) ---
  const totalAtaque   = Object.values(progAtaque).reduce((s, v)  => s + (v.completados || 0), 0) // ejercicios de ataque completados
  const totalDefensa  = Object.values(progDefensa).reduce((s, v) => s + (v.completados || 0), 0) // ejercicios de defensa completados
  const dispAtaque    = Object.values(progAtaque).reduce((s, v)  => s + (v.total || 0), 0)        // total de ataque publicados
  const dispDefensa   = Object.values(progDefensa).reduce((s, v) => s + (v.total || 0), 0)        // total de defensa publicados
  const totalComp     = totalAtaque + totalDefensa // total completados (ambos tipos)
  const totalDisp     = dispAtaque + dispDefensa   // total disponibles (ambos tipos)
  // Nivel actual = primer nivel con ejercicios pendientes; si no hay, el primero con contenido; si nada, "1".
  const nivelActual   = Object.keys(progAtaque).find(n =>
    (progAtaque[n]?.total || 0) > (progAtaque[n]?.completados || 0)
  ) || Object.keys(progAtaque).find(n => (progAtaque[n]?.total || 0) > 0) || "1"

  // ¿El usuario es docente o admin? Determina qué vista se renderiza.
  const esDocente = rolUsuario === "admin" || rolUsuario === "docente"

  // ===========================================================================
  // VISTA DOCENTE / ADMIN: panel resumen con estadísticas y entregas pendientes
  // ===========================================================================
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

            {/* ── STATS ──  Cuatro tarjetas con métricas del curso (contadores animados) */}
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

              {/* ── ACCESOS RÁPIDOS ──  Tarjetas de navegación que cambian según el rol
                  (admin ve gestión de usuarios/contenido; docente ve panel/ejercicios). */}
              <div style={{ fontSize: 16, fontWeight: 800, color: "#f5f5f7", marginBottom: 6 }}>Accesos rápidos</div>
              <div style={{ fontSize: 13, color: "#aeaeb2", marginBottom: 18 }}>Navega directamente a las secciones más usadas</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
                {(rolUsuario === "admin"
                  ? [
                      { icon: "👥", titulo: "Gestión de usuarios", desc: "Crea, edita y elimina cuentas. Cambia roles y busca por nombre o correo.", ruta: "/panel?tab=usuarios", flecha: "Ir a usuarios →" },
                      { icon: "📝", titulo: "Editor de contenido", desc: "Edita los módulos teóricos de cada nivel directamente desde el panel.", ruta: "/panel?tab=contenido", flecha: "Editar contenido →" },
                      { icon: "📋", titulo: "Exportar notas e informes de los estudiantes", desc: "Descarga notas, listas e informes del curso en CSV y PDF.", ruta: "/estadisticas", flecha: "Exportar notas →" },
                    ]
                  : [
                      { icon: "👤", titulo: "Panel de estudiantes", desc: "Revisa intentos, evalúa entregas y asigna notas a tus estudiantes.", ruta: "/panel?tab=estudiantes", flecha: "Ir al panel →" },
                      { icon: "⚔️", titulo: "Gestionar ejercicios", desc: "Crea, edita y administra los ejercicios del semestre con asistencia IA.", ruta: "/panel?tab=ejercicios", flecha: "Ver ejercicios →" },
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

              {/* ── FILA INFERIOR ──  Lista de entregas pendientes de corregir */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>

                {/* Entregas pendientes: muestra hasta 4 entregas sin evaluar con
                    botón "Evaluar" que lleva al panel. Si no hay, muestra un check. */}
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

  // ===========================================================================
  // VISTA ESTUDIANTE: progreso por niveles, módulos disponibles y accesos
  // ===========================================================================
  return (
    <GuardSesion>
      <TransicionPagina>
        <main style={{ minHeight: "100vh", background: "#141414" }}>
          <BarraSuperior paginaActiva="inicio" />

          {/* ── HERO ──  Saludo personalizado y botones para continuar el nivel actual */}
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

          {/* ── PROGRESO ──  Dos columnas (Ataque y Defensa) con una barra de
              porcentaje por cada uno de los 7 niveles. */}
          <section className="home-section-dark">
            <h2 className="home-section-title">Tu progreso</h2>
            <p className="home-section-sub">Avance por niveles del semestre</p>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>

              {/* ── Ataque ──  Barra de progreso por nivel para ejercicios de ataque */}
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

              {/* ── Defensa ──  Misma barra de progreso por nivel para ejercicios de defensa */}
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

          {/* ── MÓDULOS ──  Tarjetas clicables que llevan al dashboard / teoría /
              notas. La última cambia entre "Evaluaciones" y "Panel" según el rol. */}
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
