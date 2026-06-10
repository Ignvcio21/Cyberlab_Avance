"use client"

import { useEffect, useState } from "react"
import GuardSesion from "../componentes/GuardSesion"
import BarraSuperior from "../componentes/BarraSuperior"

const API = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"
const h = () => ({ "Authorization": `Bearer ${sessionStorage.getItem("token") || ""}`, "Content-Type": "application/json" })

const TIPOS = [
  { val: "urgente", label: "⚠ Urgente", color: "#ff453a" },
  { val: "aviso",   label: "Aviso",     color: "#2997ff" },
  { val: "info",    label: "Info",      color: "#ff9f0a" },
]

const colorTipo = { urgente: "#ff453a", aviso: "#2997ff", info: "#ff9f0a" }
const borderTipo = { urgente: "rgba(255,69,58,.35)", aviso: "rgba(41,151,255,.35)", info: "rgba(255,159,10,.35)" }

const formatFecha = (str) => {
  if (!str) return "—"
  return new Date(str).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function Modal({ abierto, onCerrar, titulo, children }) {
  if (!abierto) return null
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onCerrar() }} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(4px)", padding: 20,
    }}>
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 18, padding: 32, maxWidth: 500, width: "100%" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#f0f6fc", marginBottom: 20 }}>{titulo}</div>
        {children}
      </div>
    </div>
  )
}

export default function AnunciosPage() {
  const [anuncios, setAnuncios] = useState([])
  const [cargando, setCargando] = useState(true)

  // Modal nuevo/editar
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState(null) // null = nuevo, objeto = editar
  const [formTitulo, setFormTitulo] = useState("")
  const [formMensaje, setFormMensaje] = useState("")
  const [formTipo, setFormTipo] = useState("aviso")
  const [enviando, setEnviando] = useState(false)

  const cargar = () => {
    setCargando(true)
    fetch(`${API}/anuncios`, { headers: h() })
      .then(r => r.json())
      .then(d => setAnuncios(d.anuncios || []))
      .catch(() => setAnuncios([]))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargar() }, [])

  const mostrarMsg = (texto, tipo = "ok") => {
    window.cyberToast?.(texto, tipo === "err" ? "err" : "ok")
  }

  const abrirNuevo = () => {
    setEditando(null); setFormTitulo(""); setFormMensaje(""); setFormTipo("aviso")
    setModalAbierto(true)
  }

  const abrirEditar = (a) => {
    setEditando(a); setFormTitulo(a.titulo); setFormMensaje(a.mensaje); setFormTipo(a.tipo)
    setModalAbierto(true)
  }

  const guardar = async () => {
    if (!formTitulo.trim() || !formMensaje.trim()) { mostrarMsg("Completa título y mensaje", "err"); return }
    setEnviando(true)
    try {
      const url = editando ? `${API}/anuncios/${editando.id}` : `${API}/anuncios`
      const method = editando ? "PUT" : "POST"
      const r = await fetch(url, { method, headers: h(), body: JSON.stringify({ titulo: formTitulo, mensaje: formMensaje, tipo: formTipo }) })
      const d = await r.json()
      if (r.ok) {
        mostrarMsg(editando ? "Anuncio actualizado" : "Anuncio publicado")
        setModalAbierto(false); cargar()
      } else {
        mostrarMsg(d?.detail || "Error al guardar", "err")
      }
    } catch { mostrarMsg("No se pudo conectar con el servidor", "err") }
    finally { setEnviando(false) }
  }

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar este anuncio?")) return
    const r = await fetch(`${API}/anuncios/${id}`, { method: "DELETE", headers: h() })
    if (r.ok) { mostrarMsg("Anuncio eliminado"); cargar() }
    else mostrarMsg("Error al eliminar", "err")
  }

  return (
    <GuardSesion>
      <div style={{ minHeight: "100vh", background: "#0d1117", fontFamily: "Inter, sans-serif" }}>
        <BarraSuperior paginaActiva="anuncios" />

        <main style={{ maxWidth: 1000, margin: "0 auto", padding: "36px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#f0f6fc", letterSpacing: "-0.4px" }}>
                Anuncios
              </h1>
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "#8b949e" }}>
                Publica avisos que verán todos los estudiantes al ingresar
              </p>
            </div>
            <button onClick={abrirNuevo} style={{
              padding: "10px 20px", fontSize: 13, fontWeight: 700,
              background: "linear-gradient(135deg,#2997ff,#5e5ce6)",
              color: "#fff", border: "none", borderRadius: 10, cursor: "pointer",
            }}>
              + Nuevo anuncio
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 24, alignItems: "start" }}>
            {/* Lista */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6e7681", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 12 }}>
                Publicados ({anuncios.length})
              </div>

              {cargando ? (
                <div style={{ color: "#8b949e", padding: 40, textAlign: "center" }}>Cargando…</div>
              ) : anuncios.length === 0 ? (
                <div style={{ color: "#8b949e", padding: 40, textAlign: "center", background: "#161b22", borderRadius: 14, border: "1px solid #30363d" }}>
                  No hay anuncios publicados.<br/>
                  <span style={{ fontSize: 12 }}>Crea el primero con el botón de arriba.</span>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {anuncios.map(a => (
                    <div key={a.id} style={{
                      background: "#161b22", border: "1px solid #30363d",
                      borderLeft: `4px solid ${colorTipo[a.tipo] || "#2997ff"}`,
                      borderRadius: 14, padding: "18px 20px",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{
                            padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                            background: `${colorTipo[a.tipo]}18`, color: colorTipo[a.tipo],
                            border: `1px solid ${borderTipo[a.tipo] || "#30363d"}`,
                          }}>
                            {TIPOS.find(t => t.val === a.tipo)?.label || a.tipo}
                          </span>
                          <span style={{ fontSize: 11, color: "#6e7681" }}>{formatFecha(a.fecha_creacion)}</span>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => abrirEditar(a)} style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, background: "#21262d", border: "1px solid #30363d", borderRadius: 8, color: "#c9d1d9", cursor: "pointer" }}>
                            Editar
                          </button>
                          <button onClick={() => eliminar(a.id)} style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, background: "rgba(255,69,58,.1)", border: "1px solid rgba(255,69,58,.25)", borderRadius: 8, color: "#ff453a", cursor: "pointer" }}>
                            Eliminar
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#f0f6fc", marginBottom: 6 }}>{a.titulo}</div>
                      <div style={{ fontSize: 13, color: "#8b949e", lineHeight: 1.6, marginBottom: 10 }}>{a.mensaje}</div>
                      <div style={{ fontSize: 11, color: "#6e7681" }}>— {a.autor}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vista previa + resumen */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6e7681", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: -4 }}>
                Así lo ven los estudiantes
              </div>
              <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 14, overflow: "hidden" }}>
                {anuncios.length === 0 ? (
                  <div style={{ padding: 20, fontSize: 13, color: "#6e7681", textAlign: "center" }}>Sin anuncios aún</div>
                ) : anuncios.slice(0, 4).map((a, i) => (
                  <div key={a.id} style={{ padding: "14px 18px", borderBottom: i < Math.min(anuncios.length, 4) - 1 ? "1px solid #21262d" : "none", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: colorTipo[a.tipo] || "#2997ff", flexShrink: 0, marginTop: 5 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#f0f6fc" }}>{a.titulo}</div>
                      <div style={{ fontSize: 11, color: "#6e7681", marginTop: 2 }}>
                        {TIPOS.find(t => t.val === a.tipo)?.label || a.tipo} · {a.autor}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumen */}
              <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f0f6fc", marginBottom: 14 }}>Resumen</div>
                {[
                  { lbl: "Total publicados", val: anuncios.length, color: "#f0f6fc" },
                  { lbl: "Urgentes activos", val: anuncios.filter(a => a.tipo === "urgente").length, color: "#ff453a" },
                  { lbl: "Avisos", val: anuncios.filter(a => a.tipo === "aviso").length, color: "#2997ff" },
                  { lbl: "Informativos", val: anuncios.filter(a => a.tipo === "info").length, color: "#ff9f0a" },
                ].map(({ lbl, val, color }) => (
                  <div key={lbl} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: "#8b949e" }}>{lbl}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Modal */}
        <Modal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} titulo={editando ? "Editar anuncio" : "Nuevo anuncio"}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={lbl}>Tipo</div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                {TIPOS.map(t => (
                  <button key={t.val} onClick={() => setFormTipo(t.val)} style={{
                    padding: "6px 14px", fontSize: 12, fontWeight: 700, borderRadius: 20, cursor: "pointer", border: "none",
                    background: formTipo === t.val ? `${t.color}22` : "#21262d",
                    color: formTipo === t.val ? t.color : "#8b949e",
                    outline: formTipo === t.val ? `1px solid ${t.color}55` : "none",
                  }}>{t.label}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={lbl}>Título</div>
              <input value={formTitulo} onChange={e => setFormTitulo(e.target.value)} placeholder="Ej: Plazo ejercicio 3 — viernes 23:59" style={inp} />
            </div>
            <div>
              <div style={lbl}>Mensaje</div>
              <textarea value={formMensaje} onChange={e => setFormMensaje(e.target.value)} placeholder="Escribe el contenido del anuncio…" style={{ ...inp, minHeight: 90, resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={guardar} disabled={enviando} style={{ flex: 1, padding: "11px 0", fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#2997ff,#5e5ce6)", color: "#fff", border: "none", borderRadius: 10, cursor: enviando ? "not-allowed" : "pointer", opacity: enviando ? 0.7 : 1 }}>
                {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Publicar anuncio"}
              </button>
              <button onClick={() => setModalAbierto(false)} style={{ padding: "11px 18px", fontSize: 13, fontWeight: 700, background: "#21262d", color: "#c9d1d9", border: "1px solid #30363d", borderRadius: 10, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </GuardSesion>
  )
}

const lbl = { display: "block", fontSize: 12, fontWeight: 600, color: "#8b949e", marginBottom: 6 }
const inp = {
  width: "100%", padding: "11px 14px", fontSize: 13,
  background: "#0d1117", border: "1px solid #30363d", borderRadius: 10,
  color: "#f0f6fc", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif",
}
