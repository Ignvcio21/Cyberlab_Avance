"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import GuardSesion from "../componentes/GuardSesion"
import BarraSuperior from "../componentes/BarraSuperior"
import TransicionPagina from "../componentes/TransicionPagina"

export default function InicioPlataforma() {
  const router = useRouter()
  const [nombreUsuario, setNombreUsuario] = useState("")
  const [rolUsuario, setRolUsuario] = useState("")

  useEffect(() => {
    const u = localStorage.getItem("nombre_usuario") || ""
    const r = localStorage.getItem("rol_usuario") || ""
    setNombreUsuario(u)
    setRolUsuario(r)
  }, [])

  return (
    <GuardSesion>
      <TransicionPagina>
        <main className="inicio-plataforma-simple">
          <BarraSuperior paginaActiva="inicio" />

          <section style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gap: 20 }}>
            {/* Hero */}
            <div className="inicio-hero-contenido" style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div className="inicio-badge">▸ PLATAFORMA ACTIVA</div>
                  <h1 className="inicio-titulo" style={{ marginTop: 14 }}>
                    Bienvenido,{" "}
                    <span className="inicio-acento">{nombreUsuario || "Operador"}</span>
                  </h1>
                  <p style={{ color: "var(--texto-secundario)", lineHeight: 1.7, fontSize: 15, marginBottom: 24, maxWidth: "55ch" }}>
                    Centro de entrenamiento práctico en ciberseguridad y pentesting.
                    Completa los ejercicios para desbloquear nuevos módulos de ataque.
                  </p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      className="attack-button"
                      onClick={() => router.push("/dashboard")}
                    >
                      → Ir al Laboratorio
                    </button>
                    <button
                      className="attack-button secondary"
                      onClick={() => router.push("/dashboard/informacion?nivel=1")}
                    >
                      Módulo de Información
                    </button>
                  </div>
                </div>

                {/* Badge de rol */}
                <div style={{
                  padding: "20px 24px",
                  background: "rgba(0,163,255,0.08)",
                  border: "1px solid rgba(0,163,255,0.18)",
                  borderRadius: 14,
                  textAlign: "center",
                  minWidth: 160
                }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--texto-apagado)", letterSpacing: "0.08em", marginBottom: 8 }}>ROL ASIGNADO</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 22, fontWeight: 700, color: "var(--primario-dim)", textTransform: "capitalize" }}>
                    {rolUsuario || "Estudiante"}
                  </div>
                  <div style={{ marginTop: 8, width: 8, height: 8, borderRadius: "50%", background: "var(--verde)", boxShadow: "0 0 10px var(--verde)", margin: "8px auto 0" }} />
                </div>
              </div>
            </div>

            {/* Métricas SOC */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              {[
                { label: "MÓDULOS ACTIVOS", valor: "2", desc: "Fuerza Bruta · Escaneo de Puertos", color: "var(--primario)" },
                { label: "EJERCICIOS TOTALES", valor: "10", desc: "5 por tipo de ataque", color: "var(--terciario)" },
                { label: "TERMINAL", valor: "Kali", desc: "cyberlab@kali:~$", color: "var(--secundario-dim)" },
                { label: "PENALIZACIÓN MÁX.", valor: "−30%", desc: "6 ayudas · −5% c/u", color: "#ffb4ab" },
              ].map(({ label, valor, desc, color }) => (
                <div key={label} style={{
                  padding: "18px 20px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderTop: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 14,
                  backdropFilter: "blur(20px)"
                }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.10em", color: "var(--texto-apagado)", marginBottom: 10 }}>{label}</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 30, fontWeight: 700, color, lineHeight: 1 }}>{valor}</div>
                  <div style={{ fontSize: 12, color: "var(--texto-apagado)", marginTop: 8, fontFamily: "var(--mono)" }}>{desc}</div>
                </div>
              ))}
            </div>

            {/* Cards de módulos */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              <ModuloCard
                titulo="Fuerza Bruta"
                desc="Aprende a detectar y bloquear ataques de autenticación exhaustiva. 5 ejercicios progresivos con checklist dinámico."
                tag="MÓDULO I"
                color="var(--primario)"
                onClick={() => router.push("/dashboard")}
                activo
              />
              <ModuloCard
                titulo="Escaneo de Puertos"
                desc="Identifica servicios expuestos y analiza vectores de entrada en la infraestructura objetivo. Se desbloquea al completar Fuerza Bruta."
                tag="MÓDULO II"
                color="var(--terciario)"
                onClick={() => router.push("/dashboard")}
              />
              <ModuloCard
                titulo="Módulo Teórico"
                desc="Fundamentos, metodología y buenas prácticas de pentesting. Lee cada sección para desbloquear las simulaciones prácticas."
                tag="INFORMACIÓN"
                color="var(--secundario-dim)"
                onClick={() => router.push("/dashboard/informacion?nivel=1")}
              />
            </div>
          </section>
        </main>
      </TransicionPagina>
    </GuardSesion>
  )
}

function ModuloCard({ titulo, desc, tag, color, onClick, activo }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "22px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderTop: `2px solid ${color}`,
        borderRadius: 14,
        cursor: "pointer",
        transition: "all 0.2s ease",
        backdropFilter: "blur(20px)",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(-3px)" }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.transform = "translateY(0)" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.10em", color, padding: "4px 10px",
          background: `${color}18`, border: `1px solid ${color}33`, borderRadius: 999
        }}>{tag}</span>
        {activo && (
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--verde)", boxShadow: "0 0 10px var(--verde)", display: "inline-block" }} />
        )}
      </div>
      <h3 style={{ fontFamily: "var(--sans)", fontSize: 17, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>{titulo}</h3>
      <p style={{ fontSize: 13, color: "var(--texto-secundario)", lineHeight: 1.65, margin: 0 }}>{desc}</p>
    </div>
  )
}
