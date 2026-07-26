from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.catalogos import Especie, TipoFrasco, TipoMedio
from app.models.cohorte import Cohorte, FaseCohorte
from app.models.lote import Lote
from app.models.user import User
from app.schemas.cohorte import CohorteOut
from app.schemas.lote import LoteCreate, LoteConCohorteRaiz, LoteOut

router = APIRouter(prefix="/api/lotes", tags=["lotes"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[LoteOut])
def list_lotes(db: Session = Depends(get_db)):
    return db.query(Lote).order_by(Lote.created_at.desc()).all()


@router.get("/{lote_id}", response_model=LoteConCohorteRaiz)
def get_lote(lote_id: int, db: Session = Depends(get_db)):
    lote = db.get(Lote, lote_id)
    if not lote:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    cohorte_raiz = (
        db.query(Cohorte)
        .filter(Cohorte.lote_id == lote_id, Cohorte.parent_cohorte_id.is_(None))
        .first()
    )
    return LoteConCohorteRaiz(
        **LoteOut.model_validate(lote).model_dump(),
        cohorte_raiz=CohorteOut.model_validate(cohorte_raiz),
    )


@router.post("", response_model=LoteConCohorteRaiz, status_code=201)
def create_lote(
    payload: LoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.get(Especie, payload.especie_id):
        raise HTTPException(status_code=404, detail="Especie no encontrada")
    if not db.get(TipoFrasco, payload.tipo_frasco_id):
        raise HTTPException(status_code=404, detail="Tipo de frasco no encontrado")
    if not db.get(TipoMedio, payload.tipo_medio_id):
        raise HTTPException(status_code=404, detail="Tipo de medio no encontrado")

    lote = Lote(
        especie_id=payload.especie_id,
        tipo_frasco_id=payload.tipo_frasco_id,
        tipo_medio_id=payload.tipo_medio_id,
        cantidad_sembrada=payload.cantidad_sembrada,
        fecha_siembra=payload.fecha_siembra,
        notas=payload.notas,
        folio=None,  # placeholder: formato pendiente de confirmar (spec v2 sec. 3)
    )
    db.add(lote)
    db.flush()  # obtiene lote.id sin cerrar la transaccion

    cohorte_raiz = Cohorte(
        lote_id=lote.id,
        parent_cohorte_id=None,
        fase=FaseCohorte.inicio,
        cantidad=payload.cantidad_sembrada,
        fecha_ultima_revision=payload.fecha_siembra,
        codigo=None,  # placeholder: esquema de codigo pendiente (spec v2 sec. 3)
    )
    db.add(cohorte_raiz)
    db.commit()
    db.refresh(lote)
    db.refresh(cohorte_raiz)

    return LoteConCohorteRaiz(
        **LoteOut.model_validate(lote).model_dump(),
        cohorte_raiz=CohorteOut.model_validate(cohorte_raiz),
    )
