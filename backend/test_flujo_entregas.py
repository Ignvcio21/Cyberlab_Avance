"""Prueba de humo del flujo de entrega estructurada (no toca cyberlab.db).

Crea una BD SQLite temporal, simula: ejercicio docente → sesión → comandos
→ pista → expiración, y verifica el snapshot `detalle` y los endpoints.
"""
import os
import sys
import json
import tempfile

# BD temporal ANTES de importar la app
_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"

from fastapi.testclient import TestClient
from app.main import app, _resumen_entrega
from app.database import SesionLocal
from app.models import (
    Usuario, EjercicioDocente, ItemEjercicioDocente, EntregaEjercicioDocente,
    AccionUsuario, IpBloqueada,
)
from app.sesiones import (
    crear_sesion, evaluar_comando_en_sesion, finalizar_sesion,
    obtener_sesion_activa, registrar_pista,
)
from app.auth import hashear_contrasena, crear_token

bd = SesionLocal()

# ── Datos base ────────────────────────────────────────────────────
docente = Usuario(nombre_usuario="doc@test.cl", contrasena=hashear_contrasena("x"), rol="docente")
alumno = Usuario(nombre_usuario="alu@test.cl", contrasena=hashear_contrasena("x"), rol="estudiante")
bd.add_all([docente, alumno]); bd.commit(); bd.refresh(docente); bd.refresh(alumno)

ej = EjercicioDocente(titulo="Defensa: Intrusión SSH", descripcion="d", tipo="defensa",
                      tiempo_minutos=10, nivel=2, activo=True, creado_por_id=docente.id)
bd.add(ej); bd.commit(); bd.refresh(ej)
items = [
    ItemEjercicioDocente(ejercicio_id=ej.id, descripcion="Revisar las alertas del IDS", orden=1),
    ItemEjercicioDocente(ejercicio_id=ej.id, descripcion="Bloquear la IP atacante con el firewall", orden=2),
    ItemEjercicioDocente(ejercicio_id=ej.id, descripcion="Documentar el incidente en un reporte", orden=3),
]
bd.add_all(items); bd.commit()
bd.refresh(ej)

# ── Sesión + comandos ─────────────────────────────────────────────
sesion = crear_sesion(bd, alumno.id, ej)
ip = sesion.ip_atacante
print(f"sesión #{sesion.id} creada, ip atacante {ip}")

def cmd(c, salida="ok"):
    bd.add(AccionUsuario(comando=c, resultado="OK", usuario_id=alumno.id)); bd.commit()
    return evaluar_comando_en_sesion(bd, alumno.id, c, salida)

estado = cmd("show alerts")
assert estado["items"][0]["completado"], "item 1 debía marcarse con show alerts"

# comando erróneo (queda en timeline como error)
bd.add(AccionUsuario(comando="logs ssh", resultado="ERROR", usuario_id=alumno.id)); bd.commit()
evaluar_comando_en_sesion(bd, alumno.id, "logs ssh", "command not found")

# pista con texto
sesion = obtener_sesion_activa(bd, alumno.id)
sesion.ayudas += 1; bd.commit()
registrar_pista(bd, sesion, "Usa block ip para contener al atacante")

# expira sin bloquear → entrega parcial
sesion = obtener_sesion_activa(bd, alumno.id)
finalizar_sesion(bd, sesion, "expirada")

entrega = bd.query(EntregaEjercicioDocente).filter_by(usuario_id=alumno.id, ejercicio_id=ej.id).first()
assert entrega is not None, "no se generó la entrega"
det = json.loads(entrega.detalle)
print("cierre:", det["cierre"], "| pct:", det["porcentaje"], "− penal:", det["penalizacion"], "→", det["porcentaje_final"])
print("nota sugerida:", det["nota_sugerida"])
assert det["cierre"] == "expirada"
assert det["porcentaje"] == 33 and det["penalizacion"] == 5 and det["porcentaje_final"] == 28
assert len(det["items"]) == 3
it1 = det["items"][0]
assert it1["completado"] and it1["comando"] == "show alerts" and it1["seg"] is not None
assert not det["items"][1]["completado"]
assert len(det["pistas"]) == 1 and "block ip" in det["pistas"][0]["texto"]
cmds_timeline = [t["cmd"] for t in det["timeline"]]
assert "show alerts" in cmds_timeline and "logs ssh" in cmds_timeline
assert any(not t["ok"] for t in det["timeline"]), "el comando erróneo debía marcar ok=False"
print("timeline:", cmds_timeline)

resumen = _resumen_entrega(entrega)
assert resumen["porcentaje_final"] == 28 and resumen["cierre"] == "expirada"

# ── Entregas legacy (solo frase) siguen funcionando ───────────────
legacy = EntregaEjercicioDocente(
    ejercicio_id=ej.id, usuario_id=docente.id,  # usuario cualquiera
    respuesta="Tiempo agotado. Checklist: 67% — Penalización por 2 ayuda(s): -10% → Resultado: 57%. Tiempo: 14 min 2 s.",
    estado="entregado", ayudas_pedidas=2,
)
bd.add(legacy); bd.commit(); bd.refresh(legacy)
r_leg = _resumen_entrega(legacy)
assert r_leg["porcentaje_final"] == 57 and r_leg["porcentaje"] == 67 and r_leg["penalizacion"] == 10
assert r_leg["cierre"] == "expirada" and r_leg["tiempo_seg"] == 842
print("legacy ok:", r_leg["porcentaje"], "→", r_leg["porcentaje_final"], "en", r_leg["tiempo_seg"], "seg")

# ── Endpoints HTTP ────────────────────────────────────────────────
cliente = TestClient(app)
tok_doc = crear_token({"sub": docente.nombre_usuario, "rol": docente.rol})
tok_alu = crear_token({"sub": alumno.nombre_usuario, "rol": alumno.rol})
h_doc = {"Authorization": f"Bearer {tok_doc}"}
h_alu = {"Authorization": f"Bearer {tok_alu}"}

# informe del estudiante
r = cliente.post(f"/ejercicios-docente/{ej.id}/informe", headers=h_alu,
                 json={"texto": "Detecté fuerza bruta SSH; no alcancé a bloquear la IP. Recomiendo fail2ban."})
assert r.status_code == 200, r.text

# lista de entregas con resumen
r = cliente.get(f"/ejercicios-docente/{ej.id}/entregas", headers=h_doc)
assert r.status_code == 200, r.text
lista = r.json()
mia = next(e for e in lista if e["id"] == entrega.id)
assert mia["resumen"]["porcentaje_final"] == 28 and mia["tiene_detalle"]
assert mia["resumen"]["tiene_informe"] is True
assert mia["resumen"]["items"][0]["completado"] is True

# detalle completo
r = cliente.get(f"/ejercicios-docente/entregas/{entrega.id}/detalle", headers=h_doc)
assert r.status_code == 200, r.text
d = r.json()
assert d["detalle"]["informe"].startswith("Detecté")
assert d["ejercicio"]["titulo"] == "Defensa: Intrusión SSH"
assert len(d["detalle"]["timeline"]) >= 2

# estudiante no puede ver el detalle
r = cliente.get(f"/ejercicios-docente/entregas/{entrega.id}/detalle", headers=h_alu)
assert r.status_code == 403

# evaluar bloquea cambios posteriores del informe
r = cliente.post(f"/ejercicios-docente/entregas/{entrega.id}/evaluar", headers=h_doc,
                 json={"nota": 4.4, "comentarios": "Buena detección, faltó el bloqueo."})
assert r.status_code == 200, r.text
r = cliente.post(f"/ejercicios-docente/{ej.id}/informe", headers=h_alu, json={"texto": "tarde"})
assert r.status_code == 409

# endpoints eliminados
assert cliente.get("/admin/logs", headers=h_doc).status_code in (404, 405)
assert cliente.get("/reporte", headers=h_doc).status_code in (404, 405)

# /docente/entregas usa el detalle (sin regex)
r = cliente.get("/docente/entregas", headers=h_doc)
assert r.status_code == 200
en_doc = next(e for e in r.json()["entregas"] if e["entrega_id"] == entrega.id)
assert en_doc["porcentaje"] == 28 and en_doc["nota"] == 4.4

print("\nTODO OK — flujo completo verificado")
