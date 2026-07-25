from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin, require_any_role
from app.models.inventario import CatalogItem, Species
from app.schemas.inventario import CatalogItemCreate, CatalogItemOut, CatalogItemUpdate

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
