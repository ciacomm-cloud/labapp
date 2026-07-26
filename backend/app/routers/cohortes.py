from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.cohorte import Cohorte, FaseCohorte
from app.models.evento_cohorte import EventoCohorte, TipoEvento
from app.models.user import User
from app.schemas.cohorte import (
    CapturaRequest, CapturaResponse, CohorteConHistorial, CohorteOut, EventoOut,
)

router = APIRouter(prefix="/api/cohortes", tags=["cohortes"], dependencies=[Depends(get_current_user)])

# tipo de evento -> fase de la cohorte hija que nace (None = no nace cohorte hija)
_FASE_DESTINO = {
    TipoEvento.multiplicacion: FaseCohorte.multiplicacion,
    TipoEvento.contaminacion: FaseCohorte.descartado,
    TipoEvento.endofitos: FaseCohorte.rescate_1,
    TipoEvento.rescate_exito: FaseCohorte.normal,
    TipoEvento.rescate_falla: FaseCohorte.descartado,
    TipoEvento.enraizamiento: FaseCohorte.enraizamiento,
    TipoEvento.endurecimiento: FaseCohorte.endurecimiento,
}

_MOTIVO_OBLIGATORIO = {TipoEvento.contaminacion, TipoEvento.rescate_falla}
_SOLO_EN_RESCATE = {TipoEvento.rescate_exito, TipoEvento.rescate_persiste, TipoEvento.rescate_falla}


@router.get("", response_model=list[CohorteOut])
def list_cohortes(
    fase: FaseCohorte | None = None,
    lote_id: int | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Cohorte)
    if fase is not None:
        query = query.filter(Cohorte.fase == fase)
    if lote_id is not None:
        query = query.filter(Cohorte.lote_id == lote_id)
    # En MySQL, NULL ya ordena antes que cualquier valor con ASC.
    return query.order_by(Cohorte.fecha_ultima_revision.asc()).all()


@router.get("/{cohorte_id}", response_model=CohorteConHistorial)
def get_cohorte(cohorte_id: int, db: Session = Depends(get_db)):
    cohorte = db.get(Cohorte, cohorte_id)
    if not cohorte:
        raise HTTPException(status_code=404, detail="Cohorte no encontrada")
    eventos = (
        db.query(EventoCohorte)
        .filter(EventoCohorte.cohorte_padre_id == cohorte_id)
        .order_by(EventoCohorte.fecha.asc(), EventoCohorte.id.asc())
        .all()
    )
    result = CohorteConHistorial.model_validate(cohorte)
    result.eventos_como_padre = [EventoOut.model_validate(e) for e in eventos]
    return result


@router.post("/{cohorte_id}/eventos", response_model=CapturaResponse)
def capturar_eventos(
    cohorte_id: int,
    payload: CapturaRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cohorte_padre = db.get(Cohorte, cohorte_id)
    if not cohorte_padre:
        raise HTTPException(status_code=404, detail="Cohorte no encontrada")
    if not payload.eventos:
        raise HTTPException(status_code=400, detail="Debe capturar al menos un evento")

    remaining = cohorte_padre.cantidad
    cohortes_hijas: list[Cohorte] = []
    eventos_creados: list[EventoCohorte] = []

    for item in payload.eventos:
        if item.tipo_evento in _MOTIVO_OBLIGATORIO and not item.motivo:
            raise HTTPException(
                status_code=400,
                detail=f"El evento '{item.tipo_evento.value}' requiere un motivo",
            )
        if item.tipo_evento in _SOLO_EN_RESCATE and cohorte_padre.fase not in (
            FaseCohorte.rescate_1,
            FaseCohorte.rescate_2,
        ):
            raise HTTPException(
                status_code=400,
                detail="Este resultado de rescate solo aplica a cohortes en Rescate 1 o 2",
            )

        cohorte_hija = None

        if item.tipo_evento == TipoEvento.sin_cambios:
            pass

        elif item.tipo_evento == TipoEvento.multiplicacion:
            if remaining <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="No quedan frascos disponibles en esta cohorte para multiplicar",
                )
            if not item.cantidad or item.cantidad <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="La multiplicación requiere la cantidad de frascos nuevos sembrados",
                )
            cohorte_hija = Cohorte(
                lote_id=cohorte_padre.lote_id,
                parent_cohorte_id=cohorte_padre.id,
                fase=FaseCohorte.multiplicacion,
                cantidad=item.cantidad,
                fecha_ultima_revision=payload.fecha,
            )
            remaining = 0

        elif item.tipo_evento == TipoEvento.rescate_persiste:
            if not item.cantidad or item.cantidad <= 0:
                raise HTTPException(status_code=400, detail="Cantidad inválida")
            if item.cantidad > remaining:
                raise HTTPException(
                    status_code=400,
                    detail="La cantidad excede lo disponible en la cohorte",
                )
            cohorte_hija = Cohorte(
                lote_id=cohorte_padre.lote_id,
                parent_cohorte_id=cohorte_padre.id,
                fase=FaseCohorte.rescate_2,
                cantidad=item.cantidad,
                fecha_ultima_revision=payload.fecha,
            )
            remaining -= item.cantidad

        else:
            fase_destino = _FASE_DESTINO[item.tipo_evento]
            if not item.cantidad or item.cantidad <= 0:
                raise HTTPException(status_code=400, detail="Cantidad inválida")
            if item.cantidad > remaining:
                raise HTTPException(
                    status_code=400,
                    detail="La cantidad excede lo disponible en la cohorte",
                )
            cohorte_hija = Cohorte(
                lote_id=cohorte_padre.lote_id,
                parent_cohorte_id=cohorte_padre.id,
                fase=fase_destino,
                cantidad=item.cantidad,
                fecha_ultima_revision=payload.fecha,
            )
            remaining -= item.cantidad

        if cohorte_hija is not None:
            db.add(cohorte_hija)
            db.flush()
            cohortes_hijas.append(cohorte_hija)

        evento = EventoCohorte(
            cohorte_padre_id=cohorte_padre.id,
            cohorte_hija_id=cohorte_hija.id if cohorte_hija else None,
            tipo_evento=item.tipo_evento,
            cantidad=item.cantidad,
            motivo=item.motivo,
            notas=item.notas,
            fecha=payload.fecha,
            usuario_id=current_user.id,
        )
        db.add(evento)
        eventos_creados.append(evento)

    cohorte_padre.cantidad = remaining
    cohorte_padre.fecha_ultima_revision = payload.fecha

    db.commit()
    db.refresh(cohorte_padre)
    for c in cohortes_hijas:
        db.refresh(c)
    for e in eventos_creados:
        db.refresh(e)

    return CapturaResponse(
        cohorte_padre=CohorteOut.model_validate(cohorte_padre),
        cohortes_hijas=[CohorteOut.model_validate(c) for c in cohortes_hijas],
        eventos=[EventoOut.model_validate(e) for e in eventos_creados],
    )
