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
  const [intentoRegistrado, setIntentoRegistrado] = useState(false)

  // Terminal: UI en español, pero comandos estilo Kali (inglés)
  const [historialTerminal, setHistorialTerminal] = useState([
    "CyberLab Terminal — modo kali-like",
    "Escribe 'help' para ver los comandos disponibles."
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

  const [requiereDesbloqueoPrevio, setRequiereDesbloqueoPrevio] = useState(false)

  const LIMITE_ESCENARIO_SEG = 300
  const [inicioEscenario, setInicioEscenario] = useState(null)
  const [tiempoRestanteEscenario, setTiempoRestanteEscenario] = useState(LIMITE_ESCENARIO_SEG)

  const [nivelActual, setNivelActual] = useState(1)
  const [nivelesCompletados, setNivelesCompletados] = useState({
    nivel1: false
  })

  const [guiasCompletadas, setGuiasCompletadas] = useState({
    nivel1: false,
    nivel2: false
  })

  const [modalBloqueoAbierto, setModalBloqueoAbierto] = useState(false)
  const [modalBloqueoNivel, setModalBloqueoNivel] = useState(1)
  const [modalBloqueoProgreso, setModalBloqueoProgreso] = useState(0)

  const prefijosComandosValidos = useMemo(
    () => [
      "help",
      "status",
      "show alerts",
      "show events",
      "show blocked",
      "block ip ",
      "unblock ip ",
      "clear"
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

  const normalizarComandosEscenario = (texto) => {
    if (typeof texto !== "string") return ""
    let t = texto

    t = t.replaceAll("ver alertas", "show alerts")
    t = t.replaceAll("ver eventos", "show events")
    t = t.replaceAll("ver bloqueadas", "show blocked")
    t = t.replaceAll("ver bloqueados", "show blocked")
    t = t.replaceAll("bloquear ip ", "block ip ")
    t = t.replaceAll("desbloquear ip ", "unblock ip ")

    t = t.replaceAll("Ver alertas", "show alerts")
    t = t.replaceAll("Ver eventos", "show events")
    t = t.replaceAll("Ver bloqueadas", "show blocked")
    t = t.replaceAll("Bloquear ip ", "block ip ")
    t = t.replaceAll("Desbloquear ip ", "unblock ip ")

    return t
  }

  const cargarEstadisticas = async () => {
    try {
      const respuesta = await fetch("http://127.0.0.1:8000/estadisticas")
      const datos = await respuesta.json()
      setEstadisticas({
        total_eventos: datos?.total_eventos ?? 0,
        total_alertas: datos?.total_alertas ?? 0,
        eventos_recientes: Array.isArray(datos?.eventos_recientes) ? datos.eventos_recientes : [],
        alertas_recientes: Array.isArray(datos?.alertas_recientes) ? datos.alertas_recientes : []
      })
    } catch {
      setMensaje("No se pudieron cargar las estadísticas")
      setEstadisticas((prev) => ({
        ...prev,
        eventos_recientes: [],
        alertas_recientes: []
      }))
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
    setIntentoRegistrado(false)
    setRequiereDesbloqueoPrevio(false)

    setHistorialTerminal((anterior) => [
      ...anterior,
      "> system: time expired",
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
      nivelesCompletados,
      requiereDesbloqueoPrevio: false
    })
  }

  const iniciarEscenario = (datos) => {
    const inicio = Date.now()

    const variables = Array.isArray(datos?.variables) ? datos.variables : []
    const obtenerVariable = (clave) => {
      const encontrada = variables.find((v) => v.clave === clave)
      return encontrada?.valor || ""
    }

    const ipCaso =
      datos?.ip ||
      obtenerVariable("ip_atacante") ||
      obtenerVariable("ip_origen") ||
      "—"

    const tipoCaso = datos?.tipo_ataque || datos?.tipo || "Escenario"

    const nuevoEscenario = {
      id: datos?.id || null,
      ejercicio_id: datos?.ejercicio_id || null,
      plantilla_id: datos?.plantilla_id || null,
      tipo: tipoCaso,
      ip: ipCaso,
      variables
    }

    const checklistInicial = {
      revisoAlertas: false,
      revisoEventos: false,
      bloqueoIp: false
    }

    setEscenarioActivo(nuevoEscenario)
    setEstadoEscenario("iniciado")
    setChecklistEscenario(checklistInicial)
    setRequiereDesbloqueoPrevio(false)

    const texto =
      `Escenario activo: ${datos?.titulo_caso || "Caso de entrenamiento"}\n\n` +
      `${normalizarComandosEscenario(datos?.texto_caso || "")}\n\n` +
      `Siguiente acción recomendada:\nshow alerts`

    setTextoEscenario(texto)
    setInicioEscenario(inicio)
    setTiempoRestanteEscenario(LIMITE_ESCENARIO_SEG)
    setReporte(null)
    setIntentoRegistrado(false)

    guardarProgresoLocal({
      escenarioActivo: nuevoEscenario,
      estadoEscenario: "iniciado",
      textoEscenario: texto,
      checklistEscenario: checklistInicial,
      inicioEscenario: inicio,
      tiempoRestanteEscenario: LIMITE_ESCENARIO_SEG,
      nivelActual,
      nivelesCompletados,
      requiereDesbloqueoPrevio: false
    })
  }
  const ejecutarSimulacionFuerzaBruta = async () => {
    iniciarSesionSiEsNecesario()

    try {
      const respuesta = await fetch("http://127.0.0.1:8000/simular/fuerza-bruta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre_usuario: nombreUsuario })
      })

      const datos = await respuesta.json()

      if (!respuesta.ok) {
        setMensaje(datos?.detail || "No se pudo ejecutar la simulación de fuerza bruta")
        return
      }

      setMensaje(datos?.mensaje || "Simulación de fuerza bruta ejecutada")
      await cargarEstadisticas()

      setHistorialTerminal((anterior) => [
        ...anterior,
        "> system: brute-force simulation executed",
        datos?.mensaje || "OK"
      ])

      iniciarEscenario(datos)
    } catch {
      setMensaje("No se pudo ejecutar la simulación de fuerza bruta")
      setHistorialTerminal((anterior) => [
        ...anterior,
        "> system: error executing brute-force simulation"
      ])
    }
  }

  const ejecutarSimulacionEscaneoPuertos = async () => {
    iniciarSesionSiEsNecesario()

    try {
      const respuesta = await fetch("http://127.0.0.1:8000/simular/escaneo-puertos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre_usuario: nombreUsuario })
      })

      const datos = await respuesta.json()

      if (!respuesta.ok) {
        setMensaje(datos?.detail || "No se pudo ejecutar la simulación de escaneo de puertos")
        return
      }

      setMensaje(datos?.mensaje || "Simulación de escaneo de puertos ejecutada")
      await cargarEstadisticas()

      setHistorialTerminal((anterior) => [
        ...anterior,
        "> system: port-scan simulation executed",
        datos?.mensaje || "OK"
      ])

      iniciarEscenario(datos)
    } catch {
      setMensaje("No se pudo ejecutar la simulación de escaneo de puertos")
      setHistorialTerminal((anterior) => [
        ...anterior,
        "> system: error executing port-scan simulation"
      ])
    }
  }

  const registrarIntentoFinalizado = async () => {
    if (intentoRegistrado) return false
    if (!nombreUsuario) return false
    if (!escenarioActivo) return false

    const tiempoUsado = Math.max(0, LIMITE_ESCENARIO_SEG - tiempoRestanteEscenario)

    const ejercicioId =
      escenarioActivo.ejercicio_id ||
      (escenarioActivo.tipo === "Escaneo de Puertos" ? 2 : 1)

    try {
      const respuesta = await fetch("http://127.0.0.1:8000/intentos/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_usuario: nombreUsuario,
          ejercicio_id: ejercicioId,
          tiempo_seg: tiempoUsado,
          errores: 0,
          porcentaje: 100,
          estado: "aprobado"
        })
      })

      const datos = await respuesta.json()

      if (!respuesta.ok) {
        console.error("No se pudo registrar el intento:", datos)
        setHistorialTerminal((anterior) => [
          ...anterior,
          "> system: attempt register error",
          JSON.stringify(datos)
        ])
        return false
      }

      setIntentoRegistrado(true)

      setHistorialTerminal((anterior) => [
        ...anterior,
        "> system: attempt registered",
        "Intento finalizado registrado correctamente."
      ])

      return true
    } catch (error) {
      console.error("Error registrando intento:", error)
      setHistorialTerminal((anterior) => [
        ...anterior,
        "> system: attempt register error",
        "No se pudo conectar con /intentos/crear"
      ])
      return false
    }
  }

  const actualizarEscenarioDespuesComando = async (comandoNormalizado, salida) => {
    if (!escenarioActivo) return

    const salidaStr = typeof salida === "string" ? salida : String(salida ?? "")
    const salidaLower = salidaStr.toLowerCase()
    const ipObjetivo = escenarioActivo.ip

    const guardarEstado = (
      nuevoChecklist,
      nuevoEstado,
      nuevoTexto,
      nuevosNiveles = nivelesCompletados,
      nuevoNivel = nivelActual
    ) => {
      setChecklistEscenario(nuevoChecklist)
      setEstadoEscenario(nuevoEstado)
      setTextoEscenario(nuevoTexto)
      setNivelesCompletados(nuevosNiveles)
      setNivelActual(nuevoNivel)

      guardarProgresoLocal({
        escenarioActivo,
        estadoEscenario: nuevoEstado,
        textoEscenario: nuevoTexto,
        checklistEscenario: nuevoChecklist,
        inicioEscenario,
        tiempoRestanteEscenario,
        nivelActual: nuevoNivel,
        nivelesCompletados: nuevosNiveles,
        requiereDesbloqueoPrevio: false
      })
    }

    const construirTextoSegunChecklist = (checklist) => {
      if (!checklist.revisoAlertas) {
        return (
          "Acción registrada.\n\n" +
          "Todavía falta revisar las alertas del incidente.\n\n" +
          "Siguiente acción recomendada:\nshow alerts"
        )
      }

      if (!checklist.revisoEventos) {
        return (
          "Análisis inicial completado.\n\n" +
          "Ya revisaste las alertas del incidente.\n\n" +
          "Ahora debes revisar el detalle del comportamiento del atacante.\n\n" +
          "Siguiente acción recomendada:\nshow events"
        )
      }

      if (!checklist.bloqueoIp) {
        return (
          `Evidencia analizada.\n\n` +
          `Ya revisaste alertas y eventos del incidente.\n\n` +
          `Ahora debes contener al atacante.\n\n` +
          `Siguiente acción recomendada:\nblock ip ${ipObjetivo}`
        )
      }

      return (
        "Escenario resuelto.\n\n" +
        "La IP atacante fue bloqueada correctamente y se completaron todos los pasos del análisis.\n\n" +
        "Puedes verificar el bloqueo con:\nshow blocked\n\n" +
        "Ahora puedes generar el reporte de sesión o iniciar un nuevo ejercicio."
      )
    }

    const resolverEstado = (checklist) => {
      if (checklist.revisoAlertas && checklist.revisoEventos && checklist.bloqueoIp) {
        return "resuelto"
      }

      if (checklist.bloqueoIp) {
        return "conteniendo_incidente"
      }

      if (checklist.revisoEventos) {
        return "analizando_eventos"
      }

      if (checklist.revisoAlertas) {
        return "analizando_alertas"
      }

      return "iniciado"
    }

    if (comandoNormalizado === "show alerts") {
      const nuevoChecklist = {
        ...checklistEscenario,
        revisoAlertas: true
      }

      const nuevoEstado = resolverEstado(nuevoChecklist)
      const nuevoTexto = construirTextoSegunChecklist(nuevoChecklist)

      guardarEstado(nuevoChecklist, nuevoEstado, nuevoTexto)
      return
    }

    if (comandoNormalizado === "show events") {
      const nuevoChecklist = {
        ...checklistEscenario,
        revisoEventos: true
      }

      const nuevoEstado = resolverEstado(nuevoChecklist)
      const nuevoTexto = construirTextoSegunChecklist(nuevoChecklist)

      guardarEstado(nuevoChecklist, nuevoEstado, nuevoTexto)
      return
    }

    if (comandoNormalizado.startsWith("block ip ")) {
      const bloqueoOk =
        salidaLower.includes("iptables: blocked") ||
        salidaLower.includes("already blocked") ||
        salidaLower.includes("blocked successfully") ||
        salidaLower.includes("ip bloqueada") ||
        salidaLower.includes("bloqueada correctamente")

      if (!bloqueoOk) return

      const nuevoChecklist = {
        ...checklistEscenario,
        bloqueoIp: true
      }

      const estaCompleto =
        nuevoChecklist.revisoAlertas &&
        nuevoChecklist.revisoEventos &&
        nuevoChecklist.bloqueoIp

      const nuevoEstado = estaCompleto ? "resuelto" : resolverEstado(nuevoChecklist)
      const nuevoTexto = construirTextoSegunChecklist(nuevoChecklist)

      const nuevosNiveles = estaCompleto
        ? { ...nivelesCompletados, nivel1: true }
        : nivelesCompletados

      const nuevoNivel = estaCompleto && nivelActual < 2 ? 2 : nivelActual

      guardarEstado(nuevoChecklist, nuevoEstado, nuevoTexto, nuevosNiveles, nuevoNivel)

      if (estaCompleto) {
        await registrarIntentoFinalizado()
      }

      return
    }

    if (comandoNormalizado === "show blocked") {
      const nuevoTexto =
        textoEscenario +
        "\n\nVerificación realizada con:\nshow blocked"

      guardarProgresoLocal({
        escenarioActivo,
        estadoEscenario,
        textoEscenario: nuevoTexto,
        checklistEscenario,
        inicioEscenario,
        tiempoRestanteEscenario,
        nivelActual,
        nivelesCompletados,
        requiereDesbloqueoPrevio: false
      })

      setTextoEscenario(nuevoTexto)
      return
    }

    if (comandoNormalizado.startsWith("unblock ip ")) {
      const desbloqueoOk =
        salidaLower.includes("iptables: unblocked") ||
        salidaLower.includes("unblocked") ||
        salidaLower.includes("was not blocked") ||
        salidaLower.includes("not blocked")

      if (!desbloqueoOk) return

      const nuevoTexto =
        "IP desbloqueada.\n\n" +
        "Este comando no avanza el ejercicio actual, solo elimina una regla de bloqueo.\n\n" +
        "Para continuar el entrenamiento, inicia una nueva simulación desde el botón correspondiente."

      setTextoEscenario(nuevoTexto)
      setRequiereDesbloqueoPrevio(false)

      guardarProgresoLocal({
        escenarioActivo,
        estadoEscenario,
        textoEscenario: nuevoTexto,
        checklistEscenario,
        inicioEscenario,
        tiempoRestanteEscenario,
        nivelActual,
        nivelesCompletados,
        requiereDesbloqueoPrevio: false
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

    const prompt = `cyberlab@kali:~$ ${comandoActual}`

    try {
      const respuesta = await fetch("http://127.0.0.1:8000/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_usuario: nombreUsuario,
          comando: comandoActual
        })
      })

      const datos = await respuesta.json()
      const salida = datos?.salida ?? ""

      if (salida === "__LIMPIAR__") {
        setHistorialTerminal([
          "CyberLab Terminal — modo kali-like",
          "Escribe 'help' para ver los comandos disponibles."
        ])
      } else {
        setHistorialTerminal((anterior) => [
          ...anterior,
          prompt,
          ...(salida ? String(salida).split("\n") : [""])
        ])
      }

      const esComandoValido = prefijosComandosValidos.some(
        (prefijo) => comandoNormalizado === prefijo || comandoNormalizado.startsWith(prefijo)
      )

      if (
        esComandoValido &&
        salida !== "__LIMPIAR__" &&
        typeof salida === "string" &&
        !salida.toLowerCase().includes("command not recognized") &&
        !salida.toLowerCase().includes("command not found")
      ) {
        setComandosValidos((anterior) => [...anterior, comandoActual])
      }

      await actualizarEscenarioDespuesComando(comandoNormalizado, salida)
      await cargarEstadisticas()
    } catch {
      setHistorialTerminal((anterior) => [
        ...anterior,
        prompt,
        "Error: no se pudo conectar con la terminal del backend."
      ])
    }
  }

  const generarReporte = async () => {
  if (!escenarioCompletado()) {
    setMensaje("Debes completar el escenario (100%) antes de generar el reporte.")
    setHistorialTerminal((anterior) => [
      ...anterior,
      "> system: report blocked",
      "Completa el escenario antes de generar el reporte."
    ])
    return
  }

  await registrarIntentoFinalizado()

  const reporteActual = {
    nombreUsuario,
    duracionSegundos: tiempoSesion,
    totalEventos: estadisticas.total_eventos ?? 0,
    totalAlertas: estadisticas.total_alertas ?? 0,
    ipsBloqueadas: [],
    comandosCorrectos: comandosValidos,
    logros: [
      "El escenario activo fue completado",
      "Se revisaron alertas del incidente",
      "Se revisaron eventos del incidente",
      "Se aplicó una acción de contención sobre la IP atacante"
    ],
    pendientes: []
  }

  try {
    const respuesta = await fetch("http://127.0.0.1:8000/reporte")

    if (respuesta.ok) {
      const datos = await respuesta.json()

      reporteActual.totalEventos = datos.total_eventos ?? reporteActual.totalEventos
      reporteActual.totalAlertas = datos.total_alertas ?? reporteActual.totalAlertas
      reporteActual.ipsBloqueadas = Array.isArray(datos.ips_bloqueadas)
        ? datos.ips_bloqueadas.map((ip) => ip.direccion_ip || ip.ip || ip)
        : []

      reporteActual.comandosCorrectos = Array.isArray(datos.acciones)
        ? datos.acciones
            .filter((accion) => accion.resultado === "OK" && accion.comando !== "clear")
            .map((accion) => accion.comando)
        : comandosValidos
    }
  } catch {
    console.warn("Endpoint /reporte no disponible. Se generó reporte local.")
  }

  setReporte(reporteActual)

  setHistorialTerminal((anterior) => [
    ...anterior,
    "> system: report generated",
    "Reporte de sesión disponible en pantalla."
  ])
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
      setRequiereDesbloqueoPrevio(Boolean(guardado.requiereDesbloqueoPrevio))
      setIntentoRegistrado(false)
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
          nivelesCompletados,
          requiereDesbloqueoPrevio
        })
      }

      if (restante <= 0 && !escenarioCompletado()) {
        reiniciarEscenarioPorTiempo()
      }
    }, 1000)

    return () => clearInterval(intervalo)
  }, [inicioEscenario, estadoEscenario, checklistEscenario, claveProgreso, nivelActual, nivelesCompletados, requiereDesbloqueoPrevio])

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
              <strong>Comandos disponibles (modo Kali)</strong>
              <ul>
                <li>help</li>
                <li>status</li>
                <li>show events</li>
                <li>show alerts</li>
                <li>show blocked</li>
                <li>block ip 192.168.1.50</li>
                <li>unblock ip 192.168.1.50</li>
                <li>clear</li>
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
                    "> system: access blocked",
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
                    "> system: access blocked",
                    "Completa el Nivel 1 para desbloquear el escaneo de puertos."
                  ])
                  return
                }

                const progreso = obtenerProgresoLecturaNivel(2)
                if (progreso < 100) {
                  setMensaje("Debes completar el curso del Nivel 2 antes de iniciar la simulación.")
                  setHistorialTerminal((a) => [
                    ...a,
                    "> system: access blocked",
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
            <span className="terminal-prefix">cyberlab@kali:~$</span>
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
              {(estadisticas?.eventos_recientes || []).length === 0 ? (
                <div className="empty-box">No hay eventos aún</div>
              ) : (
                (estadisticas.eventos_recientes || []).map((evento) => (
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
              {(estadisticas?.alertas_recientes || []).length === 0 ? (
                <div className="empty-box">No hay alertas aún</div>
              ) : (
                (estadisticas.alertas_recientes || []).map((alerta) => (
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
