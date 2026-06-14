"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { marked } from "marked"

marked.setOptions({ mangle: false, headerIds: false })

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"
const getAuthHeaders = () => ({
  "Authorization": `Bearer ${sessionStorage.getItem("token") || ""}`,
  "Content-Type": "application/json",
})

const SECCIONES = [
  { id: "introduccion",     titulo: "Introducción" },
  { id: "objetivos",        titulo: "Objetivos del nivel" },
  { id: "fundamentos",      titulo: "Fundamentos teóricos" },
  { id: "metodologia",      titulo: "Metodología de trabajo" },
  { id: "comandos",         titulo: "Comandos y explicación" },
  { id: "evidencia",        titulo: "Evidencia y análisis" },
  { id: "procedimiento",    titulo: "Procedimiento guiado" },
  { id: "errores",          titulo: "Errores comunes" },
  { id: "buenas_practicas", titulo: "Buenas prácticas" },
  { id: "criterio",         titulo: "Criterio de aprobación" },
]
const NIVELES = [1, 2, 3, 4, 5, 6, 7]

const COLORES = [
  { hex: "#a6e3a1", label: "Verde" },
  { hex: "#89b4fa", label: "Azul" },
  { hex: "#f38ba8", label: "Rojo" },
  { hex: "#f9e2af", label: "Ámbar" },
  { hex: "#cba6f7", label: "Púrpura" },
  { hex: "#94e2d5", label: "Teal" },
  { hex: "#ff9f68", label: "Naranja" },
  { hex: "#ffffff", label: "Blanco" },
]

// ─── HTML → Markdown (para guardar lo que escribe el usuario) ───
function convNode(node) {
  if (node.nodeType === 3) return node.textContent
  if (node.nodeType !== 1) return ""
  const tag = node.tagName.toLowerCase()
  const kids = Array.from(node.childNodes).map(convNode).join("")
  switch (tag) {
    case "h1": return `\n# ${kids.trim()}\n\n`
    case "h2": return `\n## ${kids.trim()}\n\n`
    case "h3": return `\n### ${kids.trim()}\n\n`
    case "h4": return `\n#### ${kids.trim()}\n\n`
    case "p":  return `${kids.trim()}\n\n`
    case "div": return kids.trim() ? `${kids.trim()}\n` : "\n"
    case "br": return "\n"
    case "b": case "strong": return `**${kids}**`
    case "i": case "em":     return `*${kids}*`
    case "u":  return `<u>${kids}</u>`
    case "s": case "strike": case "del": return `~~${kids}~~`
    case "code":
      return node.parentElement?.tagName === "PRE" ? kids : `\`${kids}\``
    case "pre": return `\n\`\`\`\n${kids.trim()}\n\`\`\`\n\n`
    case "ul":
      return Array.from(node.children).map(li => `- ${convNode(li).trim()}\n`).join("") + "\n"
    case "ol":
      return Array.from(node.children).map((li, i) => `${i + 1}. ${convNode(li).trim()}\n`).join("") + "\n"
    case "li": return kids
    case "hr": return `\n---\n\n`
    case "span": {
      const c = node.style?.color
      return c ? `<span style="color:${c}">${kids}</span>` : kids
    }
    case "font": {
      const c = node.getAttribute("color") || node.style?.color
      return c ? `<span style="color:${c}">${kids}</span>` : kids
    }
    case "blockquote": return `\n> ${kids.trim()}\n\n`
    case "a": return `[${kids}](${node.getAttribute("href") || ""})`
    default: return kids
  }
}

function htmlToMarkdown(html) {
  if (typeof document === "undefined") return ""
  const div = document.createElement("div")
  div.innerHTML = html
  return convNode(div).replace(/\n{3,}/g, "\n\n").trim() + "\n"
}

// ─── Toolbar WYSIWYG ───
function ToolbarRich({ editorRef, onInput }) {
  const exec = (cmd, val = null) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
    onInput()
  }

  const insertColor = (hex) => {
    editorRef.current?.focus()
    document.execCommand("foreColor", false, hex)
    onInput()
  }

  const insertInlineCode = () => {
    editorRef.current?.focus()
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)
    const selText = range.toString() || "código"
    range.deleteContents()
    const code = document.createElement("code")
    code.textContent = selText
    range.insertNode(code)
    sel.collapse(code, 1)
    onInput()
  }

  const insertCodeBlock = () => {
    editorRef.current?.focus()
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)
    const selText = range.toString()
    range.deleteContents()
    const pre = document.createElement("pre")
    const code = document.createElement("code")
    code.textContent = selText || "código aquí"
    pre.appendChild(code)
    range.insertNode(pre)
    const r2 = document.createRange()
    r2.selectNodeContents(code)
    sel.removeAllRanges()
    sel.addRange(r2)
    onInput()
  }

  const Btn = ({ onClick, title, children }) => {
    const [hov, setHov] = useState(false)
    return (
      <button
        onMouseDown={e => { e.preventDefault(); onClick() }}
        title={title}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          minWidth: 28, height: 26, padding: "0 5px", border: "none", borderRadius: 5,
          background: hov ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--texto-secundario)", fontSize: 13, transition: "background 0.1s", flexShrink: 0,
        }}
      >{children}</button>
    )
  }

  const Sep = () => (
    <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.10)", margin: "0 2px", flexShrink: 0 }} />
  )

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
      padding: "5px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)",
      background: "rgba(0,0,0,0.25)", flexShrink: 0,
    }}>
      <Btn onClick={() => exec("formatBlock", "H1")} title="Título 1">
        <span style={{ fontWeight: 700, fontSize: 11 }}>H1</span>
      </Btn>
      <Btn onClick={() => exec("formatBlock", "H2")} title="Título 2">
        <span style={{ fontWeight: 700, fontSize: 10 }}>H2</span>
      </Btn>
      <Btn onClick={() => exec("formatBlock", "H3")} title="Título 3">
        <span style={{ fontWeight: 700, fontSize: 9 }}>H3</span>
      </Btn>
      <Btn onClick={() => exec("formatBlock", "P")} title="Párrafo normal">
        <span style={{ fontSize: 11 }}>¶</span>
      </Btn>
      <Sep />
      <Btn onClick={() => exec("bold")} title="Negrita (Ctrl+B)">
        <strong style={{ fontSize: 12 }}>B</strong>
      </Btn>
      <Btn onClick={() => exec("italic")} title="Cursiva (Ctrl+I)">
        <em style={{ fontSize: 12 }}>I</em>
      </Btn>
      <Btn onClick={() => exec("underline")} title="Subrayado (Ctrl+U)">
        <span style={{ textDecoration: "underline", fontSize: 12 }}>U</span>
      </Btn>
      <Btn onClick={() => exec("strikeThrough")} title="Tachado">
        <span style={{ textDecoration: "line-through", fontSize: 12 }}>S</span>
      </Btn>
      <Btn onClick={insertInlineCode} title="Código en línea">
        <span style={{ fontFamily: "monospace", fontSize: 11 }}>`x`</span>
      </Btn>
      <Sep />
      <Btn onClick={() => exec("insertUnorderedList")} title="Lista con viñetas">
        <span style={{ fontSize: 13 }}>•</span>&thinsp;≡
      </Btn>
      <Btn onClick={() => exec("insertOrderedList")} title="Lista numerada">
        <span style={{ fontSize: 11 }}>1.</span>
      </Btn>
      <Sep />
      <Btn onClick={insertCodeBlock} title="Bloque de código">{"</>"}</Btn>
      <Btn onClick={() => exec("insertHorizontalRule")} title="Separador horizontal">
        <span style={{ letterSpacing: -1 }}>—</span>
      </Btn>
      <Sep />
      <span style={{ fontSize: 10, color: "var(--texto-apagado)", marginLeft: 2, flexShrink: 0 }}>Color:</span>
      {COLORES.map(c => (
        <button
          key={c.hex}
          onMouseDown={e => { e.preventDefault(); insertColor(c.hex) }}
          title={c.label}
          style={{
            width: 15, height: 15, borderRadius: "50%", background: c.hex,
            border: "1.5px solid rgba(255,255,255,0.18)", cursor: "pointer",
            flexShrink: 0, padding: 0,
          }}
        />
      ))}
    </div>
  )
}

// ─── Componente principal ───
export default function EditorContenido() {
  const [modo, setModo]       = useState("ataque")
  const [nivel, setNivel]     = useState(1)
  const [seccion, setSeccion] = useState("introduccion")

  const [contenido, setContenido] = useState("")
  const [original, setOriginal]   = useState("")
  const [esOverride, setEsOverride] = useState(false)
  const [editando, setEditando]   = useState(false)

  const [overrides, setOverrides]       = useState(new Set())
  const [conContenido, setConContenido] = useState(new Set())

  const [cargandoSec, setCargandoSec] = useState(false)
  const [guardando, setGuardando]     = useState(false)
  const [msg, setMsg] = useState(null)

  // WYSIWYG refs
  const editorRef    = useRef(null)
  const contenidoRef = useRef(contenido)
  useEffect(() => { contenidoRef.current = contenido }, [contenido])

  // Altura dinámica — rellena hasta el borde inferior
  const splitRef = useRef(null)
  const [editorH, setEditorH] = useState("calc(100vh - 300px)")
  useEffect(() => {
    const calc = () => {
      if (splitRef.current) {
        const top = splitRef.current.getBoundingClientRect().top
        setEditorH(`${Math.max(420, window.innerHeight - top - 16)}px`)
      }
    }
    calc()
    window.addEventListener("resize", calc)
    return () => window.removeEventListener("resize", calc)
  }, [editando])

  // Inicializa el contenteditable cuando se abre el modo edición
  useEffect(() => {
    if (editando && editorRef.current) {
      editorRef.current.innerHTML = marked.parse(contenidoRef.current || "")
    }
  }, [editando]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      setContenido(htmlToMarkdown(editorRef.current.innerHTML))
    }
  }, [])

  const carpeta = modo
  const aviso   = (texto, tipo = "ok") => { setMsg({ texto, tipo }); setTimeout(() => setMsg(null), 4000) }

  const cargarEstado = useCallback(async () => {
    let ovs = new Set()
    try {
      const r = await fetch(`${API_URL}/contenido-informativo/${carpeta}/${nivel}`, { headers: getAuthHeaders() })
      if (r.ok) ovs = new Set((await r.json()).overrides || [])
    } catch { /* noop */ }
    const checks = await Promise.all(SECCIONES.map(async s => {
      try { const h = await fetch(`/contenidos/${carpeta}/nivel${nivel}/${s.id}.md`, { method: "HEAD", cache: "no-store" }); return h.ok } catch { return false }
    }))
    const conCont = new Set()
    SECCIONES.forEach((s, i) => { if (ovs.has(s.id) || checks[i]) conCont.add(s.id) })
    setOverrides(ovs); setConContenido(conCont)
  }, [carpeta, nivel])

  const cargarSeccion = useCallback(async () => {
    setCargandoSec(true)
    let texto = "", override = false
    try {
      const r = await fetch(`${API_URL}/contenido-informativo/${carpeta}/${nivel}/${seccion}`, { headers: getAuthHeaders() })
      if (r.ok) {
        const d = await r.json()
        if (d?.origen === "db" && d.contenido != null) { texto = d.contenido; override = true }
      }
    } catch { /* noop */ }
    if (!override) {
      try {
        const res = await fetch(`/contenidos/${carpeta}/nivel${nivel}/${seccion}.md`, { cache: "no-store" })
        texto = res.ok ? await res.text() : ""
      } catch { texto = "" }
    }
    setContenido(texto); setOriginal(texto); setEsOverride(override); setCargandoSec(false)
  }, [carpeta, nivel, seccion])

  useEffect(() => { cargarEstado() }, [cargarEstado])
  useEffect(() => { if (!editando) cargarSeccion() }, [cargarSeccion]) // eslint-disable-line

  const guardar = async () => {
    setGuardando(true)
    try {
      const r = await fetch(`${API_URL}/contenido-informativo/${carpeta}/${nivel}/${seccion}`, {
        method: "PUT", headers: getAuthHeaders(), body: JSON.stringify({ contenido }),
      })
      if (r.ok) {
        aviso("Contenido guardado. Los estudiantes ya lo verán.")
        setEditando(false); setOriginal(contenido); setEsOverride(true); cargarEstado()
      } else {
        const d = await r.json(); aviso(d?.detail || "No se pudo guardar", "error")
      }
    } catch { aviso("No se pudo conectar con el backend", "error") }
    finally { setGuardando(false) }
  }

  const restaurar = async () => {
    if (!esOverride) return
    setGuardando(true)
    try {
      const r = await fetch(`${API_URL}/contenido-informativo/${carpeta}/${nivel}/${seccion}`, {
        method: "DELETE", headers: getAuthHeaders(),
      })
      if (r.ok) { aviso("Restaurado al contenido original."); setEditando(false); await cargarEstado(); await cargarSeccion() }
      else aviso("No se pudo restaurar", "error")
    } catch { aviso("No se pudo conectar", "error") }
    finally { setGuardando(false) }
  }

  const cambiar = (fn) => { setEditando(false); fn() }
  const tituloSec = SECCIONES.find(s => s.id === seccion)?.titulo || seccion

  return (
    <div className="card-mock" style={{ padding: "20px 22px" }}>
      {/* Modo */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[
          { id: "ataque",  label: "⚔ Ataque",  color: "#6db8ff", bg: "rgba(41,151,255,0.16)", bd: "rgba(41,151,255,0.40)" },
          { id: "defensa", label: "🛡 Defensa", color: "#00daf3", bg: "rgba(0,218,243,0.16)",  bd: "rgba(0,218,243,0.40)" },
        ].map(m => (
          <button key={m.id} onClick={() => cambiar(() => setModo(m.id))} style={{
            padding: "8px 18px", borderRadius: 980, fontSize: 13, fontWeight: 700, cursor: "pointer",
            border: `1px solid ${modo === m.id ? m.bd : "rgba(255,255,255,0.10)"}`,
            background: modo === m.id ? m.bg : "rgba(255,255,255,0.05)",
            color: modo === m.id ? m.color : "var(--texto-secundario)",
          }}>{m.label}</button>
        ))}
      </div>

      {/* Niveles */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {NIVELES.map(n => (
          <button key={n} onClick={() => cambiar(() => { setNivel(n); setSeccion("introduccion") })} style={{
            padding: "7px 13px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
            border: `1px solid ${nivel === n ? "rgba(41,151,255,0.40)" : "rgba(255,255,255,0.10)"}`,
            background: nivel === n ? "rgba(41,151,255,0.14)" : "rgba(255,255,255,0.04)",
            color: nivel === n ? "#6db8ff" : "var(--texto-secundario)",
          }}>Nivel {n}</button>
        ))}
      </div>

      {msg && (
        <div style={{
          padding: "9px 14px", borderRadius: 10, fontSize: 13, marginBottom: 12,
          background: msg.tipo === "error" ? "rgba(255,69,58,0.10)" : "rgba(48,209,88,0.10)",
          border: `1px solid ${msg.tipo === "error" ? "rgba(255,69,58,0.30)" : "rgba(48,209,88,0.30)"}`,
          color: msg.tipo === "error" ? "#ff7a6e" : "#86efac",
        }}>{msg.texto}</div>
      )}

      {/* Grid principal: sidebar 220px + editor */}
      <div ref={splitRef} style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 14, height: editorH }}>

        {/* Sidebar de secciones */}
        <div style={{ display: "flex", flexDirection: "column", overflowY: "auto", minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10, fontWeight: 800,
            letterSpacing: "0.08em", textTransform: "uppercase",
            color: "var(--texto-apagado)", marginBottom: 8,
          }}>Sección · Nivel {nivel}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {SECCIONES.map(s => {
              const activo  = seccion === s.id
              const tiene   = conContenido.has(s.id)
              const editado = overrides.has(s.id)
              return (
                <button key={s.id} onClick={() => cambiar(() => setSeccion(s.id))} style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "8px 11px", borderRadius: 9, cursor: "pointer", textAlign: "left",
                  border: `1px solid ${activo ? "rgba(41,151,255,0.30)" : "transparent"}`,
                  background: activo ? "rgba(41,151,255,0.10)" : "transparent",
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                    background: tiene ? "#30d158" : "rgba(255,255,255,0.14)",
                    boxShadow: tiene ? "0 0 5px rgba(48,209,88,0.5)" : "none",
                  }} />
                  <span style={{
                    flex: 1, fontSize: 12.5, fontWeight: 600,
                    color: tiene ? (activo ? "#fff" : "var(--texto)") : "var(--texto-apagado)",
                  }}>{s.titulo}</span>
                  {editado && (
                    <span style={{
                      fontFamily: "var(--mono)", fontSize: 8, fontWeight: 800, color: "#ffc107",
                      background: "rgba(255,200,0,0.10)", border: "1px solid rgba(255,200,0,0.25)",
                      borderRadius: 4, padding: "1px 4px",
                    }}>EDITADO</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Panel del editor */}
        <div style={{
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14, overflow: "hidden",
          display: "flex", flexDirection: "column", minWidth: 0, height: "100%",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "11px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.07)", flexWrap: "wrap", flexShrink: 0,
          }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>
              <span style={{ color: "var(--primario-dim)" }}>Nivel {nivel}</span>
              <span style={{ color: "var(--texto-apagado)", margin: "0 5px", fontWeight: 400 }}>›</span>
              {tituloSec}
            </div>
            {esOverride && (
              <span style={{
                fontFamily: "var(--mono)", fontSize: 9, fontWeight: 800, color: "#ffc107",
                background: "rgba(255,200,0,0.10)", border: "1px solid rgba(255,200,0,0.25)",
                borderRadius: 5, padding: "2px 6px",
              }}>EDITADO</span>
            )}
            <span style={{
              fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--texto-apagado)",
              background: "rgba(0,0,0,0.30)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 6, padding: "3px 9px",
            }}>
              {carpeta}/nivel{nivel}/{seccion}.md
            </span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 7 }}>
              {!editando ? (
                <button onClick={() => setEditando(true)} style={btnPri}>✎ Editar</button>
              ) : (
                <>
                  {esOverride && <button onClick={restaurar} disabled={guardando} style={btnDanger}>↺ Restaurar</button>}
                  <button onClick={() => setEditando(false)} style={btnSec}>Cancelar</button>
                  <button onClick={guardar} disabled={guardando} style={btnVerde}>{guardando ? "Guardando…" : "✓ Guardar"}</button>
                </>
              )}
            </div>
          </div>

          {/* Cuerpo */}
          {cargandoSec ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--texto-apagado)", flex: 1 }}>Cargando…</div>
          ) : !editando ? (
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              {contenido.trim()
                ? <div className="markdown-contenido" dangerouslySetInnerHTML={{ __html: marked.parse(contenido) }} />
                : <div style={{ color: "var(--texto-apagado)", fontSize: 14 }}>
                    Esta sección está vacía. Pulsa <strong>Editar</strong> para crear su contenido.
                  </div>
              }
            </div>
          ) : (
            /* ── Modo edición: WYSIWYG izq | Preview der ── */
            <div style={{
              flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr",
              minHeight: 0, width: "100%",
            }}>
              {/* Izquierda: WYSIWYG (sin símbolos markdown) */}
              <div style={{
                display: "flex", flexDirection: "column",
                minHeight: 0, minWidth: 0, overflow: "hidden",
                borderRight: "1px solid rgba(255,255,255,0.07)",
              }}>
                <div style={cabPane}>Editor</div>
                <ToolbarRich editorRef={editorRef} onInput={handleEditorInput} />
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleEditorInput}
                  className="markdown-contenido wysiwyg-editor"
                  style={{ flex: 1, overflowY: "auto", padding: "16px 18px", outline: "none", cursor: "text" }}
                />
              </div>

              {/* Derecha: preview en markdown renderizado */}
              <div style={{
                display: "flex", flexDirection: "column",
                minHeight: 0, minWidth: 0, overflow: "hidden",
              }}>
                <div style={cabPane}>Vista previa</div>
                <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
                  <div
                    className="markdown-contenido"
                    dangerouslySetInnerHTML={{ __html: marked.parse(contenido || "*(vacío)*") }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const btnBase   = { padding: "7px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }
const btnPri    = { ...btnBase, border: "none", background: "linear-gradient(135deg,#2997ff,#5e5ce6)", color: "#fff" }
const btnSec    = { ...btnBase, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--texto-secundario)" }
const btnVerde  = { ...btnBase, border: "none", background: "#30d158", color: "#04210d" }
const btnDanger = { ...btnBase, background: "rgba(255,69,58,0.10)", border: "1px solid rgba(255,69,58,0.28)", color: "#ff7a6e" }
const cabPane   = {
  fontFamily: "var(--mono)", fontSize: 10, fontWeight: 800,
  letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--texto-apagado)",
  padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
}
