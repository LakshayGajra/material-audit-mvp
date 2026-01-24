from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime, Text, Boolean, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Anomaly(Base):
    __tablename__ = "anomalies"

    # Severity levels
    SEVERITY_LOW = "LOW"
    SEVERITY_MEDIUM = "MEDIUM"
    SEVERITY_HIGH = "HIGH"
    SEVERITY_CRITICAL = "CRITICAL"

    ALLOWED_SEVERITIES = [SEVERITY_LOW, SEVERITY_MEDIUM, SEVERITY_HIGH, SEVERITY_CRITICAL]

    id = Column(Integer, primary_key=True, index=True)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    production_record_id = Column(Integer, ForeignKey("production_records.id"), nullable=True)
    expected_quantity = Column(Float, nullable=False)
    actual_quantity = Column(Float, nullable=False)
    variance = Column(Float, nullable=False)
    variance_percent = Column(Float, nullable=False)
    anomaly_type = Column(String(50), nullable=False)  # 'shortage', 'excess', 'negative_inventory'
    severity = Column(String(20), nullable=False, default=SEVERITY_MEDIUM)
    notes = Column(Text, nullable=True)
    resolved = Column(Boolean, default=False, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    contractor = relationship("Contractor", backref="anomalies")
    material = relationship("Material", backref="anomalies")
    production_record = relationship("ProductionRecord", backref="anomalies")

    # Indexes for efficient queries
    __table_args__ = (
        Index("ix_anomalies_contractor_resolved", "contractor_id", "resolved"),
        Index("ix_anomalies_severity", "severity"),
        Index("ix_anomalies_created_at", "created_at"),
    )

    @classmethod
    def calculate_severity(cls, variance_percent: float) -> str:
        """Calculate severity based on variance percentage."""
        abs_variance = abs(variance_percent)
        if abs_variance >= 20:
            return cls.SEVERITY_CRITICAL
        elif abs_variance >= 10:
            return cls.SEVERITY_HIGH
        elif abs_variance >= 5:
            return cls.SEVERITY_MEDIUM
        else:
            return cls.SEVERITY_LOW
