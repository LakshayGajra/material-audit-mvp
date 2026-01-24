from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Consumption(Base):
    __tablename__ = "consumption"

    id = Column(Integer, primary_key=True, index=True)
    production_record_id = Column(Integer, ForeignKey("production_records.id"), nullable=False)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    consumed_at = Column(DateTime, server_default=func.now())

    production_record = relationship("ProductionRecord", backref="consumptions")
    contractor = relationship("Contractor", backref="consumptions")
    material = relationship("Material", backref="consumptions")

    # Indexes for efficient queries
    __table_args__ = (
        Index("ix_consumption_contractor_material_date", "contractor_id", "material_id", "consumed_at"),
    )
