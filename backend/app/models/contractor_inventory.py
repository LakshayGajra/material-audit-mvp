from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ContractorInventory(Base):
    __tablename__ = "contractor_inventory"

    id = Column(Integer, primary_key=True, index=True)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    quantity = Column(Float, nullable=False, default=0)
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    contractor = relationship("Contractor", backref="inventory")
    material = relationship("Material", backref="inventory")
