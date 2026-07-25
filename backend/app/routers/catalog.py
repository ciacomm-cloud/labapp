from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin, require_any_role
from app.models.inventario import CatalogItem, InventoryLog, Species
from app.models.user import User
from app.schemas.inventario import CatalogItemCreate, CatalogItemOut, CatalogItemUpdate
from app.schemas.inventory_log import InventoryLogCreate, InventoryLogOut, InventoryLogUpdate
from app.services.inventory_metrics import compute_log_metrics
from app.services.inventory_rules import InventoryRuleError, validate_log_balances

router = APIRouter(prefix="/api/catalog-items", tags=["catalogo"])


def _get_species_or_404(db: Session, species_id: int) -> Species:
    species = db.get(Species, species_id)
    if species is None:
        raise HTTPException(status_code=404, detail="Especie no encontrada")
    return species


def _get_catalog_item_or_404(db: Session, item_id: int) -> CatalogItem:
    item = db.get(CatalogItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Catálogo no encontrado")
    return item


def _get_log_or_404(db: Session, item_id: int, log_id: int) -> InventoryLog:
    log = (
        db.query(InventoryLog)
        .filter(InventoryLog.id == log_id, InventoryLog.catalog_item_id == item_id)
        .first()
    )
    if log is None:
        raise HTTPException(status_code=404, detail="Log no encontrado")
    return log


def _serialize_log(log: InventoryLog) -> InventoryLogOut:
    metrics = compute_log_metrics(
        last_subculture_date=log.last_subculture_date,
        normal_jars=log.normal_jars,
        rescue_1_jars=log.rescue_1_jars,
        rescue_2_jars=log.rescue_2_jars,
    )
    return InventoryLogOut(
        id=log.id,
        catalog_item_id=log.catalog_item_id,
        normal_jars=log.normal_jars,
        ready_jars=log.ready_jars,
        rescue_1_jars=log.rescue_1_jars,
        rescue_2_jars=log.rescue_2_jars,
        discarded_jars=log.discarded_jars,
        discard_reason=log.discard_reason,
        last_subculture_date=log.last_subculture_date,
        notes=log.notes,
        updated_by=log.updated_by,
        created_at=log.created_at,
        updated_at=log.updated_at,
        **metrics,
    )


@router.get("", response_model=list[CatalogItemOut])
def list_catalog_items(db: Session = Depends(get_db), _=Depends(require_any_role)):
    return db.query(CatalogItem).order_by(CatalogItem.catalog_code).all()


@router.post("", response_model=CatalogItemOut, status_code=status.HTTP_201_CREATED)
def create_catalog_item(
    payload: CatalogItemCreate,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    if (
        db.query(CatalogItem)
        .filter(CatalogItem.catalog_code == payload.catalog_code)
        .first()
    ):
        raise HTTPException(status_code=409, detail="El catalog_code ya existe")
    _get_species_or_404(db, payload.species_id)
    item = CatalogItem(
        catalog_code=payload.catalog_code,
        species_id=payload.species_id,
        status=payload.status,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=CatalogItemOut)
def update_catalog_item(
    item_id: int,
    payload: CatalogItemUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    item = _get_catalog_item_or_404(db, item_id)
    _get_species_or_404(db, payload.species_id)
    item.species_id = payload.species_id
    item.status = payload.status
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_catalog_item(
    item_id: int, db: Session = Depends(get_db), _admin=Depends(require_admin)
):
    item = _get_catalog_item_or_404(db, item_id)
    db.delete(item)
    db.commit()


@router.post(
    "/{item_id}/logs",
    response_model=InventoryLogOut,
    status_code=status.HTTP_201_CREATED,
)
def create_log(
    item_id: int,
    payload: InventoryLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role),
):
    _get_catalog_item_or_404(db, item_id)
    try:
        validate_log_balances(
            normal_jars=payload.normal_jars,
            ready_jars=payload.ready_jars,
            rescue_1_jars=payload.rescue_1_jars,
            rescue_2_jars=payload.rescue_2_jars,
            discarded_jars=payload.discarded_jars,
            discard_reason=payload.discard_reason,
        )
    except InventoryRuleError as e:
        raise HTTPException(status_code=422, detail=str(e))

    log = InventoryLog(
        catalog_item_id=item_id,
        normal_jars=payload.normal_jars,
        ready_jars=payload.ready_jars,
        rescue_1_jars=payload.rescue_1_jars,
        rescue_2_jars=payload.rescue_2_jars,
        discarded_jars=payload.discarded_jars,
        discard_reason=payload.discard_reason,
        last_subculture_date=payload.last_subculture_date,
        notes=payload.notes,
        updated_by=current_user.id,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return _serialize_log(log)


@router.put("/{item_id}/logs/{log_id}", response_model=InventoryLogOut)
def correct_log(
    item_id: int,
    log_id: int,
    payload: InventoryLogUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    log = _get_log_or_404(db, item_id, log_id)
    try:
        validate_log_balances(
            normal_jars=payload.normal_jars,
            ready_jars=payload.ready_jars,
            rescue_1_jars=payload.rescue_1_jars,
            rescue_2_jars=payload.rescue_2_jars,
            discarded_jars=payload.discarded_jars,
            discard_reason=payload.discard_reason,
        )
    except InventoryRuleError as e:
        raise HTTPException(status_code=422, detail=str(e))

    log.normal_jars = payload.normal_jars
    log.ready_jars = payload.ready_jars
    log.rescue_1_jars = payload.rescue_1_jars
    log.rescue_2_jars = payload.rescue_2_jars
    log.discarded_jars = payload.discarded_jars
    log.discard_reason = payload.discard_reason
    log.last_subculture_date = payload.last_subculture_date
    log.notes = payload.notes
    log.updated_by = admin.id
    db.commit()
    db.refresh(log)
    return _serialize_log(log)
