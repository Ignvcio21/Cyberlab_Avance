export default function Loading() {
  return (
    <main className="carga">
      <div className="carga-card">
        <div className="carga-logo">
          <div className="carga-mark">CL</div>
          <div className="carga-title">
            <div className="carga-name">CYBERLAB</div>
            <div className="carga-sub">Laboratorio de ciberseguridad</div>
          </div>
        </div>

        <div className="carga-bar">
          <div className="carga-bar-fill" />
        </div>

        <div className="carga-foot">Inicializando entorno…</div>
      </div>
    </main>
  )
}