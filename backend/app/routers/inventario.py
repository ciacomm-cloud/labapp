from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin, require_any_role
from app.models.inventario import Genus, Species
from app.schemas.inventario import (
    GenusCreate,
    GenusOut,
    GenusUpdate,
    SpeciesCreate,
    SpeciesOut,
    SpeciesUpdate,
)

router = APIRouter(prefix="/api/inventario", tags=["inventario"])


def _get_genus_or_404(db: Session, genus_id: int) -> Genus:
    genus = db.get(Genus, genus_id)
    if genus is None:
        raise HTTPException(status_code=404, detail="Género no encontrado")
    return genus


def _get_species_or_404(db: Session, species_id: int) -> Species:
    species = db.get(Species, species_id)
    if species is None:
        raise HTTPException(status_code=404, detail="Especie no encontrada")
    return species


@router.get("/genera", response_model=list[GenusOut])
def list_genera(db: Session = Depends(get_db), _=Depends(require_any_role)):
    return db.query(Genus).order_by(Genus.name).all()


@router.post("/genera", response_model=GenusOut, status_code=status.HTTP_201_CREATED)
def create_genus(
    payload: GenusCreate, db: Session = Depends(get_db), _admin=Depends(require_admin)
):
    if db.query(Genus).filter(Genus.name == payload.name).first():
        raise HTTPException(status_code=409, detail="El género ya existe")
    genus = Genus(name=payload.name)
    db.add(genus)
    db.commit()
    db.refresh(genus)
    return genus


@router.put("/genera/{genus_id}", response_model=GenusOut)
def update_genus(
    genus_id: int,
    payload: GenusUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    genus = _get_genus_or_404(db, genus_id)
    if (
        payload.name != genus.name
        and db.query(Genus).filter(Genus.name == payload.name).first()
    ):
        raise HTTPException(status_code=409, detail="El género ya existe")
    genus.name = payload.name
    db.commit()
    db.refresh(genus)
    return genus


@router.delete("/genera/{genus_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_genus(
    genus_id: int, db: Session = Depends(get_db), _admin=Depends(require_admin)
):
    genus = _get_genus_or_404(db, genus_id)
    db.delete(genus)
    db.commit()


@router.get("/species", response_model=list[SpeciesOut])
def list_species(db: Session = Depends(get_db), _=Depends(require_any_role)):
    return db.query(Species).order_by(Species.name).all()


@router.post(
    "/species", response_model=SpeciesOut, status_code=status.HTTP_201_CREATED
)
def create_species(
    payload: SpeciesCreate,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    _get_genus_or_404(db, payload.genus_id)
    species = Species(
        genus_id=payload.genus_id, name=payload.name, morphology=payload.morphology
    )
    db.add(species)
    db.commit()
    db.refresh(species)
    return species


@router.put("/species/{species_id}", response_model=SpeciesOut)
def update_species(
    species_id: int,
    payload: SpeciesUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    species = _get_species_or_404(db, species_id)
    _get_genus_or_404(db, payload.genus_id)
    species.genus_id = payload.genus_id
    species.name = payload.name
    species.morphology = payload.morphology
    db.commit()
    db.refresh(species)
    return species


@router.delete("/species/{species_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_species(
    species_id: int, db: Session = Depends(get_db), _admin=Depends(require_admin)
):
    species = _get_species_or_404(db, species_id)
    db.delete(species)
    db.commit()
