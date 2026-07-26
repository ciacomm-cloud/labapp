from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.catalogos import Especie, Genero
from app.models.cohorte import Cohorte, FaseCohorte
from app.models.lote import Lote
from app.schemas.cohorte import CohorteOut
from app.schemas.dashboard import LoteDashboardItem

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_user)])

# Umbrales del semáforo de antigüedad (días desde la última revisión).
DIAS_VERDE_MAX = 7
DIAS_AMARILLO_MAX = 14


def _semaforo(dias: int | None) -> str:
    if dias is None or dias > DIAS_AMARILLO_MAX:
        return "rojo"
    if dias > DIAS_VERDE_MAX:
        return "amarillo"
    return "verde"


@router.get("", response_model=list[LoteDashboardItem])
def get_dashboard(
    fase: FaseCohorte,
    genero_id: int | None = None,
    especie_id: int | None = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(Cohorte, Lote, Especie, Genero)
        .join(Lote, Cohorte.lote_id == Lote.id)
        .join(Especie, Lote.especie_id == Especie.id)
        .join(Genero, Especie.genero_id == Genero.id)
        .filter(Cohorte.fase == fase, Cohorte.cantidad > 0)
    )
    if especie_id is not None:
        query = query.filter(Lote.especie_id == especie_id)
    if genero_id is not None:
        query = query.filter(Especie.genero_id == genero_id)

    rows = query.all()

    por_lote: dict[int, dict] = {}
    hoy = date.today()

    for cohorte, lote, especie, genero in rows:
        entry = por_lote.get(lote.id)
        if entry is None:
            entry = {
                "lote": lote,
                "genero_nombre": genero.nombre,
                "especie_nombre": especie.nombre,
                "tipo_frasco_nombre": lote.tipo_frasco.nombre,
                "tipo_medio_nombre": lote.tipo_medio.nombre,
                "cohortes": [],
            }
            por_lote[lote.id] = entry
        entry["cohortes"].append(cohorte)

    resultado: list[LoteDashboardItem] = []
    for lote_id, entry in por_lote.items():
        cohortes = entry["cohortes"]
        total_frascos = sum(c.cantidad for c in cohortes)
        dias_por_cohorte = [
            (hoy - c.fecha_ultima_revision).days if c.fecha_ultima_revision else None
            for c in cohortes
        ]
        dias_mas_antiguos = None
        if dias_por_cohorte:
            conocidos = [d for d in dias_por_cohorte if d is not None]
            dias_mas_antiguos = max(conocidos) if conocidos else None
        if any(d is None for d in dias_por_cohorte):
            semaforo = "rojo"
        else:
            semaforo = _semaforo(dias_mas_antiguos)

        resultado.append(
            LoteDashboardItem(
                lote_id=lote_id,
                folio=entry["lote"].folio,
                genero_nombre=entry["genero_nombre"],
                especie_nombre=entry["especie_nombre"],
                tipo_frasco_nombre=entry["tipo_frasco_nombre"],
                tipo_medio_nombre=entry["tipo_medio_nombre"],
                fecha_siembra=entry["lote"].fecha_siembra,
                total_frascos=total_frascos,
                dias_mas_antiguos=dias_mas_antiguos,
                semaforo=semaforo,
                cohortes=[CohorteOut.model_validate(c) for c in cohortes],
            )
        )

    return resultado
