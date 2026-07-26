from datetime import date, datetime

from pydantic import BaseModel, Field

from app.schemas.cohorte import CohorteOut


class LoteCreate(BaseModel):
    especie_id: int
    tipo_frasco_id: int
    tipo_medio_id: int
    cantidad_sembrada: int = Field(gt=0)
    fecha_siembra: date = Field(default_factory=date.today)
    notas: str | None = None


class LoteOut(BaseModel):
    id: int
    especie_id: int
    tipo_frasco_id: int
    tipo_medio_id: int
    cantidad_sembrada: int
    fecha_siembra: date
    folio: str | None
    notas: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class LoteConCohorteRaiz(LoteOut):
    cohorte_raiz: CohorteOut
