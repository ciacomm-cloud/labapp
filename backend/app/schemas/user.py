from pydantic import BaseModel, ConfigDict

from app.models.user import UserRole


class UserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    role: UserRole = UserRole.tech


class UserUpdate(BaseModel):
    full_name: str
    role: UserRole
    is_active: bool
    password: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    role: UserRole
    is_active: bool


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
