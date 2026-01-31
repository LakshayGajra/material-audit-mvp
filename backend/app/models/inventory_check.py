from sqlalchemy import Column, Integer, String, Text, Numeric, Date, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class InventoryCheck(Base):
    """Unified inventory check - combines audit and self-report functionality."""
    __tablename__ = "inventory_checks"

    id = Column(Integer, primary_key=True, index=True)
    check_number = Column(String(20), unique=True, nullable=False)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=False)
    check_type = Column(String(20), nullable=False)  # 'audit' | 'self_report'
    is_blind = Column(Boolean, nullable=False, default=True)
    status = Column(String(20), nullable=False, default="draft")  # draft | counting | review | resolved
    initiated_by = Column(String(100), nullable=True)
    counted_by = Column(String(100), nullable=True)
    reviewed_by = Column(String(100), nullable=True)
    check_date = Column(Date, nullable=False)
    submitted_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    contractor = relationship("Contractor", backref="inventory_checks")

    def __repr__(self):
        return f"<InventoryCheck(id={self.id}, check_number='{self.check_number}', type='{self.check_type}', status='{self.status}')>"

    def to_dict(self):
        return {
            "id": self.id,
            "check_number": self.check_number,
            "contractor_id": self.contractor_id,
            "check_type": self.check_type,
            "is_blind": self.is_blind,
            "status": self.status,
            "initiated_by": self.initiated_by,
            "counted_by": self.counted_by,
            "reviewed_by": self.reviewed_by,
            "check_date": self.check_date.isoformat() if self.check_date else None,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class InventoryCheckLine(Base):
    """Line items for inventory checks."""
    __tablename__ = "inventory_check_lines"

    id = Column(Integer, primary_key=True, index=True)
    check_id = Column(Integer, ForeignKey("inventory_checks.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    expected_quantity = Column(Numeric(15, 3), nullable=False)
    actual_quantity = Column(Numeric(15, 3), nullable=True)
    variance = Column(Numeric(15, 3), nullable=True)
    variance_percent = Column(Numeric(5, 2), nullable=True)
    resolution = Column(String(20), nullable=True)  # 'accept' | 'keep_system' | 'investigate'
    adjustment_quantity = Column(Numeric(15, 3), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    check = relationship("InventoryCheck", backref="lines")
    material = relationship("Material", backref="inventory_check_lines")

    def __repr__(self):
        return f"<InventoryCheckLine(id={self.id}, check_id={self.check_id}, material_id={self.material_id})>"

    def to_dict(self):
        return {
            "id": self.id,
            "check_id": self.check_id,
            "material_id": self.material_id,
            "expected_quantity": float(self.expected_quantity) if self.expected_quantity else 0,
            "actual_quantity": float(self.actual_quantity) if self.actual_quantity else None,
            "variance": float(self.variance) if self.variance else None,
            "variance_percent": float(self.variance_percent) if self.variance_percent else None,
            "resolution": self.resolution,
            "adjustment_quantity": float(self.adjustment_quantity) if self.adjustment_quantity else None,
            "resolution_notes": self.resolution_notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
