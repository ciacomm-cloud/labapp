import enum

from sqlalchemy import Column, Integer, String, ForeignKey, Date, DateTime, Enum, Text, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class TipoEvento(str, enum.Enum):
    sin_cambios = "sin_cambios"
    multiplicacion = "multiplicacion"
    contaminacion = "contaminacion"
    endofitos = "endofitos"
    rescate_exito = "rescate_exito"
    rescate_persiste = "rescate_persiste"
    rescate_falla = "rescate_falla"
    enraizamiento = "enraizamiento"
    endurecimiento = "endurecimiento"


class EventoCohorte(Base):
    __tablename__ = "eventos_cohorte"

    id = Column(Integer, primary_key=True)
    cohorte_padre_id = Column(Integer, ForeignKey("cohortes.id"), nullable=False, index=True)
    cohorte_hija_id = Column(Integer, ForeignKey("cohortes.id"), nullable=True, index=True)

    tipo_evento = Column(Enum(TipoEvento), nullable=False)
    cantidad = Column(Integer, nullable=True)
    motivo = Column(String(255), nullable=True)
    notas = Column(Text, nullable=True)
    fecha = Column(Date, nullable=False)

    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    cohorte_padre = relationship("Cohorte", foreign_keys=[cohorte_padre_id])
    cohorte_hija = relationship("Cohorte", foreign_keys=[cohorte_hija_id])
    usuario = relationship("User")
