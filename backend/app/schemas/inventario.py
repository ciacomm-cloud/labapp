from pydantic import BaseModel, ConfigDict


class GenusCreate(BaseModel):
    name: str


class GenusUpdate(BaseModel):
    name: str


class GenusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class SpeciesCreate(BaseModel):
    genus_id: int
    name: str
    morphology: str | None = None


class SpeciesUpdate(BaseModel):
    genus_id: int
    name: str
    morphology: str | None = None


class SpeciesOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    genus_id: int
    name: str
    morphology: str | None
    genus: GenusOut


class CatalogItemCreate(BaseModel):
    catalog_code: str
    species_id: int
    status: str = "active"


class CatalogItemUpdate(BaseModel):
    species_id: int
    status: str


class CatalogItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    catalog_code: str
    species_id: int
    status: str
    species: SpeciesOut
