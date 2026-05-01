"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

export default function Dashboard() {
  const router = useRouter()

  const [nombreUsuario, setNombreUsuario] = useState("")
  const [estadisticas, setEstadisticas] = useState({
    total_eventos: 0,
    total_alertas: 0,
    eventos_recientes: [],
    alertas_recientes: []
  })

  const [mensaje, setMensaje] = useState("")
  const [comando, setComando] = useState("")
  const [inicioSesion, setInicioSesion] = useState(null)
  const [tiempoSesion, setTiempoSesion] = useState(0)

  const [reporte, setReporte] = useState(null)
  const [comandosValidos, setComandosValidos] = useState([])

  const [historialTerminal, setHistorialTerminal] = useState([
    "Sistema de Análisis CyberLab",
    "Escribe 'ayuda' para ver los comandos disponibles."
  ])

  const [escenarioActivo, setEscenarioActivo] = useState(null)
  const [estadoEscenario, setEstadoEscenario] = useState("inactivo")
  const [textoEscenario, setTextoEscenario] = useState(
    "No hay un escenario activo. Ejecuta una simulación para comenzar."
  )

  const [checklistEscenario, setChecklistEscenario] = useState({
    revisoAlertas: false,
    revisoEventos: false,
    bloqueoIp: false
  })

  const LIMITE_ESCENARIO_SEG = 300
  const [inicioEscenario, setInicioEscenario] = useState(null)
  const [tiempoRestanteEscenario, setTiempoRestanteEscenario] = useState(LIMITE_ESCENARIO_SEG)

  const [nivelActual, setNivelActual] = useState(1)
  const [nivelesCompletados, setNivelesCompletados] = useState({
    nivel1: false
  })

  // Se mantiene por compatibilidad con tu storage, aunque ya no se usa para bloquear
  const [guiasCompletadas, setGuiasCompletadas] = useState({
    nivel1: false,
    nivel2: false
  })

  // ✅ NUEVO: modal de bloqueo por curso no completado
  const [modalBloqueoAbierto, setModalBloqueoAbierto] = useState(false)
  const [modalBloqueoNivel, setModalBloqueoNivel] = useState(1)
  const [modalBloqueoProgreso, setModalBloqueoProgreso] = useState(0)

  const prefijosComandosValidos = useMemo(
    () => [
      "ayuda",
      "estado",
      "ver alertas",
      "ver eventos",
      "ver bloqueadas",
      "bloquear ip ",
      "desbloquear ip ",
      "limpiar"
    ],
    []
  )

  const claveProgreso = useMemo(() => {
    if (!nombreUsuario) return null
    return `cyberlab_progreso_${nombreUsuario}`
  }, [nombreUsuario])

  const calcularProgreso = () => {
    let total = 0
    if (checklistEscenario.revisoAlertas) total += 33
    if (checklistEscenario.revisoEventos) total += 33
    if (checklistEscenario.bloqueoIp) total += 34
    return total
  }

  const escenarioCompletado = () => calcularProgreso() === 100

  const cargarProgresoLocal = () => {
    if (!claveProgreso) return null
    const raw = localStorage.getItem(claveProgreso)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  const guardarProgresoLocal = (data) => {
    if (!claveProgreso) return
    const anterior = cargarProgresoLocal() || {}

    const combinado = {
      ...anterior,
      ...data,
      nivelActual,
      nivelesCompletados,
      guiasCompletadas
    }

    localStorage.setItem(claveProgreso, JSON.stringify(combinado))
  }

  // ✅ NUEVO: cálculo del progreso de lectura por nivel (según seccionesVistas)
  const SECCIONES_INFO = useMemo(
    () => [
      "introduccion",
      "objetivos",
      "fundamentos",
      "metodologia",
      "comandos",
      "evidencia",
      "procedimiento",
      "errores",
      "buenas_practicas",
      "criterio"
    ],
    []
  )

  const obtenerProgresoLecturaNivel = (nivel) => {
    const raw = cargarProgresoLocal()
    const secciones = raw?.seccionesVistas
    if (!secciones) return 0

    const clave = `nivel${nivel}`
    const mapa = secciones[clave]
    if (!mapa) return 0

    const total = SECCIONES_INFO.length
    let vistos = 0
    for (const id of SECCIONES_INFO) {
      if (mapa[id]) vistos += 1
    }

    return Math.round((vistos / total) * 100)
  }

  const abrirModalBloqueo = (nivel) => {
    const progreso = obtenerProgresoLecturaNivel(nivel)
    setModalBloqueoNivel(nivel)
    setModalBloqueoProgreso(progreso)
    setModalBloqueoAbierto(true)
  }

  const cerrarModalBloqueo = () => {
    setModalBloqueoAbierto(false)
  }

  const cargarEstadisticas = async () => {
    try {
      const respuesta = await fetch("http://127.0.0.1:8000/estadisticas")
      const datos = await respuesta.json()
      setEstadisticas(datos)
    } catch {
      setMensaje("No se pudieron cargar las estadísticas")
    }
  }

  const iniciarSesionSiEsNecesario = () => {
    if (!inicioSesion) {
      setInicioSesion(Date.now())
      setReporte(null)
    }
  }

  const reiniciarEscenarioPorTiempo = () => {
    setEscenarioActivo(null)
    setEstadoEscenario("inactivo")
    setTextoEscenario(
      "Tiempo agotado.\n\nEl escenario debe realizarse nuevamente.\n\nEjecuta una simulación para comenzar."
    )
    setChecklistEscenario({
      revisoAlertas: false,
      revisoEventos: false,
      bloqueoIp: false
    })
    setInicioEscenario(null)
    setTiempoRestanteEscenario(LIMITE_ESCENARIO_SEG)
    setReporte(null)

    setHistorialTerminal((anterior) => [
      ...anterior,
      "> sistema: tiempo agotado",
      "El escenario fue reiniciado por tiempo."
    ])

    guardarProgresoLocal({
      escenarioActivo: null,
      estadoEscenario: "inactivo",
      textoEscenario:
        "Tiempo agotado.\n\nEl escenario debe realizarse nuevamente.\n\nEjecuta una simulación para comenzar.",
      checklistEscenario: {
        revisoAlertas: false,
        revisoEventos: false,
        bloqueoIp: false
      },
      inicioEscenario: null,
      tiempoRestanteEscenario: LIMITE_ESCENARIO_SEG,
      nivelActual,
      nivelesCompletados
    })
  }

  const iniciarEscenario = (datos) => {
    const inicio = Date.now()

    setEscenarioActivo({
      tipo: datos.tipo_ataque,
      ip: datos.ip
    })

    setEstadoEscenario("iniciado")

    setChecklistEscenario({
      revisoAlertas: false,
      revisoEventos: false,
      bloqueoIp: false
    })

    const texto =
      `Escenario activo: ${datos.titulo_caso}\n\n${datos.texto_caso}\n\nSiguiente acción recomendada:\n${datos.siguiente_paso}`
    setTextoEscenario(texto)

    setInicioEscenario(inicio)
    setTiempoRestanteEscenario(LIMITE_ESCENARIO_SEG)
    setReporte(null)

    guardarProgresoLocal({
      escenarioActivo: { tipo: datos.tipo_ataque, ip: datos.ip },
      estadoEscenario: "iniciado",
      textoEscenario: texto,
      checklistEscenario: {
        revisoAlertas: false,
        revisoEventos: false,
        bloqueoIp: false
      },
      inicioEscenario: inicio,
      tiempoRestanteEscenario: LIMITE_ESCENARIO_SEG,
      nivelActual,
      nivelesCompletados
    })
  }

  const ejecutarSimulacionFuerzaBruta = async () => {
    iniciarSesionSiEsNecesario()

    try {
      const respuesta = await fetch("http://127.0.0.1:8000/simular/fuerza-bruta", {
        method: "POST"
      })

      const datos = await respuesta.json()

      setMensaje(datos.mensaje)
      await cargarEstadisticas()

      setHistorialTerminal((anterior) => [
        ...anterior,
        "> sistema: simulación de fuerza bruta ejecutada",
        datos.mensaje
      ])

      iniciarEscenario(datos)
    } catch {
      setMensaje("No se pudo ejecutar la simulación de fuerza bruta")
      setHistorialTerminal((anterior) => [
        ...anterior,
        "> sistema: error al ejecutar la simulación de fuerza bruta"
      ])
    }
  }

  const ejecutarSimulacionEscaneoPuertos = async () => {
    iniciarSesionSiEsNecesario()

    try {
      const respuesta = await fetch("http://127.0.0.1:8000/simular/escaneo-puertos", {
        method: "POST"
      })

      const datos = await respuesta.json()

      setMensaje(datos.mensaje)
      await cargarEstadisticas()

      setHistorialTerminal((anterior) => [
        ...anterior,
        "> sistema: simulación de escaneo de puertos ejecutada",
        datos.mensaje
      ])

      iniciarEscenario(datos)
    } catch {
      setMensaje("No se pudo ejecutar la simulación de escaneo de puertos")
      setHistorialTerminal((anterior) => [
        ...anterior,
        "> sistema: error al ejecutar la simulación de escaneo de puertos"
      ])
    }
  }

  const actualizarEscenarioDespuesComando = (comandoNormalizado, salida) => {
    if (!escenarioActivo) return

    if (comandoNormalizado === "ver alertas") {
      const nuevoChecklist = { ...checklistEscenario, revisoAlertas: true }
      setChecklistEscenario(nuevoChecklist)
      setEstadoEscenario("analizando_alertas")

      const nuevoTexto =
        "Análisis inicial completado.\n\nYa revisaste las alertas del incidente.\n\nAhora debes revisar el detalle del comportamiento del atacante.\n\nSiguiente acción recomendada:\nver eventos"
      setTextoEscenario(nuevoTexto)

      guardarProgresoLocal({
        escenarioActivo,
        estadoEscenario: "analizando_alertas",
        textoEscenario: nuevoTexto,
        checklistEscenario: nuevoChecklist,
        inicioEscenario,
        tiempoRestanteEscenario,
        nivelActual,
        nivelesCompletados
      })
      return
    }

    if (comandoNormalizado === "ver eventos") {
      const nuevoChecklist = { ...checklistEscenario, revisoEventos: true }
      setChecklistEscenario(nuevoChecklist)
      setEstadoEscenario("analizando_eventos")

      const ipObjetivo = escenarioActivo.ip
      const tipoEscenario =
        escenarioActivo.tipo === "Fuerza Bruta" ? "fuerza bruta" : "escaneo de puertos"
      const nuevoTexto =
        `Evidencia analizada.\n\nConfirmaste que el incidente corresponde a ${tipoEscenario} desde la IP ${ipObjetivo}.\n\nSiguiente acción recomendada:\nbloquear ip ${ipObjetivo}`
      setTextoEscenario(nuevoTexto)

      guardarProgresoLocal({
        escenarioActivo,
        estadoEscenario: "analizando_eventos",
        textoEscenario: nuevoTexto,
        checklistEscenario: nuevoChecklist,
        inicioEscenario,
        tiempoRestanteEscenario,
        nivelActual,
        nivelesCompletados
      })
      return
    }

    if (
      comandoNormalizado.startsWith("bloquear ip ") &&
      salida.toLowerCase().includes("bloqueada correctamente")
    ) {
      const nuevoChecklist = { ...checklistEscenario, bloqueoIp: true }
      setChecklistEscenario(nuevoChecklist)
      setEstadoEscenario("resuelto")

      const nuevosNiveles = { ...nivelesCompletados, nivel1: true }
      setNivelesCompletados(nuevosNiveles)
      setNivelActual((prev) => (prev < 2 ? 2 : prev))

      const nuevoTexto =
        "Escenario resuelto.\n\nLa IP atacante fue bloqueada correctamente.\n\nPuedes verificar el bloqueo con 'ver bloqueadas'.\n\nAhora ya puedes generar el reporte de sesión."
      setTextoEscenario(nuevoTexto)

      guardarProgresoLocal({
        escenarioActivo,
        estadoEscenario: "resuelto",
        textoEscenario: nuevoTexto,
        checklistEscenario: nuevoChecklist,
        inicioEscenario,
        tiempoRestanteEscenario,
        nivelActual: 2,
        nivelesCompletados: nuevosNiveles
      })
    }
  }

  const ejecutarComando = async (e) => {
    e.preventDefault()
    if (!comando.trim()) return
    iniciarSesionSiEsNecesario()

    const comandoActual = comando.trim()
    const comandoNormalizado = comandoActual.toLowerCase()
    setComando("")

    try {
      const respuesta = await fetch("http://127.0.0.1:8000/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comando: comandoActual })
      })

      const datos = await respuesta.json()

      if (datos.salida === "__LIMPIAR__") {
        setHistorialTerminal([])
      } else {
        setHistorialTerminal((anterior) => [...anterior, `> ${comandoActual}`, datos.salida])
      }

      const esComandoValido = prefijosComandosValidos.some((prefijo) =>
        comandoNormalizado === prefijo || comandoNormalizado.startsWith(prefijo)
      )

      if (
        esComandoValido &&
        datos.salida !== "__LIMPIAR__" &&
        !datos.salida.toLowerCase().includes("comando no reconocido")
      ) {
        setComandosValidos((anterior) => [...anterior, comandoActual])
      }

      actualizarEscenarioDespuesComando(comandoNormalizado, datos.salida)
      await cargarEstadisticas()
    } catch {
      setHistorialTerminal((anterior) => [
        ...anterior,
        `> ${comandoActual}`,
        "Error al conectar con la terminal del backend"
      ])
    }
  }

  const generarReporte = async () => {
    if (!escenarioCompletado()) {
      setMensaje("Debes completar el escenario (100%) antes de generar el reporte.")
      setHistorialTerminal((anterior) => [
        ...anterior,
        "> sistema: reporte bloqueado",
        "Completa el escenario antes de generar el reporte."
      ])
      return
    }

    try {
      const respuesta = await fetch("http://127.0.0.1:8000/reporte")
      const datos = await respuesta.json()

      const reporteActual = {
        nombreUsuario,
        duracionSegundos: tiempoSesion,
        totalEventos: datos.total_eventos,
        totalAlertas: datos.total_alertas,
        ipsBloqueadas: datos.ips_bloqueadas.map((ip) => ip.direccion_ip),
        comandosCorrectos: datos.acciones
          .filter((accion) => accion.resultado === "OK" && accion.comando !== "limpiar")
          .map((accion) => accion.comando),
        logros: [
          datos.total_eventos > 0 ? "Se ejecutaron simulaciones correctamente" : null,
          datos.total_alertas > 0 ? "Se detectaron alertas de seguridad" : null,
          datos.ips_bloqueadas.length > 0 ? "Se aplicaron bloqueos manuales de IP" : null,
          estadoEscenario === "resuelto" ? "El escenario activo fue completado" : null
        ].filter(Boolean),
        pendientes: [
          datos.total_eventos === 0 ? "No se ejecutaron ataques durante la sesión" : null,
          datos.total_alertas === 0 ? "No se generaron alertas en la sesión" : null,
          datos.ips_bloqueadas.length === 0 ? "No se aplicaron bloqueos manuales de IP" : null,
          estadoEscenario !== "resuelto" ? "El escenario activo no fue completado totalmente" : null
        ].filter(Boolean)
      }

      setReporte(reporteActual)

      setHistorialTerminal((anterior) => [
        ...anterior,
        "> sistema: reporte generado",
        "Reporte de sesión disponible en pantalla."
      ])
    } catch {
      setHistorialTerminal((anterior) => [
        ...anterior,
        "> sistema: error al generar reporte"
      ])
    }
  }

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

    cargarEstadisticas()
    const guardado = cargarProgresoLocal()
    if (guardado) {
      setGuiasCompletadas(guardado.guiasCompletadas || { nivel1: false, nivel2: false })
      setEscenarioActivo(guardado.escenarioActivo || null)
      setEstadoEscenario(guardado.estadoEscenario || "inactivo")
      setTextoEscenario(
        guardado.textoEscenario || "No hay un escenario activo. Ejecuta una simulación para comenzar."
      )
      setChecklistEscenario(
        guardado.checklistEscenario || { revisoAlertas: false, revisoEventos: false, bloqueoIp: false }
      )
      setInicioEscenario(guardado.inicioEscenario || null)
      setTiempoRestanteEscenario(
        typeof guardado.tiempoRestanteEscenario === "number"
          ? guardado.tiempoRestanteEscenario
          : LIMITE_ESCENARIO_SEG
      )
      setNivelActual(guardado.nivelActual || 1)
      setNivelesCompletados(guardado.nivelesCompletados || { nivel1: false })
    }

    const intervalo = setInterval(() => {
      cargarEstadisticas()
    }, 2000)

    return () => clearInterval(intervalo)
  }, [nombreUsuario])

  useEffect(() => {
    if (!inicioSesion) return
    const intervalo = setInterval(() => {
      setTiempoSesion(Math.floor((Date.now() - inicioSesion) / 1000))
    }, 1000)
    return () => clearInterval(intervalo)
  }, [inicioSesion])

  useEffect(() => {
    if (!inicioEscenario || estadoEscenario === "inactivo") return

    const intervalo = setInterval(() => {
      const transcurrido = Math.floor((Date.now() - inicioEscenario) / 1000)
      const restante = Math.max(0, LIMITE_ESCENARIO_SEG - transcurrido)
      setTiempoRestanteEscenario(restante)

      if (claveProgreso) {
        const guardado = cargarProgresoLocal() || {}
        guardarProgresoLocal({
          ...guardado,
          tiempoRestanteEscenario: restante,
          nivelActual,
          nivelesCompletados
        })
      }

      if (restante <= 0 && !escenarioCompletado()) {
        reiniciarEscenarioPorTiempo()
      }
    }, 1000)

    return () => clearInterval(intervalo)
  }, [inicioEscenario, estadoEscenario, checklistEscenario, claveProgreso, nivelActual, nivelesCompletados])

  const irAInformacion = (nivel) => {
    router.push(`/dashboard/informacion?nivel=${nivel}`)
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">
        <header className="hero-panel">
          <div>
            <div className="hero-badge">CENTRO DE OPERACIONES CYBERLAB</div>
            <h1 className="hero-title">Panel de ciberseguridad</h1>
            <p className="hero-subtitle">
              Operador activo: <strong>{nombreUsuario}</strong>
            </p>

            <div className="timer-box">
              Tiempo de sesión: <strong>{tiempoSesion}s</strong>
            </div>

            <div className="timer-box">
              Nivel actual: <strong>{nivelActual}</strong>
            </div>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem("nombre_usuario")
              if (claveProgreso) localStorage.removeItem(claveProgreso)
              router.push("/")
            }}
            className="logout-button"
          >
            Cerrar sesión
          </button>
        </header>

        <section className="learning-panel">
          <h2>Laboratorio de ciberseguridad</h2>
          <p>
            Entorno controlado para practicar análisis de eventos, revisión de alertas y respuesta ante incidentes
            mediante una terminal interactiva.
          </p>

          <div className="learning-grid">
            <div className="learning-box">
              <strong>Objetivos del ejercicio</strong>
              <ul>
                <li>Ejecutar una simulación de ataque</li>
                <li>Analizar eventos y alertas</li>
                <li>Identificar la IP atacante</li>
                <li>Aplicar defensa manual desde la terminal</li>
                <li>Generar un reporte final de la sesión</li>
              </ul>
            </div>

            <div className="learning-box">
              <strong>Comandos disponibles</strong>
              <ul>
                <li>ayuda</li>
                <li>estado</li>
                <li>ver eventos</li>
                <li>ver alertas</li>
                <li>ver bloqueadas</li>
                <li>bloquear ip 192.168.1.50</li>
                <li>desbloquear ip 192.168.1.50</li>
                <li>limpiar</li>
              </ul>
            </div>

            <div className="learning-box">
              <strong>Contenido didáctico</strong>
              <p style={{ marginTop: 8, marginBottom: 10 }}>
                Accede al curso del nivel antes de ejecutar la práctica.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="boton-secundario" onClick={() => irAInformacion(1)}>
                  Ir a información (Nivel 1)
                </button>
                <button
                  className="boton-secundario"
                  onClick={() => irAInformacion(2)}
                  disabled={!nivelesCompletados.nivel1}
                  title={!nivelesCompletados.nivel1 ? "Bloqueado: completa el Nivel 1" : ""}
                >
                  Ir a información (Nivel 2)
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="action-panel">
          <div>
            <h2>Simulación de ataques</h2>
            <p>Ejecuta un escenario de entrenamiento y observa el comportamiento del sistema en tiempo real.</p>
          </div>

          <div className="status-box">
            <span className="status-label">Estado</span>
            <span className="status-value">{mensaje || "Esperando acción del operador..."}</span>
          </div>

          <div className="attack-buttons">
            <button
              className="attack-button"
              onClick={() => {
                const progreso = obtenerProgresoLecturaNivel(1)
                if (progreso < 100) {
                  setMensaje("Debes completar el curso del Nivel 1 antes de iniciar la simulación.")
                  setHistorialTerminal((a) => [
                    ...a,
                    "> sistema: acceso bloqueado",
                    `Curso Nivel 1 incompleto (${progreso}%).`
                  ])
                  abrirModalBloqueo(1)
                  return
                }
                ejecutarSimulacionFuerzaBruta()
              }}
            >
              Iniciar simulación de fuerza bruta (Nivel 1)
            </button>

            <button
              className="attack-button secondary"
              onClick={() => {
                if (!nivelesCompletados.nivel1) {
                  setMensaje("Debes completar el Nivel 1 (Fuerza bruta) antes de acceder a este escenario.")
                  setHistorialTerminal((anterior) => [
                    ...anterior,
                    "> sistema: acceso bloqueado",
                    "Completa el Nivel 1 para desbloquear el escaneo de puertos."
                  ])
                  return
                }

                const progreso = obtenerProgresoLecturaNivel(2)
                if (progreso < 100) {
                  setMensaje("Debes completar el curso del Nivel 2 antes de iniciar la simulación.")
                  setHistorialTerminal((a) => [
                    ...a,
                    "> sistema: acceso bloqueado",
                    `Curso Nivel 2 incompleto (${progreso}%).`
                  ])
                  abrirModalBloqueo(2)
                  return
                }

                ejecutarSimulacionEscaneoPuertos()
              }}
              disabled={!nivelesCompletados.nivel1}
              title={!nivelesCompletados.nivel1 ? "Bloqueado: completa el Nivel 1" : ""}
            >
              Iniciar escaneo de puertos (Nivel 2)
            </button>

            <button className="report-button" onClick={generarReporte}>
              Generar reporte de sesión
            </button>
          </div>
        </section>

        <section className="mission-panel">
          <div className="panel-header">
            <h2>Escenario activo</h2>
            <span className="tag cyan-tag">
              {estadoEscenario === "resuelto" ? "RESUELTO" : "EN PROCESO"}
            </span>
          </div>

          <div className="status-box" style={{ marginTop: 0 }}>
            <span className="status-label">Tiempo restante</span>
            <span className="status-value">
              <strong>{tiempoRestanteEscenario}s</strong> / {LIMITE_ESCENARIO_SEG}s
            </span>
          </div>

          <pre className="mission-text">{textoEscenario}</pre>

          <div className="progress-wrapper">
            <div className="progress-top">
              <span>Progreso del escenario</span>
              <strong>{calcularProgreso()}%</strong>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${calcularProgreso()}%` }}></div>
            </div>
          </div>

          <div className="mission-progress">
            <div className={`mission-step ${checklistEscenario.revisoAlertas ? "done" : ""}`}>
              Revisar alertas
            </div>
            <div className={`mission-step ${checklistEscenario.revisoEventos ? "done" : ""}`}>
              Revisar eventos
            </div>
            <div className={`mission-step ${checklistEscenario.bloqueoIp ? "done" : ""}`}>
              Bloquear atacante
            </div>
          </div>
        </section>

        <section className="terminal-panel">
          <div className="panel-header">
            <h2>Terminal interactiva</h2>
            <span className="tag cyan-tag">MODO CONSOLA</span>
          </div>

          <div className="terminal-window">
            {historialTerminal.map((linea, indice) => (
              <div key={indice} className="terminal-line">
                {linea}
              </div>
            ))}
          </div>

          <form onSubmit={ejecutarComando} className="terminal-form">
            <span className="terminal-prefix">cyberlab@terminal:~$</span>
            <input
              type="text"
              value={comando}
              onChange={(e) => setComando(e.target.value)}
              placeholder="Escribe un comando..."
              className="terminal-input"
            />
          </form>
        </section>

        {reporte && (
          <section className="report-panel">
            <div className="panel-header">
              <h2>Reporte de sesión</h2>
              <span className="tag danger-tag">REPORTE</span>
            </div>

            <div className="report-grid">
              <div className="report-box">
                <span className="report-label">Operador</span>
                <span className="report-value">{reporte.nombreUsuario}</span>
              </div>

              <div className="report-box">
                <span className="report-label">Tiempo total</span>
                <span className="report-value">{reporte.duracionSegundos}s</span>
              </div>

              <div className="report-box">
                <span className="report-label">Eventos</span>
                <span className="report-value">{reporte.totalEventos}</span>
              </div>

              <div className="report-box">
                <span className="report-label">Alertas</span>
                <span className="report-value">{reporte.totalAlertas}</span>
              </div>
            </div>

            <div className="report-sections">
              <div className="report-box large">
                <h3>Comandos correctos utilizados</h3>
                {reporte.comandosCorrectos.length === 0 ? (
                  <p>No hay comandos registrados todavía.</p>
                ) : (
                  <ul>
                    {reporte.comandosCorrectos.map((cmd, indice) => (
                      <li key={`${cmd}-${indice}`}>{cmd}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="report-box large">
                <h3>IPs bloqueadas</h3>
                {reporte.ipsBloqueadas.length === 0 ? (
                  <p>No se bloquearon IPs en esta sesión.</p>
                ) : (
                  <ul>
                    {reporte.ipsBloqueadas.map((ip) => (
                      <li key={ip}>{ip}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="report-box large">
                <h3>Logros</h3>
                {reporte.logros.length === 0 ? (
                  <p>No hay logros registrados.</p>
                ) : (
                  <ul>
                    {reporte.logros.map((item, indice) => (
                      <li key={`logro-${indice}`}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="report-box large">
                <h3>Pendientes</h3>
                {reporte.pendientes.length === 0 ? (
                  <p>La sesión completó correctamente los objetivos básicos.</p>
                ) : (
                  <ul>
                    {reporte.pendientes.map((item, indice) => (
                      <li key={`pendiente-${indice}`}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="data-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Eventos recientes</h2>
              <span className="tag cyan-tag">ACTIVO</span>
            </div>

            <div className="event-list">
              {estadisticas.eventos_recientes.length === 0 ? (
                <div className="empty-box">No hay eventos aún</div>
              ) : (
                estadisticas.eventos_recientes.map((evento) => (
                  <div className="event-card" key={evento.id}>
                    <div className="event-top">
                      <h3>{evento.tipo_evento}</h3>
                      <span className="event-id">#{evento.id}</span>
                    </div>
                    <p>{evento.descripcion}</p>
                    <div className="event-meta">IP: {evento.ip_origen}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Alertas recientes</h2>
              <span className="tag danger-tag">ALERTA</span>
            </div>

            <div className="alert-list">
              {estadisticas.alertas_recientes.length === 0 ? (
                <div className="empty-box">No hay alertas aún</div>
              ) : (
                estadisticas.alertas_recientes.map((alerta) => (
                  <div className="alert-card" key={alerta.id}>
                    <div className="alert-top">
                      <h3>{alerta.titulo}</h3>
                      <span className="alert-severity">{alerta.severidad}</span>
                    </div>
                    <p>{alerta.descripcion}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* ✅ MODAL BLOQUEO (por curso incompleto) */}
        {modalBloqueoAbierto && (
          <div className="modal-fondo">
            <div className="modal-tarjeta">
              <div className="modal-cabecera">
                <h3 className="modal-titulo">
                  Acceso bloqueado — Curso obligatorio (Nivel {modalBloqueoNivel})
                </h3>
                <button className="boton-secundario" onClick={cerrarModalBloqueo}>
                  Cerrar
                </button>
              </div>

              <div className="modal-cuerpo">
                <p style={{ marginTop: 0 }}>
                  Debes completar el contenido del curso correspondiente antes de iniciar la simulación.
                </p>

                <div className="progress-wrapper" style={{ marginTop: 14 }}>
                  <div className="progress-top">
                    <span>Progreso de lectura (Nivel {modalBloqueoNivel})</span>
                    <strong>{modalBloqueoProgreso}%</strong>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${modalBloqueoProgreso}%` }}></div>
                  </div>
                </div>

                <p style={{ marginTop: 14 }}>
                  Para desbloquear la simulación, completa el <strong>100%</strong> del nivel.
                </p>
              </div>

              <div className="modal-pie">
                <div className="modal-botones">
                  <button className="boton-secundario" onClick={cerrarModalBloqueo}>
                    Volver
                  </button>

                  <button
                    className="boton-primario"
                    onClick={() => router.push(`/dashboard/informacion?nivel=${modalBloqueoNivel}`)}
                  >
                    Ir a información del nivel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}