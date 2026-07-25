import enum

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class DiscardReason(str, enum.Enum):
    hongos = "hongos"
    endofitos = "endofitos"
    bacterias = "bacterias"
    oxidacion = "oxidacion"
    error_manejo = "error_manejo"
    otro = "otro"


class Genus(Base):
    __tablename__ = "genera"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)

    species = relationship("Species", back_populates="genus")


class Species(Base):
    __tablename__ = "species"

    id = Column(Integer, primary_key=True)
    genus_id = Column(Integer, ForeignKey("genera.id"), nullable=False)
    name = Column(String(150), nullable=False)
    morphology = Column(String(100), nullable=True)

    genus = relationship("Genus", back_populates="species")
    catalog_items = relationship("CatalogItem", back_populates="species")


class CatalogItem(Base):
    __tablename__ = "catalog_items"

    id = Column(Integer, primary_key=True)
    catalog_code = Column(String(20), unique=True, nullable=False)
    species_id = Column(Integer, ForeignKey("species.id"), nullable=False)
    status = Column(String(20), nullable=False, default="active")

    species = relationship("Species", back_populates="catalog_items")
    logs = relationship(
        "InventoryLog",
        back_populates="catalog_item",
        order_by="InventoryLog.created_at.desc()",
    )


class InventoryLog(Base):
    __tablename__ = "inventory_logs"

    id = Column(Integer, primary_key=True)
    catalog_item_id = Column(Integer, ForeignKey("catalog_items.id"), nullable=False)

    normal_jars = Column(Integer, nullable=False, default=0)
    ready_jars = Column(Integer, nullable=False, default=0)
    rescue_1_jars = Column(Integer, nullable=False, default=0)
    rescue_2_jars = Column(Integer, nullable=False, default=0)
    discarded_jars = Column(Integer, nullable=False, default=0)
    discard_reason = Column(Enum(DiscardReason), nullable=True)

    last_subculture_date = Column(Date, nullable=False)
    notes = Column(Text, nullable=True)

    updated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    catalog_item = relationship("CatalogItem", back_populates="logs")
