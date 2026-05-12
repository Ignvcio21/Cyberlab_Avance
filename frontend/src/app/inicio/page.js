"use client"

import GuardSesion from "../componentes/GuardSesion"
import BarraSuperior from "../componentes/BarraSuperior"
import TransicionPagina from "../componentes/TransicionPagina"

export default function InicioPlataforma() {
  return (
    <GuardSesion>
      <TransicionPagina>
      <main className="inicio-plataforma-simple">
        <BarraSuperior paginaActiva="inicio" />

        <section className="inicio-simple">
          <div className="inicio-simple-card">
            <h1 className="inicio-simple-titulo">CyberLab</h1>
            <p className="inicio-simple-texto">
              Plataforma web de entrenamiento práctico para aprendizaje progresivo en pentesting y
              respuesta ante incidentes, basada en evidencia, verificación y registro de desempeño
              en entornos controlados.
            </p>
          </div>
        </section>
      </main>
      </TransicionPagina>
    </GuardSesion>
  )
}