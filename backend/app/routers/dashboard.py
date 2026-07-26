import csv
import io
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session, aliased

from app.database import get_db
from app.deps import require_admin
from app.models.inventario import CatalogItem, Genus, InventoryLog, Species
from app.models.user import User
from app.schemas.dashboard import DashboardSummaryOut, DashboardUrgenteOut
from app.services.inventory_metrics import compute_log_metrics

router = APIRouter(
    prefix="/api/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(require_admin)],
)


def _default_period(desde: date | None, hasta: date | None) -> tuple[date, date]:
    hasta = hasta or date.today()
    desde = desde or (hasta - timedelta(days=30))
    return desde, hasta


def _latest_log_alias():
    """El estado actual de un catálogo es siempre su log más reciente."""
    rn = func.row_number().over(
        partition_by=InventoryLog.catalog_item_id,
        order_by=(InventoryLog.created_at.desc(), InventoryLog.id.desc()),
    ).label("rn")
    subq = select(InventoryLog, rn).subquery()
    return aliased(InventoryLog, subq), subq


@router.get("/summary", response_model=DashboardSummaryOut)
def dashboard_summary(
    desde: date | None = None,
    hasta: date | None = None,
    genus_id: int | None = None,
    species_id: int | None = None,
    db: Session = Depends(get_db),
):
    desde, hasta = _default_period(desde, hasta)

    LatestLog, subq = _latest_log_alias()
    latest_q = (
        db.query(LatestLog)
        .join(CatalogItem, CatalogItem.id == LatestLog.catalog_item_id)
        .join(Species, Species.id == CatalogItem.species_id)
        .filter(subq.c.rn == 1)
    )
    if genus_id is not None:
        latest_q = latest_q.filter(Species.genus_id == genus_id)
    if species_id is not None:
        latest_q = latest_q.filter(CatalogItem.species_id == species_id)
    latest_logs = latest_q.all()
    total_frascos_laboratorio = sum(
        l.normal_jars + l.ready_jars + l.rescue_1_jars + l.rescue_2_jars
        for l in latest_logs
    )
    frascos_en_rescate_activos = sum(
        l.rescue_1_jars + l.rescue_2_jars for l in latest_logs
    )

    period_q = (
        db.query(InventoryLog)
        .join(CatalogItem, CatalogItem.id == InventoryLog.catalog_item_id)
        .join(Species, Species.id == CatalogItem.species_id)
        .filter(
            InventoryLog.last_subculture_date >= desde,
            InventoryLog.last_subculture_date <= hasta,
        )
    )
    if genus_id is not None:
        period_q = period_q.filter(Species.genus_id == genus_id)
    if species_id is not None:
        period_q = period_q.filter(CatalogItem.species_id == species_id)
    period_logs = period_q.all()
    total_registrado = sum(
        l.normal_jars + l.ready_jars + l.rescue_1_jars + l.rescue_2_jars + l.discarded_jars
        for l in period_logs
    )
    total_descartado = sum(l.discarded_jars for l in period_logs)
    porcentaje_merma = round(
        (total_descartado / total_registrado * 100) if total_registrado else 0.0, 2
    )

    return DashboardSummaryOut(
        periodo_desde=desde,
        periodo_hasta=hasta,
        total_frascos_laboratorio=total_frascos_laboratorio,
        frascos_en_rescate_activos=frascos_en_rescate_activos,
        catalogos_con_estado=len(latest_logs),
        porcentaje_merma=porcentaje_merma,
    )


@router.get("/urgentes", response_model=list[DashboardUrgenteOut])
def dashboard_urgentes(
    genus_id: int | None = None,
    species_id: int | None = None,
    db: Session = Depends(get_db),
):
    LatestLog, subq = _latest_log_alias()
    q = (
        db.query(LatestLog, CatalogItem, Species, Genus)
        .join(CatalogItem, CatalogItem.id == LatestLog.catalog_item_id)
        .join(Species, Species.id == CatalogItem.species_id)
        .join(Genus, Genus.id == Species.genus_id)
        .filter(subq.c.rn == 1)
    )
    if genus_id is not None:
        q = q.filter(Genus.id == genus_id)
    if species_id is not None:
        q = q.filter(Species.id == species_id)
    rows = q.order_by(LatestLog.last_subculture_date.asc()).all()

    result = []
    for log, item, species, genus in rows:
        metrics = compute_log_metrics(
            last_subculture_date=log.last_subculture_date,
            normal_jars=log.normal_jars,
            rescue_1_jars=log.rescue_1_jars,
            rescue_2_jars=log.rescue_2_jars,
        )
        result.append(
            DashboardUrgenteOut(
                catalog_item_id=item.id,
                catalog_code=item.catalog_code,
                genus=genus.name,
                species=species.name,
                log_id=log.id,
                last_subculture_date=log.last_subculture_date,
                normal_jars=log.normal_jars,
                ready_jars=log.ready_jars,
                rescue_1_jars=log.rescue_1_jars,
                rescue_2_jars=log.rescue_2_jars,
                **metrics,
            )
        )
    return result


_EXPORT_HEADERS = [
    "catalog_code", "genero", "especie", "last_subculture_date",
    "normal_jars", "ready_jars", "rescue_1_jars", "rescue_2_jars",
    "discarded_jars", "discard_reason", "notes", "actualizado_por",
    "created_at", "updated_at",
]


def _export_row(log: InventoryLog, item: CatalogItem, species: Species, genus: Genus, user: User) -> list:
    return [
        item.catalog_code, genus.name, species.name,
        log.last_subculture_date.isoformat(),
        log.normal_jars, log.ready_jars, log.rescue_1_jars, log.rescue_2_jars,
        log.discarded_jars, log.discard_reason.value if log.discard_reason else "",
        log.notes or "", user.username,
        log.created_at.isoformat(), log.updated_at.isoformat(),
    ]


@router.get("/export")
def dashboard_export(
    desde: date | None = None,
    hasta: date | None = None,
    formato: str = "csv",
    db: Session = Depends(get_db),
):
    if formato not in ("csv", "xlsx"):
        raise HTTPException(status_code=422, detail="formato debe ser 'csv' o 'xlsx'")

    desde, hasta = _default_period(desde, hasta)

    rows = (
        db.query(InventoryLog, CatalogItem, Species, Genus, User)
        .join(CatalogItem, CatalogItem.id == InventoryLog.catalog_item_id)
        .join(Species, Species.id == CatalogItem.species_id)
        .join(Genus, Genus.id == Species.genus_id)
        .join(User, User.id == InventoryLog.updated_by)
        .filter(
            InventoryLog.last_subculture_date >= desde,
            InventoryLog.last_subculture_date <= hasta,
        )
        .order_by(InventoryLog.last_subculture_date.asc(), CatalogItem.catalog_code.asc())
        .all()
    )

    filename_base = f"labapp_logs_{desde.isoformat()}_{hasta.isoformat()}"

    if formato == "xlsx":
        from openpyxl import Workbook

        wb = Workbook()
        ws = wb.active
        ws.title = "logs"
        ws.append(_EXPORT_HEADERS)
        for log, item, species, genus, user in rows:
            ws.append(_export_row(log, item, species, genus, user))
        buf = io.BytesIO()
        wb.save(buf)
        return Response(
            content=buf.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename_base}.xlsx"'},
        )

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(_EXPORT_HEADERS)
    for log, item, species, genus, user in rows:
        writer.writerow(_export_row(log, item, species, genus, user))
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename_base}.csv"'},
    )
