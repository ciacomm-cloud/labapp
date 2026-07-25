from datetime import date, datetime

from pydantic import BaseModel

from app.models.inventario import DiscardReason


class InventoryLogCreate(BaseModel):
    normal_jars: int = 0
    ready_jars: int = 0
    rescue_1_jars: int = 0
    rescue_2_jars: int = 0
    discarded_jars: int = 0
    discard_reason: DiscardReason | None = None
    last_subculture_date: date
    notes: str | None = None


class InventoryLogUpdate(InventoryLogCreate):
    pass


class InventoryLogOut(BaseModel):
    id: int
    catalog_item_id: int
    normal_jars: int
    ready_jars: int
    rescue_1_jars: int
    rescue_2_jars: int
    discarded_jars: int
    discard_reason: DiscardReason | None
    last_subculture_date: date
    notes: str | None
    updated_by: int
    created_at: datetime
    updated_at: datetime

    dias_transcurridos: int
    semaforo_antiguedad: str
    estado_critico: bool
