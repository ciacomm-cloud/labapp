from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models.user import User, UserRole
from app.schemas.user import Token, UserCreate, UserOut, UserUpdate
from app.services.auth import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _get_user_or_404(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


def _other_admins_count(db: Session, excluding_user_id: int) -> int:
    return (
        db.query(User)
        .filter(User.role == UserRole.admin, User.id != excluding_user_id)
        .count()
    )


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if (
        user is None
        or not user.is_active
        or not verify_password(form_data.password, user.hashed_password)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
        )
    token = create_access_token(subject=user.username, role=user.role.value)
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=409, detail="El usuario ya existe")
    user = User(
        username=payload.username,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    return db.query(User).order_by(User.username).all()


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = _get_user_or_404(db, user_id)

    demoting_or_deactivating = payload.role != UserRole.admin or not payload.is_active
    if user.role == UserRole.admin and demoting_or_deactivating:
        if user.id == admin.id:
            raise HTTPException(
                status_code=400,
                detail="No puedes quitarte el rol de admin ni desactivar tu propia cuenta",
            )
        if _other_admins_count(db, excluding_user_id=user.id) == 0:
            raise HTTPException(
                status_code=400,
                detail="No puedes quitarle el rol de admin al último administrador",
            )

    user.full_name = payload.full_name
    user.role = payload.role
    user.is_active = payload.is_active
    if payload.password:
        user.hashed_password = hash_password(payload.password)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = _get_user_or_404(db, user_id)
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="No puedes borrar tu propia cuenta")
    if user.role == UserRole.admin and _other_admins_count(db, excluding_user_id=user.id) == 0:
        raise HTTPException(status_code=400, detail="No puedes borrar al último administrador")
    db.delete(user)
    db.commit()
