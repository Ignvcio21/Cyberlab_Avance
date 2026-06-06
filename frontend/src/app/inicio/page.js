"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import GuardSesion from "../componentes/GuardSesion"
import BarraSuperior from "../componentes/BarraSuperior"
import TransicionPagina from "../componentes/TransicionPagina"

const TOTAL_EJ = 5
const NOMBRES_NIV = {
  1: "Fundamentos", 2: "Reconocimiento", 3: "Enumeración",
  4: "Explotación", 5: "Post-exploit", 6: "Avanzado", 7: "Operación"
}
const vacioNiveles = () => Object.fromEntries([1,2,3,4,5,6,7].map(n => [n, { completados: 0 }]))

const API_URL_INICIO = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"

export default function InicioPlataforma() {
  const router = useRouter()
  const [nombreUsuario, setNombreUsuario] = useState("")
  const [rolUsuario, setRolUsuario] = useState("")
  const [progAtaque,  setProgAtaque]  = useState(vacioNiveles())
  const [progDefensa, setProgDefensa] = useState(vacioNiveles())
  const [anuncios, setAnuncios] = useState([])

  const cargarProgreso = async (usuario, token) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL
    const headers = { "Authorization": `Bearer ${token}` }
    const parsear = (d) => {
      const det = d?.detalle || {}
      return Object.fromEntries([1,2,3,4,5,6,7].map(n => [n, { completados: Math.min(det[String(n)]?.completados || 0, TOTAL_EJ) }]))
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
    const nombre  = localStorage.getItem("nombre_display") || localStorage.getItem("nombre_usuario") || ""
    const usuario = localStorage.getItem("nombre_usuario") || ""
    const r       = localStorage.getItem("rol_usuario") || ""
    setNombreUsuario(nombre); setRolUsuario(r)
    if (usuario) cargarProgreso(usuario, localStorage.getItem("token") || "")
    const tok = localStorage.getItem("token") || ""
    if (tok) {
      fetch(`${API_URL_INICIO}/anuncios`, { headers: { "Authorization": `Bearer ${tok}` } })
        .then(r => r.json()).then(d => setAnuncios(d.anuncios || [])).catch(() => {})
    }
  }, [])

  const totalAtaque  = Object.values(progAtaque).reduce((s, v)  => s + (v.completados || 0), 0)
  const totalDefensa = Object.values(progDefensa).reduce((s, v) => s + (v.completados || 0), 0)
  const totalComp    = totalAtaque + totalDefensa
  const nivelActual  = Object.keys(progAtaque).find(n => (progAtaque[n]?.completados || 0) < TOTAL_EJ) || "7"

  return (
    <GuardSesion>
      <TransicionPagina>
        <main style={{ minHeight: "100vh", background: "#141414" }}>
          <BarraSuperior paginaActiva="inicio" />

          {/* ── ANUNCIOS ── */}
          {anuncios.length > 0 && (() => {
            const colorTipo = { urgente: "#ff453a", aviso: "#2997ff", info: "#ff9f0a" }
            const urgentes = anuncios.filter(a => a.tipo === "urgente")
            const resto = anuncios.filter(a => a.tipo !== "urgente")
            return (
              <div style={{ padding: "20px 32px 0" }}>
                {urgentes.map(a => (
                  <div key={a.id} style={{ background: "rgba(255,69,58,.07)", border: "1px solid rgba(255,69,58,.25)", borderLeft: "4px solid #ff453a", borderRadius: 12, padding: "14px 18px", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff453a", animation: "pulse-dot 1.5s infinite" }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#ff453a", textTransform: "uppercase", letterSpacing: ".06em" }}>Urgente</span>
                      <span style={{ fontSize: 11, color: "#6e7681" }}>· {a.autor}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#f5f5f7" }}>{a.titulo}</div>
                    <div style={{ fontSize: 13, color: "#aeaeb2", marginTop: 4, lineHeight: 1.5 }}>{a.mensaje}</div>
                  </div>
                ))}
                {resto.length > 0 && (
                  <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
                    {resto.map((a, i) => (
                      <div key={a.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 16px", borderBottom: i < resto.length - 1 ? "1px solid rgba(255,255,255,.06)" : "none" }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: colorTipo[a.tipo] || "#2997ff", flexShrink: 0, marginTop: 5 }} />
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#f5f5f7" }}>{a.titulo}</span>
                          <span style={{ fontSize: 11, color: "#6e7681", marginLeft: 8 }}>· {a.autor}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <style>{`@keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
              </div>
            )
          })()}

          {/* ── HERO ── */}
          <section className="home-hero">
            <p className="home-eyebrow">Dashboard de progreso</p>
            <h1>
              Hola, <em>{nombreUsuario || "Operador"}</em>.{" "}
              <span style={{ fontStyle: "normal" }}>👋</span>
            </h1>
            <p>
              {totalComp > 0
                ? <>Llevas <strong style={{ color: "#f5f5f7" }}>{totalComp} ejercicios completados</strong> de 35. Sigue avanzando en el Nivel {nivelActual}.</>
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
                  <span style={{ fontSize:12, color:"#8e8e93", fontFamily:"var(--mono)" }}>{totalAtaque}/35</span>
                </div>
                <div className="progress-card-mock">
                  {[1,2,3,4,5,6,7].map(n => {
                    const comp = progAtaque[n]?.completados || 0
                    const pct  = Math.round((comp / TOTAL_EJ) * 100)
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
                  <span style={{ fontSize:12, color:"#8e8e93", fontFamily:"var(--mono)" }}>{totalDefensa}/35</span>
                </div>
                <div className="progress-card-mock">
                  {[1,2,3,4,5,6,7].map(n => {
                    const comp = progDefensa[n]?.completados || 0
                    const pct  = Math.round((comp / TOTAL_EJ) * 100)
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
