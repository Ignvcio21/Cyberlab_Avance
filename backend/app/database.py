import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# En producción Railway provee DATABASE_URL (PostgreSQL)
# En desarrollo local usa SQLite como fallback
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./cyberlab.db")

# Railway a veces entrega postgres:// en vez de postgresql://
# SQLAlchemy requiere postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Configuración del engine según el motor
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL — sin connect_args de SQLite
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,       # verifica conexión antes de usarla
        pool_recycle=300,         # recicla conexiones cada 5 min
        pool_size=5,
        max_overflow=10
    )

SesionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()