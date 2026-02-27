from datetime import date
from sqlalchemy import Column, Integer, String, Text, Numeric, Date, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship, Session
from sqlalchemy.sql import func
from app.database import Base


class InventoryAdjustment(Base):
    """
    Records inventory adjustments made to correct variances found during audits.

    Adjustment Types:
    - AUDIT_CORRECTION: Adjusts contractor inventory to match physical count
    - WRITE_OFF: Material lost/damaged beyond recovery
    - FOUND: Material discovered that wasn't in records
    - TRANSFER_CORRECTION: Fixes transfer recording errors
    - OTHER: Miscellaneous adjustments

    All adjustments require approval and maintain full audit trail.
    """
    __tablename__ = "inventory_adjustments"

    # Adjustment types
    TYPE_AUDIT_CORRECTION = "AUDIT_CORRECTION"
    TYPE_WRITE_OFF = "WRITE_OFF"
    TYPE_FOUND = "FOUND"
    TYPE_TRANSFER_CORRECTION = "TRANSFER_CORRECTION"
    TYPE_OTHER = "OTHER"

    ALLOWED_TYPES = [
        TYPE_AUDIT_CORRECTION,
        TYPE_WRITE_OFF,
        TYPE_FOUND,
        TYPE_TRANSFER_CORRECTION,
        TYPE_OTHER,
    ]

    # Status values
    STATUS_PENDING = "PENDING"
    STATUS_APPROVED = "APPROVED"
    STATUS_REJECTED = "REJECTED"

    ALLOWED_STATUSES = [STATUS_PENDING, STATUS_APPROVED, STATUS_REJECTED]

    id = Column(Integer, primary_key=True, index=True)
    adjustment_number = Column(String(50), unique=True, nullable=False)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    inventory_check_line_id = Column(Integer, ForeignKey("inventory_check_lines.id"), nullable=True)
    adjustment_type = Column(String(30), nullable=False)
    quantity_before = Column(Numeric(15, 6), nullable=False)
    quantity_after = Column(Numeric(15, 6), nullable=False)
    adjustment_quantity = Column(Numeric(15, 6), nullable=False)  # Can be negative
    unit_of_measure = Column(String(20), nullable=False)
    adjustment_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=False)
    requested_by = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False, default=STATUS_PENDING)
    approved_by = Column(String(100), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    contractor = relationship("Contractor", backref="inventory_adjustments")
    material = relationship("Material", backref="inventory_adjustments")
    inventory_check_line = relationship("InventoryCheckLine", backref="inventory_adjustments")

    # Indexes
    __table_args__ = (
        Index("ix_inventory_adjustments_contractor_material", "contractor_id", "material_id"),
        Index("ix_inventory_adjustments_status", "status"),
        Index("ix_inventory_adjustments_type", "adjustment_type"),
        Index("ix_inventory_adjustments_date", "adjustment_date"),
    )

    def __repr__(self):
        return (f"<InventoryAdjustment(id={self.id}, adjustment_number='{self.adjustment_number}', "
                f"type='{self.adjustment_type}', status='{self.status}')>")

    def to_dict(self):
        return {
            "id": self.id,
            "adjustment_number": self.adjustment_number,
            "contractor_id": self.contractor_id,
            "material_id": self.material_id,
            "inventory_check_line_id": self.inventory_check_line_id,
            "adjustment_type": self.adjustment_type,
            "quantity_before": float(self.quantity_before) if self.quantity_before else None,
            "quantity_after": float(self.quantity_after) if self.quantity_after else None,
            "adjustment_quantity": float(self.adjustment_quantity) if self.adjustment_quantity else None,
            "unit_of_measure": self.unit_of_measure,
            "adjustment_date": self.adjustment_date.isoformat() if self.adjustment_date else None,
            "reason": self.reason,
            "requested_by": self.requested_by,
            "status": self.status,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "rejection_reason": self.rejection_reason,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @staticmethod
    def generate_adjustment_number(db: Session) -> str:
        """
        Generate a unique adjustment number in format ADJ-YYYY-XXXX.

        Example: ADJ-2026-0001, ADJ-2026-0002, etc.
        """
        current_year = date.today().year
        prefix = f"ADJ-{current_year}-"

        # Find the highest existing number for this year
        latest = db.query(InventoryAdjustment).filter(
            InventoryAdjustment.adjustment_number.like(f"{prefix}%")
        ).order_by(InventoryAdjustment.adjustment_number.desc()).first()

        if latest:
            try:
                last_num = int(latest.adjustment_number.split("-")[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1

        return f"{prefix}{next_num:04d}"
