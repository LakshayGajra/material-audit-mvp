from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ReconciliationLine(Base):
    """
    Individual material line item within a reconciliation report.

    Unlike audit line items, reconciliation lines show variances immediately
    after submission since the contractor reports their own inventory.
    """
    __tablename__ = "reconciliation_lines"

    id = Column(Integer, primary_key=True, index=True)
    reconciliation_id = Column(Integer, ForeignKey("reconciliations.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)

    # Contractor-reported values
    reported_quantity = Column(Numeric(15, 6), nullable=False)
    unit_of_measure = Column(String(20), nullable=False)
    contractor_notes = Column(Text, nullable=True)

    # System-calculated values (populated immediately on submission)
    system_quantity = Column(Numeric(15, 6), nullable=True)
    variance = Column(Numeric(15, 6), nullable=True)  # reported - system
    variance_percentage = Column(Numeric(8, 4), nullable=True)
    threshold_used = Column(Numeric(8, 4), nullable=True)
    is_anomaly = Column(Boolean, nullable=True)
    anomaly_id = Column(Integer, ForeignKey("anomalies.id"), nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    reconciliation = relationship("Reconciliation", backref="line_items")
    material = relationship("Material", backref="reconciliation_lines")
    anomaly = relationship("Anomaly", backref="reconciliation_lines")

    # Constraints
    __table_args__ = (
        UniqueConstraint('reconciliation_id', 'material_id', name='uq_reconciliation_line_recon_material'),
        Index("ix_reconciliation_lines_reconciliation_id", "reconciliation_id"),
        Index("ix_reconciliation_lines_is_anomaly", "is_anomaly"),
    )

    def __repr__(self):
        return (f"<ReconciliationLine(id={self.id}, reconciliation_id={self.reconciliation_id}, "
                f"material_id={self.material_id}, is_anomaly={self.is_anomaly})>")

    def to_dict(self):
        return {
            "id": self.id,
            "reconciliation_id": self.reconciliation_id,
            "material_id": self.material_id,
            "reported_quantity": float(self.reported_quantity) if self.reported_quantity else None,
            "unit_of_measure": self.unit_of_measure,
            "contractor_notes": self.contractor_notes,
            "system_quantity": float(self.system_quantity) if self.system_quantity else None,
            "variance": float(self.variance) if self.variance else None,
            "variance_percentage": float(self.variance_percentage) if self.variance_percentage else None,
            "threshold_used": float(self.threshold_used) if self.threshold_used else None,
            "is_anomaly": self.is_anomaly,
            "anomaly_id": self.anomaly_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
