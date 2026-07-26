from pydantic import BaseModel


class GeneroBase(BaseModel):
    nombre: str


class GeneroCreate(GeneroBase):
    pass


class GeneroOut(GeneroBase):
    id: int

    class Config:
        from_attributes = True


class EspecieBase(BaseModel):
    genero_id: int
    nombre: str
    morfologia: str | None = None
    numero_id: str | None = None


class EspecieCreate(EspecieBase):
    pass


class EspecieUpdate(BaseModel):
    genero_id: int | None = None
    nombre: str | None = None
    morfologia: str | None = None
    numero_id: str | None = None


class EspecieOut(EspecieBase):
    id: int

    class Config:
        from_attributes = True


class TipoFrascoBase(BaseModel):
    nombre: str
    capacidad: str | None = None


class TipoFrascoCreate(TipoFrascoBase):
    pass


class TipoFrascoOut(TipoFrascoBase):
    id: int

    class Config:
        from_attributes = True


class TipoMedioBase(BaseModel):
    nombre: str


class TipoMedioCreate(TipoMedioBase):
    pass


class TipoMedioOut(TipoMedioBase):
    id: int

    class Config:
        from_attributes = True
