import enum

from sqlalchemy import Column, Integer, String, ForeignKey, Date, DateTime, Enum, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class FaseCohorte(str, enum.Enum):
    inicio = "inicio"
    multiplicacion = "multiplicacion"
    enraizamiento = "enraizamiento"
    endurecimiento = "endurecimiento"
    rescate_1 = "rescate_1"
    rescate_2 = "rescate_2"
    normal = "normal"
    contaminado = "contaminado"
    descartado = "descartado"


class Cohorte(Base):
    __tablename__ = "cohortes"

    id = Column(Integer, primary_key=True)
    lote_id = Column(Integer, ForeignKey("lotes.id"), nullable=False, index=True)
    parent_cohorte_id = Column(
        Integer, ForeignKey("cohortes.id"), nullable=True, index=True
    )

    # Placeholder: esquema de codigo de cohorte (ej. CA054-01-A) pendiente de
    # definir junto con el folio de lote (ver spec v2 sec. 3).
    codigo = Column(String(60), nullable=True, unique=True)

    fase = Column(Enum(FaseCohorte), nullable=False, default=FaseCohorte.inicio)
    cantidad = Column(Integer, nullable=False)

    fecha_ultima_revision = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lote = relationship("Lote", back_populates="cohortes")
    parent = relationship("Cohorte", remote_side=[id], backref="hijas")
