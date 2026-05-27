"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import GuardSesion from "../componentes/GuardSesion"
import SidebarNav from "../componentes/SidebarNav"

const SECCIONES = [
  { id:"introduccion",   titulo:"Introducción" },
  { id:"objetivos",      titulo:"Objetivos del nivel" },
  { id:"fundamentos",    titulo:"Fundamentos teóricos" },
  { id:"metodologia",    titulo:"Metodología de trabajo" },
  { id:"comandos",       titulo:"Comandos y explicación" },
  { id:"evidencia",      titulo:"Evidencia y análisis" },
  { id:"procedimiento",  titulo:"Procedimiento guiado" },
  { id:"errores",        titulo:"Errores comunes" },
  { id:"buenas_practicas",titulo:"Buenas prácticas" },
  { id:"criterio",       titulo:"Criterio de aprobación" },
]

const NIVELES = [1,2,3,4,5,6,7]

export default function AdminContenido() {
  const router = useRouter()
  const [nombreUsuario, setNombreUsuario] = useState("")
  const [rolUsuario,    setRolUsuario]    = useState("")

  const [tab, setTab]     = useState("contenido") // "contenido" | "ejercicios"
  const [mensaje, setMensaje] = useState("")
  const [tipo_msg, setTipoMsg] = useState("ok") // "ok" | "error"
  const [cargando, setCargando] = useState(false)

  // ── Contenido ────────────────────────────────────────────────────────────────
  const [nivelSel,   setNivelSel]   = useState(1)
  const [seccionSel, setSeccionSel] = useState("introduccion")
  const [contenido,  setContenido]  = useState("")
  const [editando,   setEditando]   = useState(false)

  // ── Ejercicios ───────────────────────────────────────────────────────────────
  const [estructura,   setEstructura]   = useState([])
  const [formEj, setFormEj] = useState({ descripcion:"", tipo:"ataque", comandos_objetivo:10, tiempo_limite_seg:300, leccion_id:"" })

  useEffect(() => {
    const u = localStorage.getItem("nombre_usuario") || ""
    const r = localStorage.getItem("rol_usuario")    || ""
    if (!u || r !== "admin") { router.push("/inicio"); return }
    setNombreUsuario(u); setRolUsuario(r)
    cargarEstructura()
  }, [router])

  useEffect(() => {
    if (!editando) cargarContenido()
  }, [nivelSel, seccionSel])

  const mostrarMsg = (txt, tipo="ok") => {
    setMensaje(txt); setTipoMsg(tipo)
    setTimeout(()=>setMensaje(""), 4000)
  }

  const cargarContenido = async () => {
    const ruta = `/contenidos/informacion/nivel${nivelSel}/${seccionSel}.md`
    try {
      const r = await fetch(ruta, { cache:"no-store" })
      if (r.ok) setContenido(await r.text())
      else setContenido(`# Contenido no encontrado\n\nArchivo esperado: public${ruta}\n\nCrea el archivo .md para editarlo aquí.`)
    } catch { setContenido("Error al cargar el contenido.") }
  }

  const guardarContenido = async () => {
    // Guardar via API del backend si existe, si no, mostrar instrucción
    setCargando(true)
    try {
      const r = await fetch("http://127.0.0.1:8000/admin/contenido/guardar", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ nombre_usuario:nombreUsuario, nivel:nivelSel,
                               seccion:seccionSel, contenido })
      })
      if (r.ok) {
        mostrarMsg("Contenido guardado correctamente.")
        setEditando(false)
      } else {
        // Fallback: copiar instrucción
        mostrarMsg(`Guarda manualmente en: frontend/public/contenidos/informacion/nivel${nivelSel}/${seccionSel}.md`, "error")
      }
    } catch {
      mostrarMsg(`El endpoint de guardado no está disponible. Guarda manualmente en:\nfrontend/public/contenidos/informacion/nivel${nivelSel}/${seccionSel}.md`, "error")
    } finally { setCargando(false) }
  }

  const cargarEstructura = async () => {
    try {
      const r = await fetch("http://127.0.0.1:8000/contenido/estructura")
      if (r.ok) { const d = await r.json(); setEstructura(d?.cursos||[]) }
    } catch {}
  }

  const crearEjercicio = async (e) => {
    e.preventDefault()
    if (!formEj.leccion_id) { mostrarMsg("Selecciona una lección","error"); return }
    setCargando(true)
    try {
      const r = await fetch("http://127.0.0.1:8000/admin/ejercicio", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ nombre_usuario:nombreUsuario, ...formEj,
                               leccion_id:Number(formEj.leccion_id),
                               comandos_objetivo:Number(formEj.comandos_objetivo),
                               tiempo_limite_seg:Number(formEj.tiempo_limite_seg) })
      })
      const d = await r.json()
      if (r.ok) { mostrarMsg(d?.mensaje||"Ejercicio creado"); await cargarEstructura() }
      else mostrarMsg(d?.detail||"Error","error")
    } catch { mostrarMsg("No se pudo conectar","error") }
    finally { setCargando(false) }
  }

  // ── Lecciones planas para el select ──────────────────────────────────────────
  const leccionesPlanas = []
  estructura.forEach(curso => {
    curso.capitulos?.forEach(cap => {
      cap.lecciones?.forEach(lec => {
        leccionesPlanas.push({ id:lec.id, titulo:`Cap. ${cap.titulo} › ${lec.titulo}` })
      })
    })
  })

  return (
    <GuardSesion>
      <div className="app-layout">
        <SidebarNav paginaActiva="admin" />
        <main className="app-main">
          <div className="statusbar">
            <span className="statusbar-chip">⚙ Administración de contenido</span>
            <span className="statusbar-chip statusbar-user">▸ {nombreUsuario} [admin]</span>
          </div>

          <div className="panel-tabs">
            <button className={`panel-tab ${tab==="contenido"?"panel-tab-activo":""}`} onClick={()=>setTab("contenido")}>
              📝 Contenido informativo
            </button>
            <button className={`panel-tab ${tab==="ejercicios"?"panel-tab-activo":""}`} onClick={()=>setTab("ejercicios")}>
              🎯 Ejercicios
            </button>
          </div>

          {mensaje && (
            <div className={`panel-mensaje ${tipo_msg==="error"?"panel-mensaje-error":""}`}>
              {mensaje}
            </div>
          )}

          {/* ── TAB CONTENIDO ── */}
          {tab==="contenido" && (
            <div className="admin-layout">
              {/* Selector nivel + sección */}
              <div className="admin-sidebar">
                <div className="lab-card">
                  <div className="lab-card-header"><span className="lab-card-title">Nivel</span></div>
                  <div className="admin-lista">
                    {NIVELES.map(n=>(
                      <button key={n}
                        className={`admin-item ${nivelSel===n?"admin-item-activo":""}`}
                        onClick={()=>{setNivelSel(n);setEditando(false)}}>
                        Nivel {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="lab-card" style={{marginTop:12}}>
                  <div className="lab-card-header"><span className="lab-card-title">Sección</span></div>
                  <div className="admin-lista">
                    {SECCIONES.map(s=>(
                      <button key={s.id}
                        className={`admin-item ${seccionSel===s.id?"admin-item-activo":""}`}
                        onClick={()=>{setSeccionSel(s.id);setEditando(false)}}>
                        {s.titulo}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Editor */}
              <div className="admin-editor">
                <div className="lab-card" style={{flex:1}}>
                  <div className="lab-card-header">
                    <span className="lab-card-title">
                      Nivel {nivelSel} › {SECCIONES.find(s=>s.id===seccionSel)?.titulo}
                    </span>
                    <div style={{display:"flex",gap:8}}>
                      {!editando && (
                        <button className="btn-admin-edit" onClick={()=>setEditando(true)}>✏ Editar</button>
                      )}
                      {editando && (
                        <>
                          <button className="btn-admin-cancel" onClick={()=>{setEditando(false);cargarContenido()}}>Cancelar</button>
                          <button className="btn-admin-save" onClick={guardarContenido} disabled={cargando}>
                            {cargando?"Guardando...":"💾 Guardar"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {!editando ? (
                    <div>
                      <div className="admin-ruta">
                        📁 frontend/public/contenidos/informacion/nivel{nivelSel}/{seccionSel}.md
                      </div>
                      <pre className="admin-preview">{contenido}</pre>
                    </div>
                  ) : (
                    <div>
                      <div className="admin-ruta">✏ Editando — formato Markdown</div>
                      <textarea
                        className="admin-textarea"
                        value={contenido}
                        onChange={e=>setContenido(e.target.value)}
                        spellCheck={false}
                      />
                      <div className="admin-nota">
                        💡 El contenido se guarda en formato Markdown (.md). Si el endpoint de guardado no está disponible,
                        copia el texto y guárdalo manualmente en la ruta indicada.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB EJERCICIOS ── */}
          {tab==="ejercicios" && (
            <div className="panel-dos-col">
              {/* Crear ejercicio */}
              <div className="lab-card">
                <div className="lab-card-header"><span className="lab-card-title">Crear ejercicio</span></div>
                <form onSubmit={crearEjercicio} style={{display:"grid",gap:10}}>
                  <label className="admin-label">Lección asociada</label>
                  <select className="campo-inicio" value={formEj.leccion_id}
                    onChange={e=>setFormEj(p=>({...p,leccion_id:e.target.value}))}>
                    <option value="">— Selecciona una lección —</option>
                    {leccionesPlanas.map(l=><option key={l.id} value={l.id}>{l.titulo}</option>)}
                  </select>

                  <label className="admin-label">Descripción del ejercicio</label>
                  <textarea className="campo-inicio" style={{minHeight:70,paddingTop:10}}
                    value={formEj.descripcion}
                    onChange={e=>setFormEj(p=>({...p,descripcion:e.target.value}))}
                    placeholder="Ej: Analiza las alertas y bloquea la IP atacante"/>

                  <label className="admin-label">Tipo</label>
                  <select className="campo-inicio" value={formEj.tipo}
                    onChange={e=>setFormEj(p=>({...p,tipo:e.target.value}))}>
                    <option value="ataque">ataque (Fuerza Bruta)</option>
                    <option value="defensa">defensa (Escaneo de Puertos)</option>
                  </select>

                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <div>
                      <label className="admin-label">Comandos objetivo</label>
                      <input className="campo-inicio" type="number" min={1} max={50}
                        value={formEj.comandos_objetivo}
                        onChange={e=>setFormEj(p=>({...p,comandos_objetivo:e.target.value}))}/>
                    </div>
                    <div>
                      <label className="admin-label">Tiempo límite (seg)</label>
                      <input className="campo-inicio" type="number" min={60} max={3600}
                        value={formEj.tiempo_limite_seg}
                        onChange={e=>setFormEj(p=>({...p,tiempo_limite_seg:e.target.value}))}/>
                    </div>
                  </div>

                  <button className="boton-principal" type="submit" disabled={cargando}>
                    {cargando?"Creando...":"Crear ejercicio"}
                  </button>
                </form>
              </div>

              {/* Estructura actual */}
              <div className="lab-card">
                <div className="lab-card-header">
                  <span className="lab-card-title">Estructura actual</span>
                  <button className="btn-admin-edit" onClick={cargarEstructura}>↺ Actualizar</button>
                </div>
                <div style={{maxHeight:500,overflowY:"auto"}}>
                  {estructura.map(curso=>(
                    <div key={curso.id} className="est-curso">
                      <div className="est-curso-titulo">📚 {curso.titulo}</div>
                      {curso.capitulos?.map(cap=>(
                        <div key={cap.id} className="est-cap">
                          <div className="est-cap-titulo">📂 {cap.titulo}</div>
                          {cap.lecciones?.map(lec=>(
                            <div key={lec.id} className="est-lec">
                              <span className="est-lec-titulo">📄 {lec.titulo}</span>
                              {lec.ejercicios?.length>0 && (
                                <div className="est-ejs">
                                  {lec.ejercicios.map(ej=>(
                                    <div key={ej.id} className="est-ej">
                                      🎯 #{ej.id} — {ej.descripcion} <span className="est-ej-tipo">[{ej.tipo}]</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                  {estructura.length===0&&<div className="panel-vacio">Sin contenido cargado.</div>}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </GuardSesion>
  )
}