// reporteExport.js — generador de reportes imprimibles (→ PDF desde el navegador).
// Documento claro, ordenado y con marca CyberLab. Compartido por las vistas
// que exportan datos (notas, listas, resúmenes). El CSV crudo se mantiene aparte.

const escapar = (v) => String(v ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

// Color de una nota (1.0–7.0) o un porcentaje, para los badges del reporte
const colorNota = (n) => {
  const x = parseFloat(n)
  if (isNaN(x)) return "#6b7280"
  return x >= 4 ? "#15803d" : "#b91c1c"
}
const colorPct = (p) => {
  const x = parseFloat(p)
  if (isNaN(x)) return "#6b7280"
  return x >= 70 ? "#15803d" : x >= 40 ? "#b45309" : "#b91c1c"
}

const celda = (valor, formato) => {
  const v = escapar(valor)
  if (valor == null || valor === "" || valor === "—") return `<span class="vacio">—</span>`
  switch (formato) {
    case "nota":
      if (valor === "Sin evaluar") return `<span class="badge gris">Sin evaluar</span>`
      return `<span class="badge" style="color:${colorNota(valor)};border-color:${colorNota(valor)}33;background:${colorNota(valor)}12">${v}</span>`
    case "porcentaje":
      return `<span class="badge" style="color:${colorPct(valor)};border-color:${colorPct(valor)}33;background:${colorPct(valor)}12">${v}</span>`
    case "estado": {
      const ok = /aprob|evaluad|complet/i.test(valor)
      const warn = /pend|entreg/i.test(valor)
      const c = ok ? "#15803d" : warn ? "#b45309" : "#b91c1c"
      return `<span class="badge" style="color:${c};border-color:${c}33;background:${c}12">${v}</span>`
    }
    case "mono":
      return `<span class="mono">${v}</span>`
    default:
      return v
  }
}

const tablaHTML = (columnas, filas) => {
  const thead = `<tr>${columnas.map(c => `<th style="text-align:${c.align || "left"}">${escapar(c.label)}</th>`).join("")}</tr>`
  const tbody = filas.map(f => `<tr>${columnas.map(c =>
    `<td style="text-align:${c.align || "left"}">${celda(f[c.key], c.formato)}</td>`).join("")}</tr>`).join("")
  return `<table><thead>${thead}</thead><tbody>${tbody ||
    `<tr><td colspan="${columnas.length}" style="text-align:center;color:#9aa4b2;padding:30px">Sin datos.</td></tr>`}</tbody></table>`
}

/**
 * Abre un reporte imprimible en una ventana nueva.
 * @param {object} cfg
 * @param {string} cfg.titulo        — título del documento
 * @param {string} [cfg.subtitulo]   — línea bajo el título
 * @param {Array<{label,valor,color?}>} [cfg.resumen] — tarjetas de resumen
 * @param {Array<{key,label,align?,formato?}>} [cfg.columnas] — tabla única
 * @param {Array<object>} [cfg.filas] — filas de la tabla única
 * @param {Array<{titulo?,columnas,filas}>} [cfg.secciones] — varias tablas con encabezado
 */
export function abrirReporteImprimible({ titulo, subtitulo, resumen = [], columnas, filas, secciones, parrafos = [] }) {
  const fecha = new Date().toLocaleString("es-CL", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  })

  const cards = resumen.length ? `
    <div class="resumen">
      ${resumen.map(r => `
        <div class="rcard">
          <div class="rvalor" style="${r.color ? `color:${r.color}` : ""}">${escapar(r.valor)}</div>
          <div class="rlabel">${escapar(r.label)}</div>
        </div>`).join("")}
    </div>` : ""

  // Tablas: una simple o varias secciones con encabezado
  const totalFilas = secciones
    ? secciones.reduce((s, x) => s + (x.filas?.length || 0), 0)
    : (filas?.length || 0)
  const tablas = secciones
    ? secciones.map(s => `${s.titulo ? `<h2 class="seccion">${escapar(s.titulo)}</h2>` : ""}${tablaHTML(s.columnas, s.filas || [])}`).join("")
    : (columnas ? tablaHTML(columnas, filas || []) : "")
  // Bloques de texto libre (observación del estudiante, comentarios, etc.)
  const bloques = parrafos.map(p =>
    `<h2 class="seccion">${escapar(p.titulo)}</h2><p class="ptexto">${escapar(p.texto) || "<span class='vacio'>—</span>"}</p>`).join("")
  const contenido = tablas + bloques

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/>
<title>${escapar(titulo)} — CyberLab</title>
<style>
  :root{ --azul:#1d6fe0; --tinta:#1a2433; --suave:#5b6878; --linea:#e6e9ef; --fondo:#f4f6fa; }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:var(--fondo);color:var(--tinta);
       font-size:13px;line-height:1.5;padding:32px 24px 64px;}
  .doc{max-width:920px;margin:0 auto;background:#fff;border:1px solid var(--linea);
       border-radius:16px;overflow:hidden;box-shadow:0 6px 30px rgba(20,40,80,0.06);}
  .cab{padding:26px 30px;border-bottom:3px solid var(--azul);display:flex;align-items:center;gap:14px;}
  .logo{width:42px;height:42px;border-radius:11px;background:linear-gradient(135deg,#2997ff,#5e5ce6);
        display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:15px;flex-shrink:0;}
  .cab h1{font-size:20px;font-weight:800;letter-spacing:-0.3px;}
  .cab .marca{font-size:11px;font-weight:700;color:var(--azul);letter-spacing:0.12em;text-transform:uppercase;}
  .cab .sub{font-size:12px;color:var(--suave);margin-top:2px;}
  .cab .fecha{margin-left:auto;text-align:right;font-size:11px;color:var(--suave);}
  .cuerpo{padding:24px 30px 30px;}
  .resumen{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:24px;}
  .rcard{background:var(--fondo);border:1px solid var(--linea);border-radius:11px;padding:13px 15px;}
  .rvalor{font-size:21px;font-weight:900;letter-spacing:-0.5px;}
  .rlabel{font-size:11px;color:var(--suave);margin-top:3px;text-transform:uppercase;letter-spacing:0.04em;}
  table{width:100%;border-collapse:collapse;font-size:12.5px;}
  thead th{background:#eef2f8;color:var(--suave);font-size:10.5px;font-weight:800;text-transform:uppercase;
           letter-spacing:0.06em;padding:10px 12px;border-bottom:2px solid var(--linea);white-space:nowrap;}
  tbody td{padding:9px 12px;border-bottom:1px solid var(--linea);vertical-align:top;}
  tbody tr:nth-child(even){background:#fafbfd;}
  tbody tr:hover{background:#f0f5ff;}
  .badge{display:inline-block;font-weight:800;font-size:11px;padding:2px 9px;border-radius:6px;border:1px solid;white-space:nowrap;}
  .badge.gris{color:#6b7280;border-color:#d1d5db;background:#f3f4f6;}
  .mono{font-family:'JetBrains Mono','SF Mono',ui-monospace,monospace;font-size:11.5px;color:#374151;}
  .vacio{color:#9aa4b2;}
  h2.seccion{font-size:13px;font-weight:800;color:var(--tinta);margin:26px 0 10px;padding-bottom:6px;
             border-bottom:2px solid var(--linea);}
  h2.seccion:first-of-type{margin-top:0;}
  p.ptexto{font-size:13px;color:var(--tinta);background:var(--fondo);border:1px solid var(--linea);
           border-radius:10px;padding:13px 15px;line-height:1.6;white-space:pre-wrap;}
  .pie{padding:14px 30px;border-top:1px solid var(--linea);font-size:11px;color:var(--suave);
       display:flex;justify-content:space-between;}
  .barra{position:fixed;top:16px;right:24px;display:flex;gap:8px;}
  .btn{font-family:inherit;font-size:13px;font-weight:700;padding:9px 16px;border-radius:9px;cursor:pointer;border:1px solid var(--linea);}
  .btn.pri{background:var(--azul);color:#fff;border-color:var(--azul);box-shadow:0 4px 14px rgba(29,111,224,0.30);}
  .btn.sec{background:#fff;color:var(--tinta);}
  @media print{
    body{background:#fff;padding:0;}
    .doc{border:none;box-shadow:none;border-radius:0;max-width:none;}
    .barra{display:none;}
    thead{display:table-header-group;}
    tbody tr{break-inside:avoid;}
    tbody tr:hover{background:transparent;}
  }
</style></head>
<body>
  <div class="barra">
    <button class="btn pri" onclick="window.print()">⎙ Imprimir / Guardar PDF</button>
    <button class="btn sec" onclick="window.close()">Cerrar</button>
  </div>
  <div class="doc">
    <div class="cab">
      <div class="logo">CL</div>
      <div>
        <div class="marca">CyberLab</div>
        <h1>${escapar(titulo)}</h1>
        ${subtitulo ? `<div class="sub">${escapar(subtitulo)}</div>` : ""}
      </div>
      <div class="fecha">Generado el<br/><strong>${escapar(fecha)}</strong></div>
    </div>
    <div class="cuerpo">
      ${cards}
      ${contenido}
    </div>
    <div class="pie">
      <span>CyberLab · Plataforma educativa de ciberseguridad</span>
      <span>${totalFilas} registro${totalFilas !== 1 ? "s" : ""}</span>
    </div>
  </div>
</body></html>`

  const win = window.open("", "_blank")
  if (!win) { alert("Permite las ventanas emergentes para ver el reporte."); return }
  win.document.open()
  win.document.write(html)
  win.document.close()
}
