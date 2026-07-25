from datetime import date

from pydantic import BaseModel


class DashboardSummaryOut(BaseModel):
    periodo_desde: date
    periodo_hasta: date
    total_frascos_laboratorio: int
    frascos_en_rescate_activos: int
    catalogos_con_estado: int
    porcentaje_merma: float


class DashboardUrgenteOut(BaseModel):
    catalog_item_id: int
    catalog_code: str
    genus: str
    species: str
    log_id: int
    last_subculture_date: date
    dias_transcurridos: int
    semaforo_antiguedad: str
    estado_critico: bool
    normal_jars: int
    ready_jars: int
    rescue_1_jars: int
    rescue_2_jars: int
