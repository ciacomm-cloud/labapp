import enum

from sqlalchemy import Column, Integer, String, Enum, DateTime, func

from app.core.database import Base


class RolUsuario(str, enum.Enum):
    admin = "admin"
    operador = "operador"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(120), nullable=False)
    email = Column(String(180), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    rol = Column(Enum(RolUsuario), nullable=False, default=RolUsuario.operador)
    activo = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
