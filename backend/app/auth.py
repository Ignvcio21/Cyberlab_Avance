"""
auth.py — Seguridad centralizada de CyberLab
Maneja: JWT, hash de contraseñas, verificación de roles
---------------------------------------------------------------------------
Aquí se concentra toda la lógica de autenticación y autorización:
  • Hash y verificación de contraseñas (bcrypt).
  • Creación y validación de tokens JWT (el "carnet" que identifica al usuario).
  • Dependencias de FastAPI que protegen los endpoints exigiendo sesión y rol.
Centralizarlo evita repetir lógica de seguridad por todo el backend.
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt                 # codificar/decodificar JWT
from passlib.context import CryptContext        # hashing seguro de contraseñas
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .database import SesionLocal
from .models import Usuario

# ── Configuración JWT ─────────────────────────────────────────────
# Clave secreta con la que se firman los tokens. DEBE venir del entorno en
# producción; si no, se usa una de desarrollo (insegura) y se avisa por consola.
SECRET_KEY    = os.environ.get("SECRET_KEY", "cyberlab-dev-secret-cambiar-en-produccion")
if SECRET_KEY == "cyberlab-dev-secret-cambiar-en-produccion":
    print("[SEGURIDAD] ADVERTENCIA: SECRET_KEY no está definida en el entorno — "
          "se está usando la clave de desarrollo. Configúrala en Railway antes de usar en producción.")
ALGORITHM     = "HS256"  # algoritmo de firma simétrica del JWT
# Minutos de validez del token (por defecto 8 horas). int() porque las variables
# de entorno siempre son texto.
EXPIRACION_MIN = int(os.environ.get("JWT_EXPIRACION_MIN", "480"))  # 8 horas

# ── Hash de contraseñas ───────────────────────────────────────────
# Contexto de passlib usando bcrypt. "deprecated=auto" permite migrar esquemas
# antiguos automáticamente si en el futuro se cambia el algoritmo.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Bearer token scheme ───────────────────────────────────────────
# Lee el token del header "Authorization: Bearer <token>".
# auto_error=False → si falta el token NO lanza error automático; lo manejamos
# nosotros para devolver un mensaje propio.
bearer_scheme = HTTPBearer(auto_error=False)


def hashear_contrasena(contrasena: str) -> str:
    """Devuelve el hash bcrypt de una contraseña en texto plano (para guardarlo)."""
    return pwd_context.hash(contrasena)


def verificar_contrasena(contrasena_plana: str, hash_guardado: str) -> bool:
    """Comprueba si una contraseña coincide con el hash almacenado."""
    # Compatibilidad: si el hash no es bcrypt (usuarios antiguos con texto plano)
    try:
        return pwd_context.verify(contrasena_plana, hash_guardado)
    except Exception:
        # Fallback para contraseñas en texto plano (migración)
        # Si el hash guardado no es válido para bcrypt, compara como texto plano
        # (solo para cuentas heredadas antes de introducir el hashing).
        return contrasena_plana == hash_guardado


def crear_token(data: dict, expira_en: Optional[timedelta] = None) -> str:
    """Genera un JWT firmado a partir de `data` (ej: {'sub': nombre_usuario, 'rol': ...})."""
    payload = data.copy()  # copia para no mutar el dict recibido
    # Momento de expiración: ahora (UTC) + duración indicada (o la de por defecto).
    expira  = datetime.now(timezone.utc) + (expira_en or timedelta(minutes=EXPIRACION_MIN))
    # "exp" (expiración) e "iat" (emitido en) son claims estándar del JWT.
    payload.update({"exp": expira, "iat": datetime.now(timezone.utc)})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decodificar_token(token: str) -> dict:
    """Valida la firma y la expiración de un JWT y devuelve su contenido (payload)."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        # Firma inválida, token manipulado o expirado → 401 No autorizado.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )


def obtener_bd():
    """
    Dependencia de FastAPI que entrega una sesión de BD y la cierra al terminar.
    El patrón `yield` asegura que la conexión se libere aunque el endpoint falle.
    """
    bd = SesionLocal()
    try:
        yield bd          # se entrega la sesión al endpoint
    finally:
        bd.close()        # se cierra siempre (éxito o error)


def obtener_usuario_actual(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    bd: Session = Depends(obtener_bd)
) -> Usuario:
    """Dependencia: extrae y valida el JWT, retorna el usuario de la BD."""
    # Sin header Authorization → no autenticado.
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado — se requiere token Bearer",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Decodifica el token y obtiene el "sub" (subject = nombre de usuario).
    payload = decodificar_token(credentials.credentials)
    nombre  = payload.get("sub")
    if not nombre:
        raise HTTPException(status_code=401, detail="Token sin usuario")

    # Busca al usuario en la BD; si fue eliminado o cambió su nombre, el token ya no vale.
    usuario = bd.query(Usuario).filter(Usuario.nombre_usuario == nombre).first()
    if not usuario:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return usuario


def requerir_roles(*roles: str):
    """Dependencia de fábrica: exige que el usuario tenga uno de los roles dados."""
    # Devuelve una función-dependencia configurada con los roles permitidos.
    def verificar(usuario: Usuario = Depends(obtener_usuario_actual)):
        if usuario.rol not in roles:
            # El usuario está autenticado pero no tiene permiso → 403 Prohibido.
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado — se requiere rol: {', '.join(roles)}"
            )
        return usuario
    return verificar


# Dependencias listas para usar en endpoints
# Se aplican con Depends(...) para restringir cada ruta según el rol mínimo.
solo_admin    = requerir_roles("admin")                          # solo administradores
solo_docente  = requerir_roles("admin", "docente")               # docentes y admins
cualquier_rol = requerir_roles("admin", "docente", "estudiante") # cualquier usuario autenticado