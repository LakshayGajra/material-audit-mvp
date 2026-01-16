from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, index=True)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    production_record_id = Column(Integer, ForeignKey("production_records.id"), nullable=True)
    expected_quantity = Column(Float, nullable=False)
    actual_quantity = Column(Float, nullable=False)
    variance = Column(Float, nullable=False)
    variance_percent = Column(Float, nullable=False)
    anomaly_type = Column(String(50), nullable=False)  # 'shortage', 'excess', 'negative_inventory'
    notes = Column(Text, nullable=True)
    resolved = Column(Boolean, default=False, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    contractor = relationship("Contractor", backref="anomalies")
    material = relationship("Material", backref="anomalies")
    production_record = relationship("ProductionRecord", backref="anomalies")
