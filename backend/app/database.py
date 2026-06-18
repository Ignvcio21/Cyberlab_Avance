"""
database.py — Configuración de la conexión a la base de datos (SQLAlchemy)
---------------------------------------------------------------------------
Este módulo decide a qué base de datos conectarse y crea los objetos centrales
de SQLAlchemy que el resto del backend reutiliza:
  • engine      → el "motor" que abre conexiones reales a la BD.
  • SesionLocal → fábrica de sesiones (una sesión = una unidad de trabajo/transacción).
  • Base        → clase base de la que heredan todos los modelos (tablas) en models.py.

En producción (Railway) se usa PostgreSQL; en local, SQLite como respaldo.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# En producción Railway provee DATABASE_URL (PostgreSQL)
# En desarrollo local usa SQLite como fallback
# os.environ.get(clave, default): si la variable de entorno no existe, usa SQLite local.
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./cyberlab.db")

# Railway a veces entrega postgres:// en vez de postgresql://
# SQLAlchemy requiere postgresql://
# Se reemplaza solo el prefijo (el "1" limita a la primera ocurrencia).
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Configuración del engine según el motor
if DATABASE_URL.startswith("sqlite"):
    # SQLite necesita check_same_thread=False para poder usarse desde varios
    # hilos (FastAPI atiende peticiones en distintos hilos).
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL — sin connect_args de SQLite
    # Pool de conexiones reutilizables, configurado para entornos cloud:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,       # verifica conexión antes de usarla (evita conexiones muertas)
        pool_recycle=300,         # recicla conexiones cada 5 min (Railway cierra las inactivas)
        pool_size=5,              # nº de conexiones mantenidas abiertas
        max_overflow=10           # conexiones extra permitidas en picos de carga
    )

# Fábrica de sesiones. autocommit/autoflush en False = control manual de las
# transacciones (se confirma con commit() explícitamente).
SesionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# Clase base declarativa: todos los modelos de models.py heredan de aquí.
Base = declarative_base()