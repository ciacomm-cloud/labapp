from sqlalchemy import Column, Integer, String, ForeignKey, Date, DateTime, Text, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class Lote(Base):
    __tablename__ = "lotes"

    id = Column(Integer, primary_key=True)
    especie_id = Column(Integer, ForeignKey("especies.id"), nullable=False)
    tipo_frasco_id = Column(Integer, ForeignKey("tipos_frasco.id"), nullable=False)
    tipo_medio_id = Column(Integer, ForeignKey("tipos_medio.id"), nullable=False)

    cantidad_sembrada = Column(Integer, nullable=False)
    fecha_siembra = Column(Date, nullable=False)

    # Placeholder: formato de folio pendiente de confirmar con el director del
    # laboratorio (ver spec v2 sec. 3). No generar folios reales todavia.
    folio = Column(String(60), nullable=True, unique=True)

    notas = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    especie = relationship("Especie")
    tipo_frasco = relationship("TipoFrasco")
    tipo_medio = relationship("TipoMedio")
    cohortes = relationship("Cohorte", back_populates="lote")
