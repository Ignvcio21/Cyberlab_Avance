"""
email_utils.py — Envío de correos transaccionales de CyberLab
Usa smtplib estándar (sin dependencias extra). Envía en segundo plano.
Variables de entorno requeridas:
  SMTP_HOST  (default: smtp.gmail.com)
  SMTP_PORT  (default: 587)
  SMTP_USER  dirección del remitente / usuario SMTP
  SMTP_PASS  contraseña o App Password de Gmail
  APP_URL    URL pública del frontend (default: https://cyberlabavance.vercel.app)
"""
import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from concurrent.futures import ThreadPoolExecutor

_executor = ThreadPoolExecutor(max_workers=3)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
EMAIL_FROM_NAME = "CyberLab"
APP_URL = os.getenv("APP_URL", "https://cyberlabavance.vercel.app")


def _enviar_sync(to: str, subject: str, html: str):
    if not SMTP_USER or not SMTP_PASS:
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{EMAIL_FROM_NAME} <{SMTP_USER}>"
    msg["To"] = to
    msg.attach(MIMEText(html, "html", "utf-8"))
    ctx = ssl.create_default_context()
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
        s.ehlo()
        s.starttls(context=ctx)
        s.login(SMTP_USER, SMTP_PASS)
        s.sendmail(SMTP_USER, to, msg.as_string())


def enviar_correo(to: str, subject: str, html: str):
    """Encola el envío en un hilo para no bloquear la respuesta HTTP."""
    if to and "@" in to:
        _executor.submit(_enviar_sync, to, subject, html)


# ── Plantillas HTML ──────────────────────────────────────────────────

def _base(contenido: str, titulo: str) -> str:
    return f"""
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>{titulo}</title>
</head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#161b22;border-radius:16px;border:1px solid #30363d;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:28px 36px;">
            <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">⚡ CyberLab</span>
            <br/>
            <span style="font-size:12px;color:rgba(255,255,255,0.75);font-family:monospace;">Plataforma educativa de ciberseguridad</span>
          </td>
        </tr>

        <!-- Contenido -->
        <tr>
          <td style="padding:32px 36px;">
            {contenido}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #21262d;">
            <p style="margin:0;font-size:12px;color:#6e7681;line-height:1.6;">
              Este correo fue enviado automáticamente por CyberLab.<br/>
              Si no esperabas este mensaje, puedes ignorarlo.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""


def _h1(texto: str) -> str:
    return f'<h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#f0f6fc;letter-spacing:-0.3px;">{texto}</h1>'


def _p(texto: str) -> str:
    return f'<p style="margin:0 0 14px;font-size:15px;color:#8b949e;line-height:1.65;">{texto}</p>'


def _boton(texto: str, url: str, color: str = "#0ea5e9") -> str:
    return f"""
<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background:{color};border-radius:10px;">
      <a href="{url}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;
         color:#ffffff;text-decoration:none;letter-spacing:-0.2px;">{texto}</a>
    </td>
  </tr>
</table>
"""


def _caja(contenido: str, color_borde: str = "#30363d", color_fondo: str = "#21262d") -> str:
    return f"""
<div style="background:{color_fondo};border:1px solid {color_borde};border-radius:10px;
            padding:16px 20px;margin:16px 0;">
  {contenido}
</div>
"""


# ── Correo: nuevo ejercicio publicado ───────────────────────────────

def correo_nuevo_ejercicio(
    destinatario: str,
    nombre_estudiante: str,
    titulo_ejercicio: str,
    tipo: str,
    nivel: int,
    tiempo_minutos: int,
) -> None:
    tipo_label = "🗡 Ataque" if tipo == "ataque" else "🛡 Defensa SOC"
    contenido = (
        _h1("📋 Nuevo ejercicio disponible")
        + _p(f"Hola <strong style='color:#f0f6fc;'>{nombre_estudiante}</strong>,")
        + _p("Tu docente acaba de publicar un nuevo ejercicio en CyberLab. ¡Es hora de poner a prueba tus habilidades!")
        + _caja(
            f"<span style='font-size:16px;font-weight:800;color:#f0f6fc;'>{titulo_ejercicio}</span><br/>"
            f"<span style='font-size:13px;color:#6e7681;margin-top:6px;display:block;'>"
            f"{tipo_label} &nbsp;·&nbsp; Nivel {nivel} &nbsp;·&nbsp; {tiempo_minutos} min</span>",
            color_borde="#0ea5e940",
            color_fondo="#0ea5e908",
        )
        + _boton("Ir al ejercicio →", f"{APP_URL}/dashboard/{'defensa' if tipo == 'defensa' else 'ataque'}")
        + _p("Recuerda que el cronómetro empieza en cuanto confirmas el inicio. ¡Buena suerte!")
    )
    enviar_correo(
        destinatario,
        f"[CyberLab] Nuevo ejercicio: {titulo_ejercicio}",
        _base(contenido, "Nuevo ejercicio"),
    )


# ── Correo: entrega evaluada / nota asignada ─────────────────────────

def correo_nota_asignada(
    destinatario: str,
    nombre_estudiante: str,
    titulo_ejercicio: str,
    nota: float,
    comentarios: str | None,
) -> None:
    color = "#22c55e" if nota >= 5.5 else "#f59e0b" if nota >= 4.0 else "#ef4444"
    estado = "aprobado ✅" if nota >= 4.0 else "insuficiente ❌"
    contenido = (
        _h1("🎓 Tu entrega fue evaluada")
        + _p(f"Hola <strong style='color:#f0f6fc;'>{nombre_estudiante}</strong>,")
        + _p("Tu docente revisó y calificó tu entrega. Aquí tienes los resultados:")
        + _caja(
            f"<span style='font-size:13px;color:#6e7681;display:block;margin-bottom:4px;'>Ejercicio</span>"
            f"<span style='font-size:15px;font-weight:700;color:#f0f6fc;'>{titulo_ejercicio}</span>"
            f"<br/><br/>"
            f"<span style='font-size:13px;color:#6e7681;display:block;margin-bottom:4px;'>Nota obtenida</span>"
            f"<span style='font-size:34px;font-weight:900;color:{color};font-family:monospace;'>{nota:.1f}</span>"
            f"<span style='font-size:13px;color:#6e7681;'> / 7.0 — {estado}</span>",
            color_borde=f"{color}40",
            color_fondo=f"{color}08",
        )
        + (
            _caja(
                f"<span style='font-size:12px;color:#6e7681;display:block;margin-bottom:6px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;'>Comentarios del docente</span>"
                f"<span style='font-size:14px;color:#c9d1d9;line-height:1.6;'>{comentarios}</span>",
            ) if comentarios else ""
        )
        + _boton("Ver mis notas →", f"{APP_URL}/notas")
    )
    enviar_correo(
        destinatario,
        f"[CyberLab] Nota asignada: {nota:.1f}/7.0 — {titulo_ejercicio}",
        _base(contenido, "Tu nota"),
    )


# ── Correo: recuperación de contraseña ──────────────────────────────

def correo_recuperar_contrasena(
    destinatario: str,
    nombre: str,
    token: str,
) -> None:
    url_reset = f"{APP_URL}/reset-contrasena?token={token}"
    contenido = (
        _h1("🔐 Recuperar contraseña")
        + _p(f"Hola <strong style='color:#f0f6fc;'>{nombre}</strong>,")
        + _p("Recibimos una solicitud para restablecer la contraseña de tu cuenta en CyberLab.")
        + _boton("Restablecer contraseña →", url_reset, color="#6366f1")
        + _caja(
            "<span style='font-size:13px;color:#6e7681;line-height:1.6;'>"
            "⏱ Este enlace es válido por <strong style='color:#f0f6fc;'>60 minutos</strong>.<br/>"
            "Si no solicitaste este cambio, ignora este correo. Tu contraseña no será modificada."
            "</span>"
        )
        + _p(
            f"Si el botón no funciona, copia este enlace en tu navegador:<br/>"
            f"<span style='font-family:monospace;font-size:12px;color:#58a6ff;word-break:break-all;'>{url_reset}</span>"
        )
    )
    enviar_correo(
        destinatario,
        "[CyberLab] Recuperar contraseña",
        _base(contenido, "Recuperar contraseña"),
    )
