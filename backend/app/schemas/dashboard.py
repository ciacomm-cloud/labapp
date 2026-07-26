from datetime import date

from pydantic import BaseModel

from app.schemas.cohorte import CohorteOut


class LoteDashboardItem(BaseModel):
    lote_id: int
    folio: str | None
    genero_nombre: str
    especie_nombre: str
    tipo_frasco_nombre: str
    tipo_medio_nombre: str
    fecha_siembra: date
    total_frascos: int
    dias_mas_antiguos: int | None
    semaforo: str  # verde | amarillo | rojo
    cohortes: list[CohorteOut]
