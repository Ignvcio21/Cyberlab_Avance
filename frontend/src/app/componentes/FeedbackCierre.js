"use client"

// FeedbackCierre — orientación automática que ve el ESTUDIANTE al terminar un
// ejercicio. NO es la nota (esa la pone el docente). Se alimenta del feedback
// del backend (IA o reglas) y del checklist de la propia sesión.

export default function FeedbackCierre({ cargando, feedback, items = [] }) {
  const esIA = feedback?.fuente === "ia"
  const logrados = items.filter(i => i.completado)
  const faltan = items.filter(i => !i.completado)

  return (
    <div style={{
      textAlign: "left", marginBottom: 20,
      background: esIA ? "rgba(94,92,230,0.07)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${esIA ? "rgba(94,92,230,0.30)" : "rgba(255,255,255,0.10)"}`,
      borderRadius: 16, padding: "16px 18px",
    }}>
      {/* Cabecera */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9, flexShrink: 0, fontSize: 15,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: esIA ? "linear-gradient(135deg,#5e5ce6,#2997ff)" : "rgba(255,255,255,0.10)",
        }}>{esIA ? "🤖" : "📋"}</div>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: esIA ? "#cfceff" : "#d6d6d6" }}>
          {esIA ? "Orientación automática" : "Resumen de tu desempeño"}
        </div>
        <span style={{
          marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 9, fontWeight: 800,
          letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--texto-apagado)",
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 6, padding: "3px 8px",
        }}>no es tu nota</span>
      </div>

      {/* Texto (IA o reglas) */}
      {cargando ? (
        <div style={{ fontSize: 13, color: "var(--texto-apagado)" }}>Generando orientación…</div>
      ) : (
        <div style={{ fontSize: 13, color: "var(--texto-secundario)", lineHeight: 1.6 }}>
          {feedback?.texto || `Completaste ${logrados.length} de ${items.length} objetivos del ejercicio.`}
        </div>
      )}

      {/* Checklist logrado / pendiente */}
      {items.length > 0 && (
        <ul style={{ listStyle: "none", margin: "12px 0 0", display: "flex", flexDirection: "column", gap: 7 }}>
          {logrados.map((it, i) => (
            <li key={`ok-${i}`} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5, lineHeight: 1.5, color: "var(--texto-secundario)" }}>
              <span style={{ flexShrink: 0 }}>✅</span><span>{it.descripcion}</span>
            </li>
          ))}
          {faltan.map((it, i) => (
            <li key={`no-${i}`} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5, lineHeight: 1.5, color: "var(--texto-secundario)" }}>
              <span style={{ flexShrink: 0 }}>❌</span><span>{it.descripcion} <em style={{ color: "var(--texto-apagado)" }}>— no realizado</em></span>
            </li>
          ))}
        </ul>
      )}

      {/* Pie */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)", fontSize: 11, color: "var(--texto-apagado)", display: "flex", gap: 6, alignItems: "flex-start" }}>
        {esIA
          ? <span>🔒 Orientación generada por IA a partir de tu sesión. Tu calificación final la asigna el docente.</span>
          : <span>Repasa los pasos pendientes en la sección <strong style={{ color: "#aeaeb2" }}>Información</strong>. Tu calificación la asigna el docente.</span>}
      </div>
    </div>
  )
}
