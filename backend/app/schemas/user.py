from pydantic import BaseModel

from app.models.user import RolUsuario


class UserBase(BaseModel):
    nombre: str
    email: str
    rol: RolUsuario = RolUsuario.operador
    activo: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    nombre: str | None = None
    rol: RolUsuario | None = None
    activo: bool | None = None
    password: str | None = None


class UserOut(UserBase):
    id: int

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
