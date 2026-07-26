from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.catalogos import Genero, Especie, TipoFrasco, TipoMedio
from app.schemas.catalogos import (
    GeneroCreate, GeneroOut,
    EspecieCreate, EspecieUpdate, EspecieOut,
    TipoFrascoCreate, TipoFrascoOut,
    TipoMedioCreate, TipoMedioOut,
)

router = APIRouter(prefix="/api/catalogos", tags=["catalogos"], dependencies=[Depends(get_current_user)])


# --- Genero ---

@router.get("/generos", response_model=list[GeneroOut])
def list_generos(db: Session = Depends(get_db)):
    return db.query(Genero).order_by(Genero.nombre).all()


@router.post("/generos", response_model=GeneroOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_genero(payload: GeneroCreate, db: Session = Depends(get_db)):
    if db.query(Genero).filter(Genero.nombre == payload.nombre).first():
        raise HTTPException(status_code=409, detail="Ya existe ese género")
    genero = Genero(**payload.model_dump())
    db.add(genero)
    db.commit()
    db.refresh(genero)
    return genero


@router.delete("/generos/{genero_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_genero(genero_id: int, db: Session = Depends(get_db)):
    genero = db.get(Genero, genero_id)
    if not genero:
        raise HTTPException(status_code=404, detail="Género no encontrado")
    if db.query(Especie).filter(Especie.genero_id == genero_id).first():
        raise HTTPException(status_code=409, detail="No se puede borrar: tiene especies asociadas")
    db.delete(genero)
    db.commit()


# --- Especie ---

@router.get("/especies", response_model=list[EspecieOut])
def list_especies(genero_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(Especie)
    if genero_id is not None:
        query = query.filter(Especie.genero_id == genero_id)
    return query.order_by(Especie.nombre).all()


@router.post("/especies", response_model=EspecieOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_especie(payload: EspecieCreate, db: Session = Depends(get_db)):
    if not db.get(Genero, payload.genero_id):
        raise HTTPException(status_code=404, detail="Género no encontrado")
    especie = Especie(**payload.model_dump())
    db.add(especie)
    db.commit()
    db.refresh(especie)
    return especie


@router.patch("/especies/{especie_id}", response_model=EspecieOut, dependencies=[Depends(require_admin)])
def update_especie(especie_id: int, payload: EspecieUpdate, db: Session = Depends(get_db)):
    especie = db.get(Especie, especie_id)
    if not especie:
        raise HTTPException(status_code=404, detail="Especie no encontrada")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(especie, field, value)
    db.commit()
    db.refresh(especie)
    return especie


@router.delete("/especies/{especie_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_especie(especie_id: int, db: Session = Depends(get_db)):
    especie = db.get(Especie, especie_id)
    if not especie:
        raise HTTPException(status_code=404, detail="Especie no encontrada")
    db.delete(especie)
    db.commit()


# --- Tipo de Frasco ---

@router.get("/tipos-frasco", response_model=list[TipoFrascoOut])
def list_tipos_frasco(db: Session = Depends(get_db)):
    return db.query(TipoFrasco).order_by(TipoFrasco.nombre).all()


@router.post("/tipos-frasco", response_model=TipoFrascoOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_tipo_frasco(payload: TipoFrascoCreate, db: Session = Depends(get_db)):
    if db.query(TipoFrasco).filter(TipoFrasco.nombre == payload.nombre).first():
        raise HTTPException(status_code=409, detail="Ya existe ese tipo de frasco")
    tipo = TipoFrasco(**payload.model_dump())
    db.add(tipo)
    db.commit()
    db.refresh(tipo)
    return tipo


@router.delete("/tipos-frasco/{tipo_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_tipo_frasco(tipo_id: int, db: Session = Depends(get_db)):
    tipo = db.get(TipoFrasco, tipo_id)
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de frasco no encontrado")
    db.delete(tipo)
    db.commit()


# --- Tipo de Medio ---

@router.get("/tipos-medio", response_model=list[TipoMedioOut])
def list_tipos_medio(db: Session = Depends(get_db)):
    return db.query(TipoMedio).order_by(TipoMedio.nombre).all()


@router.post("/tipos-medio", response_model=TipoMedioOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_tipo_medio(payload: TipoMedioCreate, db: Session = Depends(get_db)):
    if db.query(TipoMedio).filter(TipoMedio.nombre == payload.nombre).first():
        raise HTTPException(status_code=409, detail="Ya existe ese tipo de medio")
    tipo = TipoMedio(**payload.model_dump())
    db.add(tipo)
    db.commit()
    db.refresh(tipo)
    return tipo


@router.delete("/tipos-medio/{tipo_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_tipo_medio(tipo_id: int, db: Session = Depends(get_db)):
    tipo = db.get(TipoMedio, tipo_id)
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de medio no encontrado")
    db.delete(tipo)
    db.commit()
