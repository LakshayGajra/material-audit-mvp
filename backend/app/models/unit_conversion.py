from decimal import Decimal
from sqlalchemy import Column, Integer, String, Numeric, Boolean, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class UnitConversion(Base):
    __tablename__ = "unit_conversions"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    from_unit = Column(String(20), nullable=False)
    to_unit = Column(String(20), nullable=False)
    conversion_factor = Column(Numeric(15, 6), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    material = relationship("Material", backref="unit_conversions")

    __table_args__ = (
        UniqueConstraint('material_id', 'from_unit', 'to_unit', name='uq_material_unit_conversion'),
    )

    def __repr__(self):
        return f"<UnitConversion(material_id={self.material_id}, {self.from_unit} -> {self.to_unit}, factor={self.conversion_factor})>"

    def convert(self, quantity) -> Decimal:
        """Convert quantity from from_unit to to_unit."""
        qty = Decimal(str(quantity))
        factor = Decimal(str(self.conversion_factor)) if self.conversion_factor else Decimal(1)
        return qty * factor

    def to_dict(self):
        return {
            "id": self.id,
            "material_id": self.material_id,
            "from_unit": self.from_unit,
            "to_unit": self.to_unit,
            "conversion_factor": float(self.conversion_factor) if self.conversion_factor else 1.0,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
