from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class AuditLineItem(Base):
    """
    Individual material line item within an audit.

    BLIND AUDIT DESIGN:
    - Auditor ONLY sees: material info, unit_of_measure, physical_count field
    - Auditor enters: physical_count, auditor_notes
    - System calculates AFTER submission: expected_quantity, variance, is_anomaly

    This ensures the auditor cannot adjust their count to match expected values.
    """
    __tablename__ = "audit_line_items"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)

    # AUDITOR INPUT (visible during audit)
    physical_count = Column(Numeric(15, 6), nullable=True)  # Entered by auditor
    unit_of_measure = Column(String(20), nullable=False)
    auditor_notes = Column(Text, nullable=True)

    # SYSTEM CALCULATED (hidden from auditor, populated after submission)
    expected_quantity = Column(Numeric(15, 6), nullable=True)
    variance = Column(Numeric(15, 6), nullable=True)  # physical - expected
    variance_percentage = Column(Numeric(8, 4), nullable=True)  # (variance / expected) * 100
    threshold_used = Column(Numeric(8, 4), nullable=True)  # Threshold % at time of calculation
    is_anomaly = Column(Boolean, nullable=True)  # abs(variance_percentage) > threshold
    anomaly_id = Column(Integer, ForeignKey("anomalies.id"), nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    audit = relationship("Audit", backref="line_items")
    material = relationship("Material", backref="audit_line_items")
    anomaly = relationship("Anomaly", backref="audit_line_items")

    # Constraints
    __table_args__ = (
        UniqueConstraint('audit_id', 'material_id', name='uq_audit_line_item_audit_material'),
        Index("ix_audit_line_items_audit_id", "audit_id"),
        Index("ix_audit_line_items_is_anomaly", "is_anomaly"),
    )

    def __repr__(self):
        return (f"<AuditLineItem(id={self.id}, audit_id={self.audit_id}, "
                f"material_id={self.material_id}, is_anomaly={self.is_anomaly})>")

    def to_dict(self, include_hidden=False):
        """
        Convert to dictionary.

        Args:
            include_hidden: If False, excludes expected_quantity and variance fields
                           (for auditor view during IN_PROGRESS audits)
        """
        result = {
            "id": self.id,
            "audit_id": self.audit_id,
            "material_id": self.material_id,
            "physical_count": float(self.physical_count) if self.physical_count else None,
            "unit_of_measure": self.unit_of_measure,
            "auditor_notes": self.auditor_notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

        if include_hidden:
            result.update({
                "expected_quantity": float(self.expected_quantity) if self.expected_quantity else None,
                "variance": float(self.variance) if self.variance else None,
                "variance_percentage": float(self.variance_percentage) if self.variance_percentage else None,
                "threshold_used": float(self.threshold_used) if self.threshold_used else None,
                "is_anomaly": self.is_anomaly,
                "anomaly_id": self.anomaly_id,
            })

        return result

    def to_auditor_dict(self):
        """Return only fields visible to auditor during audit."""
        return self.to_dict(include_hidden=False)

    def to_full_dict(self):
        """Return all fields including calculated variance data."""
        return self.to_dict(include_hidden=True)
