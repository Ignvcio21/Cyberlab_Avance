"""
auth.py — Seguridad centralizada de CyberLab
Maneja: JWT, hash de contraseñas, verificación de roles
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .database import SesionLocal
from .models import Usuario

# ── Configuración JWT ─────────────────────────────────────────────
SECRET_KEY    = os.environ.get("SECRET_KEY", "cyberlab-dev-secret-cambiar-en-produccion")
ALGORITHM     = "HS256"
EXPIRACION_MIN = int(os.environ.get("JWT_EXPIRACION_MIN", "480"))  # 8 horas

# ── Hash de contraseñas ───────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Bearer token scheme ───────────────────────────────────────────
bearer_scheme = HTTPBearer(auto_error=False)


def hashear_contrasena(contrasena: str) -> str:
    return pwd_context.hash(contrasena)


def verificar_contrasena(contrasena_plana: str, hash_guardado: str) -> bool:
    # Compatibilidad: si el hash no es bcrypt (usuarios antiguos con texto plano)
    try:
        return pwd_context.verify(contrasena_plana, hash_guardado)
    except Exception:
        # Fallback para contraseñas en texto plano (migración)
        return contrasena_plana == hash_guardado


def crear_token(data: dict, expira_en: Optional[timedelta] = None) -> str:
    payload = data.copy()
    expira  = datetime.now(timezone.utc) + (expira_en or timedelta(minutes=EXPIRACION_MIN))
    payload.update({"exp": expira, "iat": datetime.now(timezone.utc)})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decodificar_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )


def obtener_bd():
    bd = SesionLocal()
    try:
        yield bd
    finally:
        bd.close()


def obtener_usuario_actual(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    bd: Session = Depends(obtener_bd)
) -> Usuario:
    """Dependencia: extrae y valida el JWT, retorna el usuario de la BD."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado — se requiere token Bearer",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decodificar_token(credentials.credentials)
    nombre  = payload.get("sub")
    if not nombre:
        raise HTTPException(status_code=401, detail="Token sin usuario")

    usuario = bd.query(Usuario).filter(Usuario.nombre_usuario == nombre).first()
    if not usuario:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return usuario


def requerir_roles(*roles: str):
    """Dependencia de fábrica: exige que el usuario tenga uno de los roles dados."""
    def verificar(usuario: Usuario = Depends(obtener_usuario_actual)):
        if usuario.rol not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado — se requiere rol: {', '.join(roles)}"
            )
        return usuario
    return verificar


# Dependencias listas para usar en endpoints
solo_admin    = requerir_roles("admin")
solo_docente  = requerir_roles("admin", "docente")
cualquier_rol = requerir_roles("admin", "docente", "estudiante")