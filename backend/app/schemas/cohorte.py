from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.cohorte import FaseCohorte
from app.models.evento_cohorte import TipoEvento


class CohorteOut(BaseModel):
    id: int
    lote_id: int
    parent_cohorte_id: int | None
    codigo: str | None
    fase: FaseCohorte
    cantidad: int
    fecha_ultima_revision: date | None
    created_at: datetime

    class Config:
        from_attributes = True


class EventoInput(BaseModel):
    tipo_evento: TipoEvento
    cantidad: int | None = None
    motivo: str | None = None
    notas: str | None = None


class CapturaRequest(BaseModel):
    fecha: date = Field(default_factory=date.today)
    eventos: list[EventoInput]


class EventoOut(BaseModel):
    id: int
    cohorte_padre_id: int
    cohorte_hija_id: int | None
    tipo_evento: TipoEvento
    cantidad: int | None
    motivo: str | None
    notas: str | None
    fecha: date
    usuario_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class CohorteConHistorial(CohorteOut):
    eventos_como_padre: list[EventoOut] = []


class CapturaResponse(BaseModel):
    cohorte_padre: CohorteOut
    cohortes_hijas: list[CohorteOut]
    eventos: list[EventoOut]
