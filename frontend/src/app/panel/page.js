"use client"

// =============================================================================
// PÁGINA: /panel — Panel de gestión (docente / admin)
// -----------------------------------------------------------------------------
// Centro de administración del curso. Organizado en pestañas:
//   • "Estudiantes": lista de perfiles; al abrir uno, se ven sus entregas e
//     intentos por nivel y se pueden EVALUAR (poner nota y comentarios).
//   • "Ejercicios": crear (con asistencia de IA), listar, publicar/ocultar y
//     eliminar ejercicios, y revisar sus entregas.
//   • "Contenido": editor de los módulos teóricos (componente EditorContenido).
//   • "Usuarios" (solo admin): crear/eliminar cuentas y cambiar roles.
// Protegida por <GuardSesion> y por un chequeo de rol (solo docente/admin).
// =============================================================================

import { useEffect, useState, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import GuardSesion from "../componentes/GuardSesion"
import BarraSuperior from "../componentes/BarraSuperior"
import ModalEntrega, { BadgeCierre, BarraResultado, fmtDur } from "../componentes/ModalEntrega"
import EditorContenido from "../componentes/EditorContenido" // editor del contenido teórico

// URL base del backend (variable de entorno o servidor de producción).
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://cyberlabavance-production.up.railway.app"

// Nombres de los niveles según el tipo de ejercicio (coinciden con los dashboards)
// Se usan en el formulario de creación para mostrar el nombre del nivel elegido.
const NOMBRES_NIVELES_FORM = {
  ataque: {
    1: "Fundamentos", 2: "Reconocimiento", 3: "Enumeración", 4: "Explotación",
    5: "Post-explotación", 6: "Avanzado", 7: "Operación completa",
  },
  defensa: {
    1: "Monitoreo Básico", 2: "Detección de Fuerza Bruta", 3: "Escaneo — Defensa",
    4: "Investigación de Incidentes", 5: "Respuesta Activa", 6: "Multi-vector", 7: "Defensa Integral",
  },
}

// Cabeceras HTTP con el token de sesión para las peticiones autenticadas.
const getAuthHeaders = () => ({
  "Authorization": `Bearer ${sessionStorage.getItem("token") || ""}`,
  "Content-Type": "application/json"
})

// Normaliza el error que devuelve el backend (string, lista de validación u
// objeto) a un texto legible para mostrar al usuario.
function extraerError(data) {
  if (!data) return "Error inesperado"
  const d = data.detail ?? data
  if (typeof d === "string") return d
  if (Array.isArray(d)) return d.map(x => x?.msg || JSON.stringify(x)).filter(Boolean).join(" | ")
  if (typeof d === "object") return d.msg || JSON.stringify(d)
  return String(d)
}

// Formatea una fecha ISO a fecha+hora legible (es-CL); "—" si no hay valor.
const formatFecha = (str) => {
  if (!str) return "—"
  try {
    const d = new Date(str)
    return d.toLocaleString("es-CL", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    })
  } catch { return str }
}


// Nombres de los niveles tal como se muestran en el detalle del estudiante.
const NOMBRES_NIVELES_PANEL = {
  1: "Fuerza Bruta — Fundamentos",
  2: "Escaneo de Puertos",
  3: "Enumeración de Servicios",
  4: "Superficie de Ataque",
  5: "Fuerza Bruta Avanzada",
  6: "Ataque Multi-Etapa",
  7: "Operación Completa",
}

// Deriva el nivel (1–7) de un intento de terminal a partir de su id (bloques de 5).
const nivelDeEj = (ej_id) => ej_id ? Math.ceil(ej_id / 5) : 1

const TODOS_LOS_NIVELES = [1, 2, 3, 4, 5, 6, 7]

// Componente: detalle de un estudiante con sus intentos y entregas en un
// acordeón por nivel. Muestra nota general, mini-stats y permite evaluar cada
// entrega/intento mediante los callbacks recibidos.
function PanelPerfilNiveles({ nombreEstudiante, intentos, entregas, cargando, ordenDesc, setOrdenDesc, onVolver, onEvaluar, onEvaluarEntrega }) {
  const [nivelAbierto, setNivelAbierto] = useState(null) // nivel expandido en el acordeón

  // Unificar intentos (terminal) y entregas (docente) por nivel
  // porNivel = { nivel: { intentos: [...], entregas: [...] } } para los 7 niveles.
  const porNivel = {}
  TODOS_LOS_NIVELES.forEach(n => { porNivel[n] = { intentos: [], entregas: [] } })
  intentos.forEach(it => {
    const n = nivelDeEj(it.ejercicio_id)
    if (!porNivel[n]) porNivel[n] = { intentos: [], entregas: [] }
    porNivel[n].intentos.push(it)
  })
  entregas.forEach(en => {
    const n = en.nivel || 1
    if (!porNivel[n]) porNivel[n] = { intentos: [], entregas: [] }
    porNivel[n].entregas.push(en)
  })

  // Ordena una lista por fecha, según el sentido elegido (descendente/ascendente).
  const ordenar = (lista, campoFecha) => [...lista].sort((a, b) => {
    const da = new Date(a[campoFecha] || 0)
    const db = new Date(b[campoFecha] || 0)
    return ordenDesc ? db - da : da - db
  })

  // Nota general: promedio de todas las notas del alumno
  const notaGeneral = (() => {
    const todasLasNotas = [
      ...intentos.filter(it => it.nota != null).map(it => it.nota),
      ...entregas.filter(en => en.nota != null).map(en => en.nota),
    ]
    if (!todasLasNotas.length) return null
    return (todasLasNotas.reduce((s, n) => s + n, 0) / todasLasNotas.length).toFixed(1)
  })()

  // Mini-stats del alumno: resultado medio de sus entregas y pendientes de evaluar
  const resultadosFinales = entregas.map(en => en.resumen?.porcentaje_final).filter(v => v != null)
  const resultadoMedio = resultadosFinales.length
    ? Math.round(resultadosFinales.reduce((s, v) => s + v, 0) / resultadosFinales.length)
    : null
  const sinEvaluar = entregas.filter(en => en.estado !== "evaluado").length // entregas pendientes de nota

  return (
    <div className="panel-body">
      <div className="perfil-detalle-header">
        <button className="btn-volver" onClick={onVolver}>← Volver</button>
        <div style={{ flex:1 }}>
          <div className="perfil-detalle-nombre">{nombreEstudiante}</div>
          <div className="perfil-detalle-sub">
            {entregas.length} entregas · 7 niveles
          </div>
        </div>
        {/* Nota general + mini-stats del alumno */}
        {notaGeneral !== null && (
          <div style={{ textAlign:"center", marginRight:4 }}>
            <div style={{
              fontSize:28, fontWeight:900, fontFamily:"var(--mono)",
              color: notaGeneral >= 4 ? "var(--terciario-dim)" : "#ffb4ab",
              lineHeight:1
            }}>{notaGeneral}</div>
            <div style={{ fontSize:10, color:"var(--texto-apagado)", marginTop:2 }}>nota general</div>
          </div>
        )}
        {resultadoMedio !== null && (
          <div style={{
            textAlign:"center", padding:"7px 14px", marginRight:4,
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10,
          }}>
            <div style={{
              fontSize:14, fontWeight:900, fontFamily:"var(--mono)", lineHeight:1.2,
              color: resultadoMedio >= 70 ? "#30d158" : resultadoMedio >= 40 ? "#f59e0b" : "#ff7a6e",
            }}>{resultadoMedio}%</div>
            <div style={{ fontSize:9, color:"var(--texto-apagado)", textTransform:"uppercase", letterSpacing:"0.05em" }}>result. medio</div>
          </div>
        )}
        {sinEvaluar > 0 && (
          <div style={{
            textAlign:"center", padding:"7px 14px", marginRight:8,
            background:"rgba(255,200,0,0.07)", border:"1px solid rgba(255,200,0,0.22)", borderRadius:10,
          }}>
            <div style={{ fontSize:14, fontWeight:900, fontFamily:"var(--mono)", color:"#ffc107", lineHeight:1.2 }}>{sinEvaluar}</div>
            <div style={{ fontSize:9, color:"var(--texto-apagado)", textTransform:"uppercase", letterSpacing:"0.05em" }}>sin evaluar</div>
          </div>
        )}
        <button
          onClick={() => setOrdenDesc(v => !v)}
          style={{
            padding:"6px 12px",
            background:"rgba(255,255,255,0.06)",
            border:"1px solid rgba(255,255,255,0.10)",
            borderRadius:8, color:"var(--texto-secundario)",
            fontSize:12, fontWeight:700, cursor:"pointer"
          }}
        >
          {ordenDesc ? "↓ Más reciente primero" : "↑ Más antiguo primero"}
        </button>
      </div>

      {cargando && <div className="panel-cargando">Cargando...</div>}

      {/* Acordeón — siempre los 7 niveles (los vacíos aparecen atenuados) */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {TODOS_LOS_NIVELES.map(n => {
          const { intentos: listInt, entregas: listEnt } = porNivel[n]
          const total   = listInt.length + listEnt.length // total de elementos del nivel
          const eval_   = listInt.filter(it => it.tiene_evaluacion).length + listEnt.filter(en => en.nota != null).length // cuántos ya evaluados
          const vacio   = total === 0     // ¿el nivel no tiene nada?
          const abierto = nivelAbierto === n // ¿está expandido?

          return (
            <div key={n} style={{
              border:`1px solid ${vacio ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)"}`,
              borderRadius:12, overflow:"hidden",
              background: vacio ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)"
            }}>
              {/* Cabecera nivel */}
              <button
                onClick={() => !vacio && setNivelAbierto(abierto ? null : n)}
                style={{
                  width:"100%", textAlign:"left", background:"none", border:"none",
                  padding:"12px 16px", cursor: vacio ? "default" : "pointer",
                  display:"flex", alignItems:"center", gap:14,
                  borderBottom: abierto ? "1px solid rgba(255,255,255,0.07)" : "none",
                  opacity: vacio ? 0.45 : 1,
                }}
              >
                <div style={{
                  width:32, height:32, borderRadius:8, flexShrink:0,
                  background: vacio ? "rgba(255,255,255,0.04)" : "rgba(41,151,255,0.12)",
                  border:`1px solid ${vacio ? "rgba(255,255,255,0.07)" : "rgba(41,151,255,0.25)"}`,
                  display:"grid", placeItems:"center",
                  fontWeight:900, fontSize:13, fontFamily:"var(--mono)",
                  color: vacio ? "var(--texto-apagado)" : "#6db8ff"
                }}>
                  {n}
                </div>

                <div style={{ flex:1 }}>
                  <div style={{ color: vacio ? "var(--texto-apagado)" : "#fff", fontWeight:700, fontSize:14 }}>
                    Nivel {n} — {NOMBRES_NIVELES_PANEL[n] || ""}
                  </div>
                  <div style={{
                    color:"var(--texto-apagado)", fontSize:11, fontFamily:"var(--mono)", marginTop:2,
                    display:"flex", gap:8, alignItems:"center", flexWrap:"wrap",
                  }}>
                    {vacio ? "Sin entregas" : `${total} entrega${total !== 1 ? "s" : ""}${eval_ > 0 ? ` · ${eval_} evaluados` : ""}`}
                    {/* La cabecera adelanta el estado del nivel sin abrirlo */}
                    {listEnt.length === 1 && listEnt[0].resumen?.cierre && (
                      <BadgeCierre cierre={listEnt[0].resumen.cierre} />
                    )}
                    {listEnt.some(en => en.estado !== "evaluado") && (
                      <span style={{
                        fontSize:9.5, fontWeight:800, color:"#ffc107", letterSpacing:"0.05em",
                        background:"rgba(255,200,0,0.10)", border:"1px solid rgba(255,200,0,0.25)",
                        borderRadius:5, padding:"2px 8px",
                      }}>SIN EVALUAR</span>
                    )}
                    {listEnt.length === 1 && listEnt[0].nota != null && (
                      <span style={{ color:"var(--terciario-dim)", fontWeight:800 }}>nota {listEnt[0].nota}</span>
                    )}
                  </div>
                </div>

                {!vacio && (
                  <span style={{ color:"var(--texto-apagado)", fontSize:14 }}>{abierto ? "▲" : "▼"}</span>
                )}
              </button>

              {/* Contenido del nivel: entregas de ejercicios + intentos de terminal */}
              {abierto && (
                <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:8 }}>

                  {/* Entregas de ejercicios docente — card de desempeño (clic = evaluar) */}
                  {ordenar(listEnt, "fecha_entrega").map(en => (
                    <div key={`ent-${en.id}`}
                      onClick={() => onEvaluarEntrega(en)}
                      style={{
                        background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)",
                        borderRadius:12, padding:"13px 16px", cursor:"pointer",
                        display:"grid", gridTemplateColumns:"1.4fr 1.6fr 0.8fr auto",
                        gap:14, alignItems:"center", transition:"border .15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.border = "1px solid rgba(41,151,255,0.40)"}
                      onMouseLeave={e => e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"}
                    >
                      {/* Ejercicio + cierre */}
                      <div style={{ display:"flex", flexDirection:"column", gap:5, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#fff", display:"flex", gap:7, alignItems:"center", flexWrap:"wrap" }}>
                          {en.numero_ejercicio ? `#${en.numero_ejercicio} · ` : ""}{en.titulo_ejercicio || `Ejercicio #${en.ejercicio_id}`}
                          {en.tipo && (
                            <span style={{
                              fontFamily:"var(--mono)", fontSize:9.5, fontWeight:800, letterSpacing:"0.05em",
                              padding:"2px 8px", borderRadius:5, textTransform:"uppercase",
                              ...(en.tipo === "defensa"
                                ? { background:"rgba(0,218,243,0.10)", color:"var(--terciario)", border:"1px solid rgba(0,218,243,0.25)" }
                                : { background:"rgba(255,69,58,0.10)", color:"#ff7a6e", border:"1px solid rgba(255,69,58,0.25)" }),
                            }}>{en.tipo}</span>
                          )}
                        </div>
                        <div><BadgeCierre cierre={en.resumen?.cierre} /></div>
                        <span style={{ fontSize:10.5, color:"var(--texto-apagado)", fontFamily:"var(--mono)" }}>
                          🕐 {formatFecha(en.fecha_entrega)}
                        </span>
                      </div>

                      {/* Resultado con penalización visible */}
                      <BarraResultado resumen={en.resumen} />

                      {/* Proceso */}
                      <div style={{ display:"flex", flexDirection:"column", gap:4, fontFamily:"var(--mono)", fontSize:11, color:"var(--texto-secundario)" }}>
                        <span>⏱ {fmtDur(en.resumen?.tiempo_seg)}</span>
                        {(en.resumen?.ayudas ?? en.ayudas_pedidas ?? 0) > 0 && (
                          <span style={{ color:"#f59e0b" }}>💡 {en.resumen?.ayudas ?? en.ayudas_pedidas} pista{(en.resumen?.ayudas ?? en.ayudas_pedidas) > 1 ? "s" : ""}</span>
                        )}
                        {en.resumen?.total_fases != null && en.resumen?.total_fases > 0 && (
                          <span style={{ color:"var(--texto-apagado)" }}>
                            fase máx: {en.resumen?.fase_max ?? 0}/{en.resumen?.total_fases}{(en.resumen?.fase_max ?? 0) >= en.resumen?.total_fases ? " 💥" : ""}
                          </span>
                        )}
                      </div>

                      {/* Nota + acción */}
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                        {en.nota != null ? (
                          <span style={{
                            fontSize:16, fontWeight:900, fontFamily:"var(--mono)",
                            color: en.nota >= 4 ? "var(--terciario-dim)" : "#ffb4ab",
                          }}>{en.nota}</span>
                        ) : (
                          <span style={{
                            fontSize:11, fontWeight:800, color:"#ffc107",
                            background:"rgba(255,200,0,0.10)", border:"1px solid rgba(255,200,0,0.25)",
                            borderRadius:6, padding:"3px 9px",
                          }}>Pendiente</span>
                        )}
                        <button
                          className="btn-evaluar"
                          onClick={e => { e.stopPropagation(); onEvaluarEntrega(en) }}
                          disabled={cargando}
                        >
                          {en.nota != null ? "✏ Editar" : "📋 Evaluar"}
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Intentos de ejercicios del terminal (modo libre, sin ejercicio docente) */}
                  {ordenar(listInt, "fecha_inicio").map(it => (
                    <div key={`int-${it.intento_id}`}
                      className={`intento-card ${it.estado==="aprobado"?"intento-aprobado":""}`}
                    >
                      <div className="intento-top">
                        <div className="intento-ej">
                          <span className="intento-ej-id">Terminal #{it.ejercicio_id}</span>
                          <span className="intento-ej-desc">{it.descripcion_ejercicio || "—"}</span>
                          <span style={{ fontSize:11, color:"var(--texto-apagado)", fontFamily:"var(--mono)", marginTop:2, display:"block" }}>
                            🕐 {formatFecha(it.fecha_inicio)}
                          </span>
                        </div>
                        <div className="intento-badges">
                          <span className={`intento-estado ${it.estado==="aprobado"?"est-verde":"est-gris"}`}>{it.estado}</span>
                          <span className="intento-pct">{it.porcentaje}%</span>
                          {it.tiene_evaluacion && it.nota != null && (
                            <span style={{
                              fontSize:14, fontWeight:900,
                              color: it.nota >= 4 ? "var(--terciario-dim)" : "#ffb4ab",
                              background: it.nota >= 4 ? "rgba(0,218,243,0.10)" : "rgba(255,180,171,0.10)",
                              border:`1px solid ${it.nota >= 4 ? "rgba(0,218,243,0.25)" : "rgba(255,180,171,0.25)"}`,
                              padding:"3px 10px", borderRadius:6, fontFamily:"var(--mono)"
                            }}>Nota: {it.nota}</span>
                          )}
                        </div>
                      </div>
                      <div className="intento-meta">
                        <span>⏱ {it.tiempo_seg}s</span>
                        <span>❌ {it.errores} errores</span>
                        {(it.ayudas_pedidas || 0) > 0 && (
                          <span className="intento-ayuda">💡 {it.ayudas_pedidas} ayudas (-{Math.min(it.ayudas_pedidas*5,30)}%)</span>
                        )}
                        {it.tiene_evaluacion && <span className="intento-eval-badge">📋 Evaluado</span>}
                      </div>
                      <button className="btn-evaluar" onClick={() => onEvaluar(it)} disabled={cargando}>
                        {it.tiene_evaluacion ? "✏ Editar evaluación" : "📋 Evaluar"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {cargando && <div className="panel-cargando" style={{ marginTop:8 }}>Cargando entregas...</div>}
      </div>
    </div>
  )
}

export default function PanelDocente() {
  const router = useRouter()
  // --- Sesión y estado general ---
  const [nombreUsuario, setNombreUsuario] = useState("")           // usuario en sesión
  const [rolUsuario,    setRolUsuario]    = useState("")           // docente | admin
  const [tab,           setTab]           = useState("estudiantes") // pestaña activa
  const [intentos,      setIntentos]      = useState([])           // todas las entregas/intentos (vista estudiantes)
  const [usuarios,      setUsuarios]      = useState([])           // lista de usuarios
  const [mensaje,       setMensaje]       = useState("")           // mensaje de estado/error
  const [cargando,      setCargando]      = useState(false)        // indicador de carga
  const [perfilActivo,  setPerfilActivo]  = useState(null)         // estudiante abierto en detalle
  const [ordenDesc,     setOrdenDesc]     = useState(true)   // más reciente primero

  // --- Modal de evaluación de un intento de terminal ---
  const [modalEval,     setModalEval]     = useState(false)  // visibilidad del modal
  const [intentoSel,    setIntentoSel]    = useState(null)   // intento a evaluar
  const [nota,          setNota]          = useState("")     // sin valor por defecto
  const [comentarios,   setComentarios]   = useState("")     // comentarios del docente

  // --- Formulario de crear usuario (admin) y confirmaciones ---
  const [nuevoU, setNuevoU] = useState("")                  // nombre del nuevo usuario
  const [nuevaC, setNuevaC] = useState("")                  // contraseña del nuevo usuario
  const [nuevoR, setNuevoR] = useState("estudiante")        // rol del nuevo usuario
  const [nuevoCorreo, setNuevoCorreo] = useState("")        // correo del nuevo usuario
  const [confirmRolModal, setConfirmRolModal] = useState(null) // confirmación de cambio de rol
  const [confirmEliminar, setConfirmEliminar] = useState(null) // confirmación de eliminación
  const [filtroEst,       setFiltroEst]       = useState("todos")   // todos | pendientes | aprobados | reprobados
  const [busquedaEst,     setBusquedaEst]     = useState("")        // texto de búsqueda de estudiantes

  const [editandoRolId,  setEditandoRolId]  = useState(null)  // usuario cuyo rol se edita en línea
  const [rolEditValor,   setRolEditValor]   = useState("")    // valor temporal del rol en edición
  const [entregasPerfil, setEntregasPerfil] = useState([])    // entregas del perfil abierto

  // ── Tab ejercicios docente ──
  const [ejercicios,          setEjercicios]          = useState([])     // ejercicios creados
  const [entregasEj,          setEntregasEj]          = useState([])     // entregas del ejercicio seleccionado
  const [ejSeleccionado,      setEjSeleccionado]      = useState(null)   // ejercicio cuyas entregas se ven
  const [vistaEjercicios,     setVistaEjercicios]     = useState("lista") // lista | crear | entregas
  // --- Campos del formulario de creación de ejercicio ---
  const [ejTitulo,            setEjTitulo]            = useState("")       // título (opcional)
  const [ejDescripcion,       setEjDescripcion]       = useState("")       // descripción (obligatoria)
  const [ejInstrucciones,     setEjInstrucciones]     = useState("")       // instrucciones extra
  const [ejItems,             setEjItems]             = useState([""])     // puntos del checklist
  const [ejTipo,              setEjTipo]              = useState("ataque") // ataque | defensa
  const [ejNivel,             setEjNivel]             = useState(1)        // nivel 1–7
  const [ejTiempo,            setEjTiempo]            = useState(10)       // tiempo límite (min)
  const [ejFechaLimite,       setEjFechaLimite]       = useState("")       // fecha/hora límite de entrega
  const [ejVisible,           setEjVisible]           = useState(false)    // publicar al crear
  const [modalIa,             setModalIa]             = useState(false)    // modal de asistencia IA
  const [iaNumPuntos,         setIaNumPuntos]         = useState(4)        // nº de puntos a generar con IA
  const [cargandoIa,          setCargandoIa]          = useState(false)    // generando con IA
  const [modalEntrega,        setModalEntrega]        = useState(null)     // entrega a evaluar (vista ejercicios)
  // Modal de detalle/evaluación compartido (perfil de estudiante)
  const [detalleEntregaId,    setDetalleEntregaId]    = useState(null)     // id de entrega abierta en ModalEntrega
  const [notaEntrega,         setNotaEntrega]         = useState("")        // nota en el modal de entrega
  const [comentariosEntrega,  setComentariosEntrega]  = useState("")        // comentarios en el modal de entrega
  const creandoRef = useRef(false)  // evita doble creación de ejercicio
  // Chequeo en vivo: qué puntos del checklist son verificables por el laboratorio
  const [itemsVerif, setItemsVerif] = useState({})

  const esAdmin = rolUsuario === "admin" // atajo para mostrar funciones de admin

  // Mientras se crea un ejercicio, valida (con debounce) qué ítems del checklist
  // puede verificar automáticamente el laboratorio, para avisar al docente.
  useEffect(() => {
    if (vistaEjercicios !== "crear") return
    const textos = ejItems.map(s => s.trim())
    if (!textos.some(Boolean)) { setItemsVerif({}); return }
    // Espera 600 ms tras dejar de escribir antes de consultar al backend.
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`${API_URL}/ejercicios-docente/validar-items`, {
          method: "POST", headers: getAuthHeaders(),
          body: JSON.stringify({ items: textos }),
        })
        const d = await r.json()
        if (r.ok && Array.isArray(d?.items)) {
          const m = {}
          d.items.forEach((it, i) => { m[i] = it.verificable })
          setItemsVerif(m)
        }
      } catch {}
    }, 600)
    return () => clearTimeout(t)
  }, [ejItems, vistaEjercicios])

  // Control de acceso al montar: exige sesión y rol docente/admin; si no, redirige.
  useEffect(() => {
    const u = sessionStorage.getItem("nombre_usuario") || ""
    const r = sessionStorage.getItem("rol_usuario")    || ""
    if (!u) { router.push("/"); return }                                  // sin sesión → login
    if (r !== "admin" && r !== "docente") { router.push("/inicio"); return } // sin permiso → inicio
    setNombreUsuario(u); setRolUsuario(r)
    // Pestaña inicial desde la URL (?tab=...), para los accesos directos del inicio
    const tabUrl = new URLSearchParams(window.location.search).get("tab")
    const validas = r === "admin"
      ? ["estudiantes", "ejercicios", "contenido", "usuarios"]
      : ["estudiantes", "ejercicios", "contenido"]
    if (tabUrl && validas.includes(tabUrl)) setTab(tabUrl)
  }, [router])

  // Carga los datos correspondientes cada vez que cambia la pestaña activa.
  useEffect(() => {
    if (!nombreUsuario) return
    if (tab === "estudiantes") { cargarIntentos(); cargarUsuarios() }
    if (tab === "usuarios")    cargarUsuarios()
    if (tab === "ejercicios")  cargarEjercicios()
  }, [tab, nombreUsuario])

  // Carga todas las entregas/intentos del curso (para la vista de estudiantes).
  const cargarIntentos = async () => {
    setCargando(true); setMensaje("")
    try {
      const r = await fetch(
        `${API_URL}/docente/entregas`,
        { headers: { "Authorization": `Bearer ${sessionStorage.getItem("token") || ""}` } }
      )
      const d = await r.json()
      if (!r.ok) { setMensaje(extraerError(d)); return }
      setIntentos(Array.isArray(d) ? d : (d?.entregas || []))
    } catch { setMensaje("No se pudo conectar con el backend") }
    finally { setCargando(false) }
  }

  // Carga la lista de todos los usuarios del sistema.
  const cargarUsuarios = async () => {
    setCargando(true); setMensaje("")
    try {
      const r = await fetch(
        `${API_URL}/admin/usuarios`,
        { headers: { "Authorization": `Bearer ${sessionStorage.getItem("token") || ""}` } }
      )
      const d = await r.json()
      if (!r.ok) { setMensaje(extraerError(d)); return }
      setUsuarios(Array.isArray(d) ? d : (d?.usuarios || []))
    } catch { setMensaje("No se pudo conectar con el backend") }
    finally { setCargando(false) }
  }

  // Agrupar intentos por estudiante (incluye estudiantes sin intentos)
  // Construye un perfil por estudiante con sus intentos y contadores agregados.
  const perfilesEstudiantes = useMemo(() => {
    const mapa = {}
    // Seed desde lista de usuarios estudiantes
    // Primero crea una entrada vacía por cada estudiante (para que aparezcan aunque no tengan intentos).
    usuarios.filter(u => u.rol === "estudiante").forEach(u => {
      const key = u.nombre_usuario
      mapa[key] = { nombreUsuario: key, nombre: u.nombre || u.nombre_usuario, correo: u.correo || u.nombre_usuario, intentos: [], completados: 0, pendientes: 0, ayudas_total: 0 }
    })
    // Agregar intentos
    // Luego suma a cada perfil sus intentos y actualiza completados/pendientes/ayudas.
    intentos.forEach(it => {
      const key = it.usuario || "desconocido"
      if (!mapa[key]) mapa[key] = { nombreUsuario: key, nombre: key, correo: key, intentos: [], completados: 0, pendientes: 0, ayudas_total: 0 }
      mapa[key].intentos.push(it)
      if (it.estado === "aprobado" || it.porcentaje === 100) mapa[key].completados++
      else mapa[key].pendientes++
      mapa[key].ayudas_total += it.ayudas_pedidas || 0
    })
    return Object.values(mapa).sort((a, b) => a.nombre.localeCompare(b.nombre)) // orden alfabético
  }, [intentos, usuarios])

  // Promedio de notas de un perfil (null si no tiene ninguna evaluada).
  const promedioNota = (intentosLista) => {
    const ev = intentosLista.filter(it => it.nota != null)
    if (!ev.length) return null
    return (ev.reduce((s, it) => s + it.nota, 0) / ev.length).toFixed(1)
  }

  // Perfiles filtrados por búsqueda y filtro de estado
  const perfilesFiltrados = useMemo(() => {
    let lista = perfilesEstudiantes
    if (busquedaEst.trim()) {
      const q = busquedaEst.toLowerCase()
      lista = lista.filter(p => p.nombre.toLowerCase().includes(q) || p.correo.toLowerCase().includes(q))
    }
    if (filtroEst === "pendientes") lista = lista.filter(p => p.pendientes > 0)
    if (filtroEst === "aprobados")  lista = lista.filter(p => p.completados > 0)
    if (filtroEst === "sin_notas")  lista = lista.filter(p => p.intentos.some(it => !it.tiene_evaluacion && (it.estado === "aprobado" || it.porcentaje === 100)))
    return lista
  }, [perfilesEstudiantes, filtroEst, busquedaEst])

  // (Se eliminó `intentosPerfil`: era la lista legacy de "intentos" que duplicaba
  //  cada entrega en un nivel equivocado. El detalle del perfil usa solo `entregasPerfil`.)

  // Carga las entregas de ejercicios docente del estudiante abierto.
  const cargarEntregasPerfil = async (nombreUsuario) => {
    try {
      const r = await fetch(
        `${API_URL}/docente/estudiante/${encodeURIComponent(nombreUsuario)}/entregas`,
        { headers: { "Authorization": `Bearer ${sessionStorage.getItem("token") || ""}` } }
      )
      const d = await r.json()
      if (r.ok) setEntregasPerfil(Array.isArray(d) ? d : [])
    } catch { /* silencioso */ }
  }

  // Abre el modal para evaluar un intento de terminal, precargando nota/comentarios.
  const abrirEval = (it) => {
    setMensaje("")
    setIntentoSel(it)
    setNota(it?.nota != null ? String(it.nota) : "")
    setComentarios(it?.comentarios || "")
    setModalEval(true)
  }

  // Envía al backend la evaluación (nota 1.0–7.0 + comentarios) de un intento.
  const enviarEval = async (e) => {
    e.preventDefault(); if (!intentoSel) return
    if (!nota.trim()) { setMensaje("Debes ingresar una nota antes de guardar."); return }
    const notaNum = parseFloat(nota)
    if (isNaN(notaNum) || notaNum < 1 || notaNum > 7) {
      setMensaje("La nota debe ser un número entre 1.0 y 7.0"); return
    }
    setMensaje(""); setCargando(true)
    try {
      const r = await fetch(`${API_URL}/docente/evaluar`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({
          nombre_usuario_docente: nombreUsuario,
          intento_id: intentoSel.intento_id,
          nota: notaNum,
          comentarios: comentarios || null
        })
      })
      const d = await r.json()
      if (!r.ok) { setMensaje(extraerError(d)); return }
      setMensaje(d?.mensaje || "Evaluación guardada")
      setModalEval(false); setIntentoSel(null)
      await cargarIntentos()
    } catch { setMensaje("No se pudo conectar con el backend") }
    finally { setCargando(false) }
  }

  // Cambia el rol de un usuario (admin) y refresca la lista.
  const cambiarRol = async (nombreU, nuevoRol) => {
    if (!nombreU || !nuevoRol) return
    setMensaje(""); setCargando(true)
    try {
      const r = await fetch(`${API_URL}/admin/cambiar-rol`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ nombre_usuario: nombreU, nuevo_rol: nuevoRol })
      })
      const d = await r.json()
      if (!r.ok) { setMensaje(extraerError(d)); return }
      window.cyberToast?.(d?.mensaje || "Rol actualizado", "ok")
      setEditandoRolId(null)
      await cargarUsuarios()
    } catch { setMensaje("No se pudo conectar con el backend") }
    finally { setCargando(false) }
  }

  // Crea un nuevo usuario (solo admin) tras validar los campos del formulario.
  const crearUsuario = async (e) => {
    e.preventDefault(); if (!esAdmin) return
    if (!nuevoU.trim()) { setMensaje("Ingresa el nombre completo"); return }
    if (!nuevoCorreo.trim() || !nuevoCorreo.includes("@")) { setMensaje("Ingresa un correo electrónico válido"); return }
    if (!nuevaC.trim()) { setMensaje("Ingresa una contraseña"); return }
    setMensaje(""); setCargando(true)
    try {
      const r = await fetch(`${API_URL}/admin/crear-usuario`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({
          nombre: nuevoU.trim(),
          correo: nuevoCorreo.trim().toLowerCase(),
          contrasena: nuevaC,
          rol: nuevoR,
        })
      })
      const d = await r.json()
      if (!r.ok) { setMensaje(extraerError(d)); return }
      window.cyberToast?.(d?.mensaje || "Usuario creado", "ok")
      setNuevoU(""); setNuevaC(""); setNuevoR("estudiante"); setNuevoCorreo("")
      await cargarUsuarios()
    } catch { setMensaje("No se pudo conectar con el backend") }
    finally { setCargando(false) }
  }

  // Elimina un usuario del sistema (solo admin).
  const eliminarUsuario = async (nombreU) => {
    setMensaje(""); setCargando(true)
    try {
      const r = await fetch(`${API_URL}/admin/eliminar-usuario`, {
        method: "DELETE", headers: getAuthHeaders(),
        body: JSON.stringify({ nombre_usuario: nombreU, nombre_usuario_admin: nombreUsuario })
      })
      const d = await r.json()
      if (!r.ok) { setMensaje(extraerError(d)); return }
      window.cyberToast?.(d?.mensaje || "Usuario eliminado", "warn")
      setConfirmEliminar(null)
      await cargarUsuarios()
    } catch { setMensaje("No se pudo conectar con el backend") }
    finally { setCargando(false) }
  }

  // Carga la lista de ejercicios creados por el docente.
  const cargarEjercicios = async () => {
    setCargando(true)
    try {
      const r = await fetch(`${API_URL}/ejercicios-docente`, { headers: getAuthHeaders() })
      const d = await r.json()
      if (r.ok) setEjercicios(Array.isArray(d) ? d : [])
      else setMensaje(extraerError(d))
    } catch { setMensaje("No se pudo cargar ejercicios") }
    finally { setCargando(false) }
  }

  // Carga las entregas de un ejercicio concreto.
  const cargarEntregasEj = async (ejId) => {
    setCargando(true)
    try {
      const r = await fetch(`${API_URL}/ejercicios-docente/${ejId}/entregas`, { headers: getAuthHeaders() })
      const d = await r.json()
      if (r.ok) setEntregasEj(Array.isArray(d) ? d : [])
      else setMensaje(extraerError(d))
    } catch { setMensaje("No se pudo cargar entregas") }
    finally { setCargando(false) }
  }

  // Crea un nuevo ejercicio con los datos del formulario (valida y arma el payload).
  const crearEjercicio = async (e) => {
    e.preventDefault()
    if (creandoRef.current) return  // evita doble envío (doble clic / reintento)
    if (!ejDescripcion.trim()) { setMensaje("La descripción es obligatoria"); return }
    if (!ejFechaLimite) { setMensaje("La fecha y hora límite de entrega es obligatoria"); return }
    // Limpia los ítems vacíos y les asigna su número de orden.
    const itemsValidos = ejItems.map((d, i) => ({ descripcion: d.trim(), orden: i + 1 })).filter(it => it.descripcion)
    creandoRef.current = true
    setMensaje(""); setCargando(true); window.cyberProgress?.start()
    try {
      const r = await fetch(`${API_URL}/ejercicios-docente/crear`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({
          titulo: ejTitulo.trim() || null,
          descripcion: ejDescripcion.trim(),
          instrucciones: ejInstrucciones.trim() || null,
          tipo: ejTipo,
          nivel: Number(ejNivel) || 1,
          tiempo_minutos: Number(ejTiempo) || 10,
          fecha_limite: new Date(ejFechaLimite).toISOString(),
          visible: ejVisible,
          items: itemsValidos,
        }),
      })
      const d = await r.json()
      if (!r.ok) { setMensaje(extraerError(d)); return }
      window.cyberToast?.("Ejercicio creado correctamente", "ok")
      setEjTitulo(""); setEjDescripcion(""); setEjInstrucciones(""); setEjItems([""])
      setEjTipo("ataque"); setEjNivel(1); setEjTiempo(10); setEjFechaLimite(""); setEjVisible(false)
      setVistaEjercicios("lista")
      await cargarEjercicios()
    } catch { setMensaje("No se pudo conectar con el servidor") }
    finally { creandoRef.current = false; setCargando(false); window.cyberProgress?.end() }
  }

  // Elimina un ejercicio (pide confirmación nativa antes).
  const eliminarEjercicio = async (id) => {
    if (!confirm("¿Eliminar este ejercicio? Esta acción no se puede deshacer.")) return
    setMensaje(""); setCargando(true)
    try {
      const r = await fetch(`${API_URL}/ejercicios-docente/${id}`, { method: "DELETE", headers: getAuthHeaders() })
      const d = await r.json()
      if (!r.ok) { setMensaje(extraerError(d)); return }
      window.cyberToast?.("Ejercicio eliminado", "warn")
      await cargarEjercicios()
    } catch { setMensaje("No se pudo conectar") }
    finally { setCargando(false) }
  }

  // Publica u oculta un ejercicio (alterna su visibilidad para los estudiantes).
  const toggleVisibilidad = async (id) => {
    try {
      const r = await fetch(`${API_URL}/ejercicios-docente/${id}/visibilidad`, { method: "PATCH", headers: getAuthHeaders() })
      const d = await r.json()
      if (!r.ok) { setMensaje(extraerError(d)); return }
      // Actualizar localmente sin recargar toda la lista
      setEjercicios(prev => prev.map(ej => ej.id === id ? { ...ej, activo: d.activo } : ej))
      window.cyberToast?.(d.activo ? "Ejercicio publicado" : "Ejercicio ocultado", d.activo ? "ok" : "info")
    } catch { setMensaje("No se pudo cambiar la visibilidad") }
  }

  // Contexto por nivel para guiar la IA — comandos y dificultad apropiados
  // Estos textos se envían al modelo para que genere ejercicios coherentes con
  // el nivel: limita los comandos permitidos y fija la dificultad esperada.
  const CONTEXTO_NIVELES_IA = {
    ataque: {
      1: "Nivel 1 — Introducción y fundamentos. Dificultad MUY BAJA. Solo comandos básicos: show alerts, show events, block ip, whoami, status, ip a, ls. Conceptos: alertas IDS, log de eventos, bloqueo IP elemental. NO usar comandos de niveles superiores.",
      2: "Nivel 2 — Escaneo de puertos. Dificultad BAJA. Comandos: show services, scan ports, show traffic, show events, show alerts, block ip, show blocked. Conceptos: reconocimiento básico, identificar puertos abiertos.",
      3: "Nivel 3 — Enumeración de servicios. Dificultad BAJA-MEDIA. Comandos: show banners, resolve host, show services, show events, block ip, show blocked. Conceptos: banners de servicios, versiones de software expuestas.",
      4: "Nivel 4 — Superficie de ataque. Dificultad MEDIA. Comandos: show vulnerabilities, trace ip, show traffic, show alerts, block ip. Conceptos: vulnerabilidades detectadas, trazado de rutas.",
      5: "Nivel 5 — Fuerza bruta avanzada. Dificultad MEDIA-ALTA. Comandos: show failed logins, show sessions, show users, show traffic, block ip, show blocked. Conceptos: intentos fallidos de autenticación, sesiones activas.",
      6: "Nivel 6 — Ataque multi-etapa. Dificultad ALTA. Comandos: show processes, enumerate users, show failed logins, show alerts, block ip, export report. Conceptos: múltiples vectores simultáneos.",
      7: "Nivel 7 — Operación completa de pentesting. Dificultad MUY ALTA. Todos los comandos disponibles: show hosts, enumerate services, history, export report, más todos los de niveles anteriores. Operación end-to-end sin asistencia.",
    },
    defensa: {
      1: "Nivel 1 — Monitoreo básico SOC. Dificultad MUY BAJA. Comandos: eventos, alertas, estado-sistema, whoami. Conceptos básicos de monitoreo. NO usar comandos avanzados.",
      2: "Nivel 2 — Detección de fuerza bruta. Dificultad BAJA. Comandos: eventos fuerza-bruta, logs auth, analizar-ip, bloquear-ip, estado-firewall, ips-bloqueadas.",
      3: "Nivel 3 — Reconocimiento y escaneo defensivo. Dificultad BAJA-MEDIA. Comandos: eventos escaneo, trafico-ip, logs firewall, bloquear-ip, estado-sistema.",
      4: "Nivel 4 — Investigación de incidentes. Dificultad MEDIA. Comandos: alertas criticas, correlacionar, historial-ip, logs auth, bloquear-ip, estado-sistema.",
      5: "Nivel 5 — Respuesta defensiva activa. Dificultad MEDIA-ALTA. Comandos: estado-sistema, alertas activas, bloquear-ip, estado-firewall, eventos recientes, estado-servidor.",
      6: "Nivel 6 — Escenarios multi-vector. Dificultad ALTA. Múltiples IPs, correlación avanzada, todos los comandos de logs y análisis.",
      7: "Nivel 7 — Defensa integral autónoma. Dificultad MUY ALTA. Todos los comandos SOC incluyendo generar-reporte. Operación completa sin asistencia.",
    },
  }

  // Pide a la IA que genere descripción, instrucciones y puntos del ejercicio,
  // y rellena el formulario con la respuesta para que el docente la revise.
  const usarIa = async () => {
    setCargandoIa(true); setMensaje("")
    const nivelNum = Number(ejNivel) || 1
    const contextoNivel = CONTEXTO_NIVELES_IA[ejTipo]?.[nivelNum] || "" // guía según nivel/tipo
    try {
      const r = await fetch(`${API_URL}/ejercicios-docente/ia-asistir`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({
          titulo: ejTitulo.trim() || null,
          tipo: ejTipo,
          nivel: nivelNum,
          num_puntos: Number(iaNumPuntos) || 4,
          contexto_nivel: contextoNivel,
        }),
      })
      const d = await r.json()
      if (!r.ok) { setMensaje(d?.detail || "Error con la IA"); return }
      if (d.descripcion) setEjDescripcion(d.descripcion)
      if (d.instrucciones) setEjInstrucciones(d.instrucciones)
      if (Array.isArray(d.items) && d.items.length > 0) setEjItems(d.items)
      setModalIa(false)
      window.cyberToast?.("IA rellenó el ejercicio. Revisa y ajusta.", "info")
    } catch { setMensaje("No se pudo conectar con la IA") }
    finally { setCargandoIa(false) }
  }

  // Evalúa una entrega de ejercicio docente (nota 1.0–7.0 + comentarios) y refresca las listas.
  const evaluarEntrega = async (e) => {
    e.preventDefault()
    if (!modalEntrega) return
    const notaNum = parseFloat(notaEntrega)
    if (isNaN(notaNum) || notaNum < 1 || notaNum > 7) { setMensaje("Nota debe ser 1.0–7.0"); return }
    setMensaje(""); setCargando(true); window.cyberProgress?.start()
    try {
      const r = await fetch(`${API_URL}/ejercicios-docente/entregas/${modalEntrega.id}/evaluar`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ nota: notaNum, comentarios: comentariosEntrega || null }),
      })
      const d = await r.json()
      if (!r.ok) { setMensaje(extraerError(d)); return }
      window.cyberToast?.(`Entrega evaluada — Nota ${notaNum.toFixed(1)}`, "ok")
      setModalEntrega(null); setNotaEntrega(""); setComentariosEntrega("")
      if (perfilActivo) await cargarEntregasPerfil(perfilActivo)
      if (ejSeleccionado) await cargarEntregasEj(ejSeleccionado.id)
    } catch { setMensaje("No se pudo conectar") }
    finally { setCargando(false); window.cyberProgress?.end() }
  }

  return (
    <GuardSesion>
      <div className="dashboard-page">
        <div className="dashboard-container">

          <BarraSuperior paginaActiva="panel" />

          {/* ── HEADER estilo mockup ──  Título del panel + usuario y rol en sesión */}
          <header style={{
            background: "linear-gradient(135deg, #1c1c1e 0%, #242426 100%)",
            border: "1px solid #2c2c2e",
            borderRadius: 18,
            padding: "28px 32px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.50)",
          }}>
            <div style={{ marginBottom: 6 }}>
              <span style={{
                fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase",
                background: "rgba(41,151,255,0.14)", color: "#2997ff",
                border: "1px solid rgba(41,151,255,0.28)", borderRadius: 999,
                padding: "4px 12px",
              }}>PANEL DE GESTIÓN CYBERLAB</span>
            </div>
            <h1 style={{ margin:"10px 0 4px", fontSize:26, color:"#f5f5f7", fontFamily:"var(--sans)", fontWeight:800, letterSpacing:"-0.5px" }}>
              Administración y evaluación
            </h1>
            <p style={{ margin:0, fontSize:15, color:"#8e8e93" }}>
              Sesión: <strong style={{ color:"#6db8ff" }}>{nombreUsuario}</strong>
              {" — "} Rol: <strong style={{ color:"#86efac" }}>{rolUsuario || "N/D"}</strong>
            </p>
          </header>

          {/* ── TABS estilo mockup ──  Navegación entre pestañas; "Usuarios" solo para admin */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {[
              { id:"estudiantes", label:"👤 Estudiantes", onClick: () => { setTab("estudiantes"); setPerfilActivo(null) } },
              { id:"ejercicios",  label:"📝 Ejercicios",  onClick: () => { setTab("ejercicios"); setVistaEjercicios("lista"); setEjSeleccionado(null); setMensaje("") } },
              { id:"contenido",   label:"📄 Contenido",   onClick: () => { setTab("contenido"); setMensaje("") } },
              ...(esAdmin ? [{ id:"usuarios", label:"⚙ Usuarios", onClick: () => setTab("usuarios") }] : []),
            ].map(t => (
              <button
                key={t.id}
                onClick={t.onClick}
                style={{
                  padding:"10px 20px", borderRadius:980, border:"none",
                  background: tab === t.id ? "#2997ff" : "rgba(255,255,255,0.06)",
                  color: tab === t.id ? "#fff" : "#aeaeb2",
                  fontWeight:700, fontSize:14, cursor:"pointer",
                  fontFamily:"var(--cuerpo)",
                  boxShadow: tab === t.id ? "0 4px 16px rgba(41,151,255,0.30)" : "none",
                  transition:"all 0.2s",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Mensaje de estado/error global del panel. */}
          {mensaje && (
            <div style={{
              padding:"12px 16px", background:"rgba(41,151,255,0.08)",
              border:"1px solid rgba(41,151,255,0.22)", borderRadius:12,
              fontSize:13, color:"#6db8ff",
            }}>{mensaje}</div>
          )}

          {/* ── TAB: Lista de perfiles ──  Grilla de tarjetas de estudiantes con
              buscador y filtros (todos / pendientes de nota / con o sin ejercicios). */}
          {tab === "estudiantes" && !perfilActivo && (
            <div className="card-mock" style={{ padding:"20px 24px" }}>
              <div className="panel-section-title">
                Perfiles de estudiantes
                <span className="panel-section-count">{perfilesFiltrados.length} / {perfilesEstudiantes.length}</span>
              </div>

              {/* Filtros */}
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
                <input
                  className="campo-inicio"
                  style={{ flex:1, minWidth:160, padding:"7px 12px", fontSize:13 }}
                  placeholder="Buscar por nombre o correo..."
                  value={busquedaEst}
                  onChange={e => setBusquedaEst(e.target.value)}
                />
                {[
                  { val:"todos",      label:"Todos" },
                  { val:"sin_notas",  label:"Pendientes de nota" },
                  { val:"aprobados",  label:"Con ejercicios" },
                  { val:"pendientes", label:"Sin completar" },
                ].map(f => (
                  <button key={f.val}
                    onClick={() => setFiltroEst(f.val)}
                    style={{
                      padding:"6px 12px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer",
                      background: filtroEst === f.val ? "var(--primario)" : "rgba(255,255,255,0.06)",
                      border: filtroEst === f.val ? "1px solid var(--primario)" : "1px solid rgba(255,255,255,0.10)",
                      color: filtroEst === f.val ? "#000" : "var(--texto-apagado)",
                    }}
                  >{f.label}</button>
                ))}
              </div>

              {cargando && <div className="panel-cargando">Cargando...</div>}
              {perfilesFiltrados.length === 0 && !cargando && (
                <div className="panel-vacio">No hay estudiantes que coincidan con el filtro.</div>
              )}
              <div className="perfiles-grid">
                {perfilesFiltrados.map(p => {
                  const prom = promedioNota(p.intentos)
                  const pendNota = p.intentos.filter(it => !it.tiene_evaluacion && (it.estado === "aprobado" || it.porcentaje === 100)).length
                  return (
                    <button key={p.correo || p.nombre} className="perfil-card" onClick={() => {
                        const key = p.nombreUsuario || p.correo || p.nombre
                        setPerfilActivo(key)
                        setEntregasPerfil([])
                        cargarEntregasPerfil(key)
                      }}>
                      <div className="perfil-avatar">{(p.nombre[0] || "?").toUpperCase()}</div>
                      <div className="perfil-info">
                        <div className="perfil-nombre">{p.nombre}</div>
                        <div style={{ fontSize:11, color:"var(--texto-apagado)", fontFamily:"var(--mono)", marginBottom:4 }}>{p.correo}</div>
                        <div className="perfil-stats">
                          <span className="perfil-stat verde">✓ {p.completados}</span>
                          {pendNota > 0 && <span className="perfil-stat amarillo">📋 {pendNota} sin nota</span>}
                          {prom !== null && (
                            <span style={{ fontSize:11, fontWeight:700, color: prom >= 4 ? "var(--terciario-dim)" : "#ffb4ab", fontFamily:"var(--mono)" }}>
                              prom {prom}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="perfil-arrow">›</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── TAB: Detalle de perfil — vista por niveles ──  Acordeón con las
              entregas del estudiante seleccionado (componente PanelPerfilNiveles).
              NOTA: `intentos` se pasa vacío a propósito. Esa lista legacy (de
              /docente/entregas) son las MISMAS entregas que ya llegan en `entregas`
              (de /docente/estudiante/...), pero se dibujaban con el estilo viejo
              "Terminal #N" y se ubicaban por ceil(id/5), duplicando cada entrega en
              un nivel equivocado. Usar solo `entregas` (ubicada por su nivel real)
              elimina el duplicado. */}
          {tab === "estudiantes" && perfilActivo && (
            <PanelPerfilNiveles
              nombreEstudiante={perfilesEstudiantes.find(p => (p.nombreUsuario || p.correo || p.nombre) === perfilActivo)?.nombre || perfilActivo}
              intentos={[]}
              entregas={entregasPerfil}
              cargando={cargando}
              ordenDesc={ordenDesc}
              setOrdenDesc={setOrdenDesc}
              onVolver={() => { setPerfilActivo(null); setEntregasPerfil([]) }}
              onEvaluar={abrirEval}
              onEvaluarEntrega={(en) => setDetalleEntregaId(en.id)}
            />
          )}

          {/* Modal de detalle/evaluación de entrega (compartido con Estadísticas).
              Al evaluar, recarga las entregas del perfil para reflejar la nota. */}
          {detalleEntregaId != null && (
            <ModalEntrega
              entregaId={detalleEntregaId}
              onCerrar={() => setDetalleEntregaId(null)}
              onEvaluada={() => { if (perfilActivo) cargarEntregasPerfil(perfilActivo) }}
            />
          )}

          {/* ── TAB: Ejercicios docente ──  Tres sub-vistas: lista, crear y entregas. */}
          {tab === "ejercicios" && (
            <div className="card-mock" style={{ padding:"20px 24px" }}>

              {/* Sub-navegación entre "Lista" y "+ Crear ejercicio" (oculta en la vista de entregas). */}
              {vistaEjercicios !== "entregas" && (
                <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                  <button
                    className={`btn-secundario ${vistaEjercicios==="lista"?"activo":""}`}
                    onClick={() => { setVistaEjercicios("lista"); setMensaje("") }}
                  >Lista</button>
                  <button
                    className={`btn-secundario ${vistaEjercicios==="crear"?"activo":""}`}
                    onClick={() => { setVistaEjercicios("crear"); setMensaje("") }}
                  >+ Crear ejercicio</button>
                </div>
              )}

              {/* Lista de ejercicios: cada uno con su tipo, nivel, plazo, toggle de
                  visibilidad y botones para ver entregas o eliminar. */}
              {vistaEjercicios === "lista" && (
                <>
                  <div className="panel-section-title">
                    Ejercicios publicados
                    <span className="panel-section-count">{ejercicios.length}</span>
                  </div>
                  {cargando && <div className="panel-cargando">Cargando...</div>}
                  {ejercicios.length === 0 && !cargando && (
                    <div className="panel-vacio">No hay ejercicios creados aún. Usa "+ Crear ejercicio".</div>
                  )}
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {ejercicios.map(ej => {
                      // Cálculo del estado del plazo de entrega para colorear el badge.
                      const ahora = new Date()
                      const limite = ej.fecha_limite ? new Date(ej.fecha_limite) : null
                      const vencido = limite && ahora > limite                       // ya pasó la fecha
                      const hoy = limite && !vencido && (limite - ahora) < 86400000 // < 24h
                      const fmtLimite = limite ? limite.toLocaleString("es-CL", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }) : null
                      return (
                        <div key={ej.id} style={{
                          background:"rgba(255,255,255,0.03)",
                          border:`1px solid ${ej.activo ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}`,
                          borderRadius:12, padding:"14px 18px",
                          display:"flex", alignItems:"center", gap:14,
                          opacity: ej.activo ? 1 : 0.72,
                          transition:"opacity .2s",
                        }}>
                          <div style={{ flex:1 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
                              <span style={{ fontFamily:"var(--mono)", fontSize:12, color:"var(--texto-apagado)", marginRight:2 }}>#{ej.numero}</span>
                              <span style={{ fontWeight:700, fontSize:15, color:"#fff" }}>{ej.titulo}</span>
                              <span style={{
                                fontSize:10, padding:"2px 7px", borderRadius:4, fontWeight:700,
                                background: ej.tipo === "ataque" ? "rgba(239,68,68,0.12)" : "rgba(0,218,243,0.12)",
                                border: `1px solid ${ej.tipo === "ataque" ? "rgba(239,68,68,0.25)" : "rgba(0,218,243,0.25)"}`,
                                color: ej.tipo === "ataque" ? "#ffb4ab" : "var(--terciario-dim)",
                              }}>
                                {ej.tipo === "ataque" ? "⚔ Ataque" : "🛡 Defensa"}
                              </span>
                              {/* Badge visibilidad */}
                              <span style={{
                                fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:700,
                                background: ej.activo ? "rgba(48,209,88,0.12)" : "rgba(255,255,255,0.06)",
                                border: `1px solid ${ej.activo ? "rgba(48,209,88,0.25)" : "rgba(255,255,255,0.10)"}`,
                                color: ej.activo ? "#30d158" : "#6e6e73",
                              }}>
                                {ej.activo ? "● Visible" : "○ Oculto"}
                              </span>
                              {/* Badge plazo vencido */}
                              {vencido && (
                                <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:700, background:"rgba(255,69,58,0.12)", border:"1px solid rgba(255,69,58,0.25)", color:"#ff453a" }}>
                                  Plazo vencido
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize:13, color:"var(--texto-secundario)", marginBottom:4 }}>{ej.descripcion}</div>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4, flexWrap:"wrap" }}>
                              <span style={{
                                fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:700,
                                background: (ej.nivel||1) <= 2 ? "rgba(34,197,94,0.12)" : (ej.nivel||1) <= 4 ? "rgba(234,179,8,0.12)" : (ej.nivel||1) <= 6 ? "rgba(249,115,22,0.12)" : "rgba(239,68,68,0.12)",
                                border: `1px solid ${(ej.nivel||1) <= 2 ? "rgba(34,197,94,0.30)" : (ej.nivel||1) <= 4 ? "rgba(234,179,8,0.30)" : (ej.nivel||1) <= 6 ? "rgba(249,115,22,0.30)" : "rgba(239,68,68,0.30)"}`,
                                color: (ej.nivel||1) <= 2 ? "#86efac" : (ej.nivel||1) <= 4 ? "#fde047" : (ej.nivel||1) <= 6 ? "#fdba74" : "#ffb4ab",
                              }}>
                                Nv.{ej.nivel||1}
                              </span>
                              <span style={{ fontSize:11, color:"var(--texto-apagado)" }}>
                                {ej.items.length} punto{ej.items.length !== 1 ? "s" : ""} · {ej.tiempo_minutos} min
                              </span>
                              {/* Badge deadline */}
                              {fmtLimite && (
                                <span style={{
                                  fontFamily:"var(--mono)", fontSize:10, padding:"2px 9px", borderRadius:4, fontWeight:700,
                                  background: vencido ? "rgba(255,69,58,0.10)" : hoy ? "rgba(255,159,10,0.10)" : "rgba(48,209,88,0.10)",
                                  border: `1px solid ${vencido ? "rgba(255,69,58,0.22)" : hoy ? "rgba(255,159,10,0.22)" : "rgba(48,209,88,0.22)"}`,
                                  color: vencido ? "#ff453a" : hoy ? "#ff9f0a" : "#30d158",
                                }}>
                                  {vencido ? "✕" : hoy ? "⚠" : "⏱"} {vencido ? `Venció: ${fmtLimite}` : hoy ? `Vence HOY · ${limite.toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})}` : `Vence: ${fmtLimite}`}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Toggle visibilidad */}
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, flexShrink:0 }}>
                            <label style={{ position:"relative", width:44, height:24, cursor:"pointer" }}>
                              <input
                                type="checkbox"
                                checked={!!ej.activo}
                                onChange={() => toggleVisibilidad(ej.id)}
                                style={{ opacity:0, width:0, height:0 }}
                              />
                              <span style={{
                                position:"absolute", inset:0, borderRadius:24,
                                background: ej.activo ? "#30d158" : "#3a3a3c",
                                transition:".22s",
                              }}>
                                <span style={{
                                  position:"absolute", height:18, width:18,
                                  left: ej.activo ? 23 : 3, bottom:3,
                                  background:"#fff", borderRadius:"50%", transition:".22s",
                                }}/>
                              </span>
                            </label>
                            <span style={{ fontSize:10, fontWeight:700, color: ej.activo ? "#30d158" : "#6e6e73" }}>
                              {ej.activo ? "Visible" : "Oculto"}
                            </span>
                          </div>
                          <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                            <button
                              className="btn-evaluar"
                              onClick={async () => {
                                setEjSeleccionado(ej)
                                setVistaEjercicios("entregas")
                                setMensaje("")
                                await cargarEntregasEj(ej.id)
                              }}
                            >
                              Ver entregas
                            </button>
                            <button
                              className="boton-secundario"
                              style={{ padding:"6px 12px", fontSize:12 }}
                              onClick={() => eliminarEjercicio(ej.id)}
                              disabled={cargando}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Crear ejercicio: formulario con tipo, nivel, tiempo, fecha límite,
                  título (opcional, con asistencia IA), descripción y checklist de puntos. */}
              {vistaEjercicios === "crear" && (
                <>
                  <div className="panel-section-title">Nuevo ejercicio</div>
                  <form onSubmit={crearEjercicio} style={{ display:"grid", gap:12, maxWidth:640 }}>
                    {/* Tipo, Nivel y Tiempo */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      <div>
                        <label style={{ display:"block", fontSize:12, color:"var(--texto-apagado)", marginBottom:4, textTransform:"uppercase", letterSpacing:1 }}>Tipo *</label>
                        <select className="campo-inicio" value={ejTipo} onChange={e => setEjTipo(e.target.value)}>
                          <option value="ataque">⚔ Ataque (Pentesting)</option>
                          <option value="defensa">🛡 Defensa (SOC / Blue Team)</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display:"block", fontSize:12, color:"var(--texto-apagado)", marginBottom:4, textTransform:"uppercase", letterSpacing:1 }}>Nivel de dificultad *</label>
                        <select className="campo-inicio" value={ejNivel} onChange={e => setEjNivel(e.target.value)}>
                          {[1,2,3,4,5,6,7].map(n => (
                            <option key={n} value={n}>Nivel {n} — {NOMBRES_NIVELES_FORM[ejTipo]?.[n] || ""}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      <div>
                        <label style={{ display:"block", fontSize:12, color:"var(--texto-apagado)", marginBottom:4, textTransform:"uppercase", letterSpacing:1 }}>Tiempo (minutos) *</label>
                        <input
                          className="campo-inicio"
                          type="number" min="1" max="120"
                          value={ejTiempo} onChange={e => setEjTiempo(e.target.value)}
                        />
                      </div>
                      <div style={{ display:"flex", alignItems:"flex-end" }}>
                        <div style={{ fontSize:12, color:"var(--texto-apagado)", padding:"8px 0", lineHeight:1.5 }}>
                          {ejNivel <= 2 ? "🟢 Básico — comandos simples, guiado" :
                           ejNivel <= 4 ? "🟡 Intermedio — herramientas específicas" :
                           ejNivel <= 6 ? "🟠 Avanzado — técnicas complejas, evasión" :
                           "🔴 Experto — end-to-end sin asistencia"}
                        </div>
                      </div>
                    </div>
                    {/* Fecha y hora límite de entrega */}
                    <div style={{
                      border:"1px solid rgba(41,151,255,0.30)", borderRadius:10,
                      padding:"14px 16px", background:"rgba(41,151,255,0.04)",
                    }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"#6db8ff", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>
                        ⏱ Fecha y hora límite de entrega <span style={{ color:"#ff453a" }}>*</span>
                      </div>
                      <input
                        className="campo-inicio"
                        type="datetime-local"
                        value={ejFechaLimite}
                        onChange={e => setEjFechaLimite(e.target.value)}
                        required
                        style={{ colorScheme:"dark" }}
                      />
                      <div style={{ fontSize:11, color:"var(--texto-apagado)", marginTop:7, fontFamily:"var(--mono)", lineHeight:1.5 }}>
                        Pasada esta fecha y hora los alumnos no podrán enviar su entrega
                      </div>
                    </div>
                    <div>
                      <label style={{ display:"block", fontSize:12, color:"var(--texto-apagado)", marginBottom:4, textTransform:"uppercase", letterSpacing:1 }}>Título (opcional)</label>
                      <div style={{ display:"flex", gap:8 }}>
                        <input
                          className="campo-inicio"
                          placeholder={`Vacío = "${ejTipo === "ataque" ? "Ataque" : "Defensa"} — Nivel ${ejNivel}: ${NOMBRES_NIVELES_FORM[ejTipo]?.[ejNivel] || ""}"`}
                          value={ejTitulo} onChange={e => setEjTitulo(e.target.value)}
                          style={{ flex:1 }}
                        />
                        <button
                          type="button"
                          onClick={() => setModalIa(true)}
                          style={{
                            flexShrink:0, padding:"0 14px",
                            background:"linear-gradient(135deg,rgba(139,92,246,0.25),rgba(0,163,255,0.20))",
                            border:"1px solid rgba(139,92,246,0.40)", borderRadius:8,
                            color:"#c4b5fd", fontSize:12, fontWeight:700, cursor:"pointer",
                            whiteSpace:"nowrap",
                          }}
                          title="Generar contenido con IA"
                        >
                          ✨ IA
                        </button>
                      </div>
                    </div>
                    <div>
                      <label style={{ display:"block", fontSize:12, color:"var(--texto-apagado)", marginBottom:4, textTransform:"uppercase", letterSpacing:1 }}>Descripción *</label>
                      <textarea
                        className="campo-inicio"
                        placeholder="Breve descripción del objetivo del ejercicio"
                        rows={3}
                        value={ejDescripcion} onChange={e => setEjDescripcion(e.target.value)}
                        style={{ resize:"vertical" }}
                      />
                    </div>
                    <div>
                      <label style={{ display:"block", fontSize:12, color:"var(--texto-apagado)", marginBottom:4, textTransform:"uppercase", letterSpacing:1 }}>Instrucciones detalladas</label>
                      <textarea
                        className="campo-inicio"
                        placeholder="Pasos, herramientas recomendadas, contexto del escenario..."
                        rows={5}
                        value={ejInstrucciones} onChange={e => setEjInstrucciones(e.target.value)}
                        style={{ resize:"vertical" }}
                      />
                    </div>
                    {/* Checklist: cada punto se valida en vivo; si no es verificable
                        por el laboratorio se marca en ámbar con una advertencia. */}
                    <div>
                      <label style={{ display:"block", fontSize:12, color:"var(--texto-apagado)", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>
                        Puntos a evaluar (checklist)
                      </label>
                      {ejItems.map((item, i) => {
                        const tieneTexto  = item.trim().length > 0   // ¿el punto tiene contenido?
                        const verificable = itemsVerif[i]            // ¿lo puede validar el laboratorio?
                        return (
                          <div key={i} style={{ marginBottom:6 }}>
                            <div style={{ display:"flex", gap:6 }}>
                              <input
                                className="campo-inicio"
                                placeholder={`Punto ${i+1}`}
                                value={item}
                                onChange={e => {
                                  const copia = [...ejItems]
                                  copia[i] = e.target.value
                                  setEjItems(copia)
                                }}
                                style={{
                                  flex:1,
                                  borderColor: tieneTexto && verificable === false ? "rgba(255,159,10,0.50)" : undefined,
                                }}
                              />
                              {tieneTexto && verificable === true && (
                                <span style={{ alignSelf:"center", color:"#30d158", fontSize:14, flexShrink:0 }} title="Verificable por el laboratorio">✓</span>
                              )}
                              {ejItems.length > 1 && (
                                <button type="button" className="boton-secundario"
                                  style={{ padding:"6px 10px", fontSize:12 }}
                                  onClick={() => setEjItems(ejItems.filter((_, j) => j !== i))}
                                >✕</button>
                              )}
                            </div>
                            {tieneTexto && verificable === false && (
                              <div style={{ fontSize:11, color:"#ffb340", marginTop:3, lineHeight:1.5 }}>
                                ⚠ Este punto no es verificable con los comandos del laboratorio — el estudiante no podría completarlo.
                                Usa acciones como: revisar alertas, consultar eventos/logs, analizar tráfico, escanear puertos,
                                bloquear una IP, verificar estado, correlacionar o generar reporte.
                              </div>
                            )}
                          </div>
                        )
                      })}
                      <button
                        type="button"
                        className="boton-secundario"
                        style={{ fontSize:12, padding:"6px 12px", marginTop:4 }}
                        onClick={() => setEjItems([...ejItems, ""])}
                      >+ Agregar punto</button>
                    </div>
                    {/* Toggle visibilidad inicial */}
                    <div style={{
                      display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"12px 14px", background:"rgba(255,255,255,0.03)",
                      border:"1px solid rgba(255,255,255,0.08)", borderRadius:8,
                    }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:3 }}>Publicar como visible</div>
                        <div style={{ fontSize:12, color:"var(--texto-apagado)" }}>
                          {ejVisible
                            ? "Los alumnos verán el ejercicio inmediatamente"
                            : "Se crea como borrador — los alumnos no lo verán aún"}
                        </div>
                      </div>
                      <label style={{ position:"relative", width:44, height:24, cursor:"pointer", marginLeft:14, flexShrink:0 }}>
                        <input
                          type="checkbox"
                          checked={ejVisible}
                          onChange={e => setEjVisible(e.target.checked)}
                          style={{ opacity:0, width:0, height:0 }}
                        />
                        <span style={{
                          position:"absolute", inset:0, borderRadius:24,
                          background: ejVisible ? "#30d158" : "#3a3a3c", transition:".22s",
                        }}>
                          <span style={{
                            position:"absolute", height:18, width:18,
                            left: ejVisible ? 23 : 3, bottom:3,
                            background:"#fff", borderRadius:"50%", transition:".22s",
                          }}/>
                        </span>
                      </label>
                    </div>
                    {mensaje && (
                      <div style={{ padding:"10px 14px", background:"rgba(0,163,255,0.08)", border:"1px solid rgba(0,163,255,0.20)", borderRadius:8, fontSize:13, color:"var(--primario-dim)" }}>
                        {mensaje}
                      </div>
                    )}
                    <div style={{ display:"flex", gap:8 }}>
                      <button className="boton-principal" type="submit" disabled={cargando}>
                        {cargando ? "Guardando..." : "Publicar ejercicio"}
                      </button>
                      <button type="button" className="boton-secundario" onClick={() => setVistaEjercicios("lista")}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* Entregas de un ejercicio: lista de estudiantes con su estado
                  (evaluado/pendiente/no entregado) y botón para poner/editar nota. */}
              {vistaEjercicios === "entregas" && ejSeleccionado && (
                <>
                  <button className="btn-volver" onClick={() => { setVistaEjercicios("lista"); setEjSeleccionado(null) }} style={{ marginBottom:12 }}>
                    ← Volver
                  </button>
                  <div className="panel-section-title">
                    Entregas: {ejSeleccionado.titulo}
                    <span className="panel-section-count">{entregasEj.length}</span>
                  </div>
                  {cargando && <div className="panel-cargando">Cargando...</div>}
                  {entregasEj.length === 0 && !cargando && (
                    <div className="panel-vacio">Ningún estudiante ha entregado este ejercicio aún.</div>
                  )}
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {entregasEj.map(en => (
                      <div key={en.id ?? "ne-" + en.usuario} style={{
                        background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)",
                        borderRadius:10, padding:"12px 16px",
                        display:"flex", alignItems:"center", gap:14,
                        opacity: en.estado === "no_entregado" ? 0.7 : 1,
                      }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                            <strong style={{ color:"#fff" }}>{en.usuario}</strong>
                            <span style={{
                              fontSize:11, padding:"2px 8px", borderRadius:4, fontWeight:700,
                              background: en.estado === "evaluado" ? "rgba(0,218,243,0.15)" : en.estado === "no_entregado" ? "rgba(255,69,58,0.10)" : "rgba(255,200,0,0.12)",
                              border: `1px solid ${en.estado === "evaluado" ? "rgba(0,218,243,0.30)" : en.estado === "no_entregado" ? "rgba(255,69,58,0.25)" : "rgba(255,200,0,0.25)"}`,
                              color: en.estado === "evaluado" ? "var(--terciario-dim)" : en.estado === "no_entregado" ? "#ff6b6b" : "#ffc107",
                            }}>
                              {en.estado === "evaluado" ? `Nota: ${en.nota}` : en.estado === "no_entregado" ? "No entregado" : "Pendiente"}
                            </span>
                          </div>
                          {(en.ayudas_pedidas || 0) > 0 && (
                            <div style={{ fontSize:12, color:"#f59e0b", marginTop:2 }}>
                              💡 {en.ayudas_pedidas} pista{en.ayudas_pedidas > 1 ? "s" : ""} solicitada{en.ayudas_pedidas > 1 ? "s" : ""}
                            </div>
                          )}
                          {en.respuesta && (
                            <div style={{ fontSize:12, color:"var(--texto-apagado)", fontFamily:"var(--mono)", marginTop:4, maxHeight:60, overflow:"hidden", textOverflow:"ellipsis" }}>
                              {en.respuesta.substring(0, 200)}{en.respuesta.length > 200 ? "…" : ""}
                            </div>
                          )}
                        </div>
                        {en.estado !== "no_entregado" && (
                          <button
                            className="btn-evaluar"
                            onClick={() => {
                              setModalEntrega(en)
                              setNotaEntrega(en.nota != null ? String(en.nota) : "")
                              setComentariosEntrega(en.comentarios_docente || "")
                              setMensaje("")
                            }}
                          >
                            {en.estado === "evaluado" ? "✏ Editar nota" : "📋 Evaluar"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {mensaje && vistaEjercicios !== "crear" && (
                <div style={{ marginTop:12, padding:"10px 14px", background:"rgba(0,163,255,0.08)", border:"1px solid rgba(0,163,255,0.20)", borderRadius:8, fontSize:13, color:"var(--primario-dim)" }}>
                  {mensaje}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Contenido informativo ──  Editor de los módulos teóricos. */}
          {tab === "contenido" && <EditorContenido />}

          {/* ── TAB: Usuarios (solo admin) ──  Crear usuarios y administrar la
              lista (cambiar rol o eliminar; el rol admin está protegido). */}
          {tab === "usuarios" && esAdmin && (
            <div className="panel-dos-col">
              {/* Columna izquierda: formulario para crear un usuario nuevo. */}
              <div className="card-mock" style={{ padding:"20px 24px" }}>
                <div className="panel-section-title">Crear usuario</div>
                <form onSubmit={crearUsuario} style={{ display:"grid", gap:10 }}>
                  <input className="campo-inicio" placeholder="Nombre completo (ej: Juan Pérez)"
                    value={nuevoU} onChange={e => setNuevoU(e.target.value)}/>
                  <input className="campo-inicio" placeholder="Correo electrónico" type="email"
                    value={nuevoCorreo} onChange={e => setNuevoCorreo(e.target.value)}/>
                  <input className="campo-inicio" placeholder="Contraseña" type="password"
                    value={nuevaC} onChange={e => setNuevaC(e.target.value)}/>
                  <select className="campo-inicio" value={nuevoR} onChange={e => setNuevoR(e.target.value)}>
                    <option value="estudiante">estudiante</option>
                    <option value="docente">docente</option>
                  </select>
                  <button className="boton-principal" type="submit" disabled={cargando}>
                    {cargando ? "Guardando..." : "Crear usuario"}
                  </button>
                </form>
              </div>
              {/* Columna derecha: tabla con todos los usuarios y sus acciones. */}
              <div className="card-mock" style={{ padding:"20px 24px" }}>
                <div className="panel-section-title">
                  Usuarios registrados
                  <span className="panel-section-count">{usuarios.length}</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                <table className="panel-tabla">
                  <thead><tr><th>ID</th><th>Nombre</th><th>Correo</th><th>Rol</th><th style={{ whiteSpace:"nowrap" }}></th></tr></thead>
                  <tbody>
                    {usuarios.map(u => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td><strong>{u.nombre || u.nombre_usuario}</strong></td>
                        <td style={{ fontSize: 12, color: "#8e8e93" }}>{u.correo || "—"}</td>
                        <td>
                          {editandoRolId === u.id ? (
                            <select
                              className="campo-inicio"
                              style={{ padding:"2px 6px", fontSize:12, height:"auto" }}
                              value={rolEditValor}
                              onChange={e => setRolEditValor(e.target.value)}
                            >
                              <option value="estudiante">estudiante</option>
                              <option value="docente">docente</option>
                              <option value="admin">admin</option>
                            </select>
                          ) : (
                            <span style={{
                              color: u.rol === "admin" ? "var(--primario-dim)"
                                   : u.rol === "docente" ? "var(--terciario-dim)"
                                   : "var(--texto-secundario)"
                            }}>{u.rol}</span>
                          )}
                        </td>
                        <td style={{ whiteSpace:"nowrap" }}>
                          {u.rol === "admin" ? (
                            <span style={{ fontSize:11, color:"var(--texto-apagado)", fontStyle:"italic" }}>protegido</span>
                          ) : (
                            <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                            {editandoRolId === u.id ? (
                              <>
                                <button
                                  className="btn-evaluar"
                                  style={{ padding:"3px 10px", fontSize:11 }}
                                  onClick={() => setConfirmRolModal({ nombre: u.nombre_usuario, nuevoRol: rolEditValor })}
                                  disabled={cargando}
                                >Guardar</button>
                                <button
                                  className="boton-secundario"
                                  style={{ padding:"3px 10px", fontSize:11 }}
                                  onClick={() => setEditandoRolId(null)}
                                >✕</button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="boton-secundario"
                                  style={{ padding:"3px 10px", fontSize:11 }}
                                  onClick={() => { setEditandoRolId(u.id); setRolEditValor(u.rol) }}
                                >Cambiar rol</button>
                                <button
                                  style={{ padding:"3px 10px", fontSize:11, borderRadius:6, border:"1px solid rgba(255,69,58,0.35)", background:"rgba(255,69,58,0.10)", color:"#ff453a", cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" }}
                                  onClick={() => setConfirmEliminar(u.nombre_usuario)}
                                  disabled={cargando}
                                >Eliminar</button>
                              </>
                            )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {usuarios.length === 0 && (
                      <tr><td colSpan={4} style={{ opacity:0.6 }}>Sin usuarios</td></tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Modal evaluación ──  Evaluar un intento de terminal: muestra el resumen
          del intento y un formulario para la nota (1.0–7.0) y comentarios. */}
      {modalEval && intentoSel && (
        <div className="modal-fondo">
          <div className="modal-tarjeta" style={{ maxWidth:520 }}>
            <div className="modal-cabecera">
              <h3 className="modal-titulo">
                Evaluar — {intentoSel.usuario} · Ejercicio #{intentoSel.ejercicio_id}
              </h3>
              <button className="boton-secundario" onClick={() => setModalEval(false)}>Cerrar</button>
            </div>
            <div className="modal-cuerpo">
              {/* Resumen del intento */}
              <div style={{
                background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
                borderRadius:10, padding:"12px 14px", marginBottom:16, fontSize:13
              }}>
                <div style={{ color:"#fff", fontWeight:700, marginBottom:8 }}>
                  {intentoSel.descripcion_ejercicio || "Ejercicio sin descripción"}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:12, color:"var(--texto-apagado)", fontFamily:"var(--mono)", fontSize:12 }}>
                  <span>Estado: <strong style={{ color:intentoSel.estado==="aprobado"?"var(--terciario-dim)":"#ffb4ab" }}>{intentoSel.estado}</strong></span>
                  <span>Porcentaje: <strong style={{ color:"#fff" }}>{intentoSel.porcentaje}%</strong></span>
                  <span>Tiempo: <strong style={{ color:"#fff" }}>{intentoSel.tiempo_seg}s</strong></span>
                  <span>Errores: <strong style={{ color:"#ffb4ab" }}>{intentoSel.errores}</strong></span>
                  {(intentoSel.ayudas_pedidas || 0) > 0 && (
                    <span>Ayudas: <strong style={{ color:"#fbbf24" }}>{intentoSel.ayudas_pedidas} (-{Math.min(intentoSel.ayudas_pedidas*5,30)}%)</strong></span>
                  )}
                </div>
              </div>

              {intentoSel.tiene_evaluacion && (
                <div style={{
                  background:"rgba(0,218,243,0.06)", border:"1px solid rgba(0,218,243,0.18)",
                  borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:12,
                  color:"var(--texto-secundario)"
                }}>
                  <strong style={{ color:"var(--terciario-dim)" }}>Evaluación existente:</strong>
                  {" "}Nota {intentoSel.nota}
                  {intentoSel.comentarios && ` — "${intentoSel.comentarios}"`}
                </div>
              )}

              <form onSubmit={enviarEval} style={{ display:"grid", gap:12 }}>
                <div>
                  <label style={{
                    display:"block", fontSize:11, fontFamily:"var(--mono)",
                    fontWeight:700, color:"var(--texto-apagado)",
                    letterSpacing:"0.06em", marginBottom:6
                  }}>
                    NOTA (1.0 — 7.0) *
                  </label>
                  <input
                    className="campo-inicio"
                    value={nota}
                    onChange={e => setNota(e.target.value)}
                    placeholder="Ej: 5.5"
                    type="number"
                    min="1" max="7" step="0.1"
                  />
                </div>
                <div>
                  <label style={{
                    display:"block", fontSize:11, fontFamily:"var(--mono)",
                    fontWeight:700, color:"var(--texto-apagado)",
                    letterSpacing:"0.06em", marginBottom:6
                  }}>
                    COMENTARIOS (opcional)
                  </label>
                  <textarea
                    className="campo-inicio"
                    style={{ minHeight:80, paddingTop:10, resize:"vertical" }}
                    value={comentarios}
                    onChange={e => setComentarios(e.target.value)}
                    placeholder="Escribe retroalimentación para el estudiante..."
                  />
                </div>
                {mensaje && (
                  <div style={{ fontSize:13, color:"#ffb4ab", fontFamily:"var(--mono)" }}>{mensaje}</div>
                )}
                <button className="boton-principal" type="submit" disabled={cargando || !nota.trim()}>
                  {cargando ? "Guardando..." : intentoSel.tiene_evaluacion ? "Actualizar evaluación" : "Guardar evaluación"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* ── Modal confirmar cambio de rol ──  Confirmación antes de cambiar el rol de un usuario. */}
      {confirmRolModal && (
        <div className="modal-fondo" onClick={() => setConfirmRolModal(null)}>
          <div className="modal-tarjeta" style={{ maxWidth:420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-cabecera">
              <h3 className="modal-titulo">⚙ ¿Cambiar rol?</h3>
              <button className="boton-secundario" onClick={() => setConfirmRolModal(null)}>✕</button>
            </div>
            <div className="modal-cuerpo" style={{ display:"grid", gap:16 }}>
              <div style={{ background:"rgba(41,151,255,0.06)", border:"1px solid rgba(41,151,255,0.20)", borderRadius:12, padding:"16px 18px" }}>
                <div style={{ fontSize:13, color:"#8e8e93", marginBottom:6 }}>Usuario</div>
                <div style={{ fontSize:17, fontWeight:700, color:"#f5f5f7" }}>{confirmRolModal.nombre}</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[
                  { l:"Nuevo rol", v: confirmRolModal.nuevoRol },
                ].map(({ l, v }) => (
                  <div key={l} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:10, padding:"11px 14px" }}>
                    <div style={{ fontSize:10, fontFamily:"var(--mono)", color:"#6e6e73", letterSpacing:"0.06em", marginBottom:4 }}>{l}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#f5f5f7" }}>{v}</div>
                  </div>
                ))}
              </div>
              <p style={{ margin:0, fontSize:13, color:"#8e8e93", lineHeight:1.6 }}>
                Se cambiará el rol del usuario. Puede revertirse asignando otro rol.
              </p>
              <div style={{ display:"flex", gap:10 }}>
                <button
                  className="btn-evaluar"
                  style={{ flex:1, padding:"13px 20px", fontSize:14, fontWeight:700 }}
                  disabled={cargando}
                  onClick={async () => {
                    await cambiarRol(confirmRolModal.nombre, confirmRolModal.nuevoRol)
                    setConfirmRolModal(null)
                    setEditandoRolId(null)
                  }}
                >
                  {cargando ? "Guardando..." : "Sí, cambiar rol"}
                </button>
                <button className="boton-secundario" style={{ flex:1, padding:"13px 20px", fontSize:14 }}
                  onClick={() => setConfirmRolModal(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminar usuario ──  Confirmación destructiva antes de borrar la cuenta. */}
      {confirmEliminar && (
        <div className="modal-fondo" onClick={() => setConfirmEliminar(null)}>
          <div className="modal-tarjeta" style={{ maxWidth:420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-cabecera">
              <h3 className="modal-titulo" style={{ color:"#ff453a" }}>🗑 ¿Eliminar usuario?</h3>
              <button className="boton-secundario" onClick={() => setConfirmEliminar(null)}>✕</button>
            </div>
            <div className="modal-cuerpo" style={{ display:"grid", gap:16 }}>
              <div style={{ background:"rgba(255,69,58,0.06)", border:"1px solid rgba(255,69,58,0.25)", borderRadius:12, padding:"16px 18px" }}>
                <div style={{ fontSize:13, color:"#8e8e93", marginBottom:6 }}>Usuario a eliminar</div>
                <div style={{ fontSize:17, fontWeight:700, color:"#f5f5f7" }}>{confirmEliminar}</div>
              </div>
              <div style={{ background:"rgba(255,159,10,0.06)", border:"1px solid rgba(255,159,10,0.22)", borderRadius:10, padding:"12px 14px" }}>
                <p style={{ margin:0, fontSize:13, color:"#fbbf24", lineHeight:1.6, fontWeight:600 }}>
                  ⚠ Esta acción no se puede deshacer. La cuenta del usuario será eliminada del sistema.
                </p>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button
                  style={{ flex:1, padding:"13px 20px", fontSize:14, fontWeight:700, borderRadius:980, background:"#ff453a", color:"#fff", border:"none", cursor: cargando ? "not-allowed" : "pointer", opacity: cargando ? 0.6 : 1 }}
                  disabled={cargando}
                  onClick={() => eliminarUsuario(confirmEliminar)}
                >
                  {cargando ? "Eliminando..." : "Sí, eliminar"}
                </button>
                <button className="boton-secundario" style={{ flex:1, padding:"13px 20px", fontSize:14 }}
                  onClick={() => setConfirmEliminar(null)}>
                  No, cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal IA asistir ──  Pide cuántos puntos generar y lanza la IA para
          rellenar el ejercicio (descripción, instrucciones y checklist). */}
      {modalIa && (
        <div className="modal-fondo">
          <div className="modal-tarjeta" style={{ maxWidth:420 }}>
            <div className="modal-cabecera">
              <h3 className="modal-titulo">✨ Generar ejercicio con IA</h3>
              <button className="boton-secundario" onClick={() => setModalIa(false)}>Cerrar</button>
            </div>
            <div className="modal-cuerpo">
              <p style={{ fontSize:13, color:"var(--texto-secundario)", marginTop:0, lineHeight:1.6 }}>
                La IA generará el ejercicio para <strong style={{ color:"#fff" }}>Nivel {ejNivel}</strong> de <strong style={{ color:"#fff" }}>{ejTipo === "ataque" ? "⚔ Ataque" : "🛡 Defensa"}</strong>
                {ejTitulo.trim()
                  ? <> basándose en el título <strong style={{ color:"#fff" }}>&quot;{ejTitulo}&quot;</strong>.</>
                  : <>, tomando como referencia el <strong style={{ color:"#fff" }}>tema del nivel</strong> (sin título específico).</>}
              </p>
              {/* Descripción del nivel para que el docente sepa qué corresponde */}
              <div style={{ fontSize:12, color:"#86efac", background:"rgba(48,209,88,0.06)", border:"1px solid rgba(48,209,88,0.20)", borderRadius:8, padding:"10px 12px", marginBottom:4, lineHeight:1.6 }}>
                <strong style={{ color:"#30d158" }}>Nivel {ejNivel} — {ejTipo === "ataque" ? "Ataque" : "Defensa"}:</strong>{" "}
                {CONTEXTO_NIVELES_IA[ejTipo]?.[Number(ejNivel)]?.split(". ").slice(1).join(". ") || ""}
              </div>
              <div style={{ fontSize:12, color:"var(--texto-apagado)", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"8px 12px", marginBottom:4 }}>
                ℹ️ La IA respetará la dificultad del nivel. Los estudiantes aprenden los comandos en la sección <strong style={{ color:"#fff" }}>Información</strong>.
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:11, fontFamily:"var(--mono)", fontWeight:700, color:"var(--texto-apagado)", letterSpacing:"0.06em", marginBottom:6 }}>
                  ¿CUÁNTOS PUNTOS A EVALUAR?
                </label>
                <input
                  className="campo-inicio"
                  type="number" min="1" max="10"
                  value={iaNumPuntos}
                  onChange={e => setIaNumPuntos(e.target.value)}
                />
              </div>
              {mensaje && <div style={{ fontSize:13, color:"#ffb4ab", marginBottom:10 }}>{mensaje}</div>}
              <button
                className="boton-principal"
                onClick={usarIa}
                disabled={cargandoIa}
                style={{ width:"100%" }}
              >
                {cargandoIa ? "Generando..." : "Generar con IA"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal evaluar entrega ejercicio ──  Evaluar la entrega de un ejercicio
          docente: muestra la respuesta del alumno y el formulario de nota/comentarios. */}
      {modalEntrega && (
        <div className="modal-fondo">
          <div className="modal-tarjeta" style={{ maxWidth:500 }}>
            <div className="modal-cabecera">
              <h3 className="modal-titulo">Evaluar entrega — {modalEntrega.usuario}</h3>
              <button className="boton-secundario" onClick={() => { setModalEntrega(null); setMensaje("") }}>Cerrar</button>
            </div>
            <div className="modal-cuerpo">
              {modalEntrega.respuesta && (
                <div style={{
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
                  borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:12,
                  color:"var(--texto-secundario)", fontFamily:"var(--mono)",
                  maxHeight:160, overflowY:"auto", whiteSpace:"pre-wrap",
                }}>
                  {modalEntrega.respuesta}
                </div>
              )}
              <form onSubmit={evaluarEntrega} style={{ display:"grid", gap:12 }}>
                <div>
                  <label style={{ display:"block", fontSize:11, fontFamily:"var(--mono)", fontWeight:700, color:"var(--texto-apagado)", letterSpacing:"0.06em", marginBottom:6 }}>
                    NOTA (1.0 — 7.0) *
                  </label>
                  <input
                    className="campo-inicio"
                    value={notaEntrega}
                    onChange={e => setNotaEntrega(e.target.value)}
                    placeholder="Ej: 5.5"
                    type="number" min="1" max="7" step="0.1"
                  />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:11, fontFamily:"var(--mono)", fontWeight:700, color:"var(--texto-apagado)", letterSpacing:"0.06em", marginBottom:6 }}>
                    COMENTARIOS (opcional)
                  </label>
                  <textarea
                    className="campo-inicio"
                    style={{ minHeight:80, paddingTop:10, resize:"vertical" }}
                    value={comentariosEntrega}
                    onChange={e => setComentariosEntrega(e.target.value)}
                    placeholder="Retroalimentación para el estudiante..."
                  />
                </div>
                {mensaje && <div style={{ fontSize:13, color:"#ffb4ab" }}>{mensaje}</div>}
                <button className="boton-principal" type="submit" disabled={cargando || !notaEntrega.trim()}>
                  {cargando ? "Guardando..." : "Guardar evaluación"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </GuardSesion>
  )
}