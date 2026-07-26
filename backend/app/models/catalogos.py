from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class Genero(Base):
    __tablename__ = "generos"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(120), nullable=False, unique=True)

    especies = relationship("Especie", back_populates="genero")


class Especie(Base):
    __tablename__ = "especies"

    id = Column(Integer, primary_key=True)
    genero_id = Column(Integer, ForeignKey("generos.id"), nullable=False)
    nombre = Column(String(150), nullable=False)
    morfologia = Column(String(255), nullable=True)
    numero_id = Column(String(20), nullable=True)

    genero = relationship("Genero", back_populates="especies")


class TipoFrasco(Base):
    __tablename__ = "tipos_frasco"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(120), nullable=False, unique=True)
    capacidad = Column(String(60), nullable=True)


class TipoMedio(Base):
    __tablename__ = "tipos_medio"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(120), nullable=False, unique=True)
