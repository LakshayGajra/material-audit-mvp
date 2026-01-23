from decimal import Decimal
from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship, Session
from sqlalchemy.sql import func
from app.database import Base


class VarianceThreshold(Base):
    """
    Configurable variance thresholds per material-contractor pair.

    Threshold lookup priority:
    1. Contractor-specific: WHERE contractor_id = X AND material_id = Y
    2. Material default: WHERE contractor_id IS NULL AND material_id = Y
    3. System default: 2.0%
    """
    __tablename__ = "variance_thresholds"

    # System default threshold (used when no specific threshold is found)
    SYSTEM_DEFAULT_THRESHOLD = Decimal("2.0")

    id = Column(Integer, primary_key=True, index=True)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    threshold_percentage = Column(Numeric(8, 4), nullable=False, default=2.0)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    contractor = relationship("Contractor", backref="variance_thresholds")
    material = relationship("Material", backref="variance_thresholds")

    # Unique constraint: one threshold per contractor-material pair
    # NULL contractor_id with specific material_id = default for that material
    __table_args__ = (
        UniqueConstraint('contractor_id', 'material_id', name='uq_variance_threshold_contractor_material'),
    )

    def __repr__(self):
        contractor_str = f"contractor_id={self.contractor_id}" if self.contractor_id else "default"
        return f"<VarianceThreshold({contractor_str}, material_id={self.material_id}, threshold={self.threshold_percentage}%)>"

    def to_dict(self):
        return {
            "id": self.id,
            "contractor_id": self.contractor_id,
            "material_id": self.material_id,
            "threshold_percentage": float(self.threshold_percentage) if self.threshold_percentage else 2.0,
            "is_active": self.is_active,
            "created_by": self.created_by,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @staticmethod
    def get_threshold(contractor_id: int, material_id: int, db: Session) -> Decimal:
        """
        Get the variance threshold for a contractor-material pair.

        Lookup priority:
        1. Contractor-specific threshold
        2. Material default threshold (contractor_id IS NULL)
        3. System default (2.0%)
        """
        # Try contractor-specific threshold
        contractor_threshold = db.query(VarianceThreshold).filter(
            VarianceThreshold.contractor_id == contractor_id,
            VarianceThreshold.material_id == material_id,
            VarianceThreshold.is_active == True,
        ).first()

        if contractor_threshold:
            return Decimal(str(contractor_threshold.threshold_percentage))

        # Try material default (contractor_id IS NULL)
        material_default = db.query(VarianceThreshold).filter(
            VarianceThreshold.contractor_id.is_(None),
            VarianceThreshold.material_id == material_id,
            VarianceThreshold.is_active == True,
        ).first()

        if material_default:
            return Decimal(str(material_default.threshold_percentage))

        # Return system default
        return VarianceThreshold.SYSTEM_DEFAULT_THRESHOLD
