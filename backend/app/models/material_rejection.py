from datetime import date
from sqlalchemy import Column, Integer, String, Text, Numeric, Date, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship, Session
from sqlalchemy.sql import func
from app.database import Base


class MaterialRejection(Base):
    """
    Tracks when contractors reject defective materials.

    Workflow:
    1. Contractor reports rejection (status = REPORTED)
    2. Manager approves/disputes (status = APPROVED or DISPUTED)
    3. Warehouse receives returned material (status = RECEIVED_AT_WAREHOUSE)

    Inventory only changes when status becomes RECEIVED_AT_WAREHOUSE.
    """
    __tablename__ = "material_rejections"

    # Status constants
    STATUS_REPORTED = "REPORTED"
    STATUS_APPROVED = "APPROVED"
    STATUS_RECEIVED_AT_WAREHOUSE = "RECEIVED_AT_WAREHOUSE"
    STATUS_DISPUTED = "DISPUTED"
    STATUS_CANCELLED = "CANCELLED"

    ALLOWED_STATUSES = [
        STATUS_REPORTED,
        STATUS_APPROVED,
        STATUS_RECEIVED_AT_WAREHOUSE,
        STATUS_DISPUTED,
        STATUS_CANCELLED,
    ]

    id = Column(Integer, primary_key=True, index=True)
    rejection_number = Column(String(50), unique=True, nullable=False)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    original_issuance_id = Column(Integer, ForeignKey("material_issuances.id"), nullable=True)
    quantity_rejected = Column(Numeric(15, 6), nullable=False)
    unit_of_measure = Column(String(20), nullable=False)
    rejection_date = Column(Date, nullable=False)
    rejection_reason = Column(Text, nullable=False)
    reported_by = Column(String(100), nullable=False)
    return_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    status = Column(String(30), nullable=False, default=STATUS_REPORTED)
    approved_by = Column(String(100), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    received_by = Column(String(100), nullable=True)
    received_at = Column(DateTime, nullable=True)
    warehouse_grn_number = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    contractor = relationship("Contractor", backref="rejections")
    material = relationship("Material", backref="rejections")
    original_issuance = relationship("MaterialIssuance", backref="rejections")
    return_warehouse = relationship("Warehouse", backref="material_rejections")

    # Indexes
    __table_args__ = (
        Index("ix_material_rejections_contractor_material", "contractor_id", "material_id"),
        Index("ix_material_rejections_status", "status"),
        Index("ix_material_rejections_rejection_date", "rejection_date"),
        Index("ix_material_rejections_contractor_status", "contractor_id", "status"),
    )

    def __repr__(self):
        return (f"<MaterialRejection(id={self.id}, rejection_number='{self.rejection_number}', "
                f"status='{self.status}')>")

    def to_dict(self):
        return {
            "id": self.id,
            "rejection_number": self.rejection_number,
            "contractor_id": self.contractor_id,
            "material_id": self.material_id,
            "original_issuance_id": self.original_issuance_id,
            "quantity_rejected": float(self.quantity_rejected) if self.quantity_rejected else None,
            "unit_of_measure": self.unit_of_measure,
            "rejection_date": self.rejection_date.isoformat() if self.rejection_date else None,
            "rejection_reason": self.rejection_reason,
            "reported_by": self.reported_by,
            "return_warehouse_id": self.return_warehouse_id,
            "status": self.status,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "received_by": self.received_by,
            "received_at": self.received_at.isoformat() if self.received_at else None,
            "warehouse_grn_number": self.warehouse_grn_number,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @staticmethod
    def generate_rejection_number(db: Session) -> str:
        """
        Generate a unique rejection number in format REJ-YYYY-XXXX.

        Example: REJ-2026-0001, REJ-2026-0002, etc.
        """
        current_year = date.today().year
        prefix = f"REJ-{current_year}-"

        # Find the highest existing number for this year
        latest = db.query(MaterialRejection).filter(
            MaterialRejection.rejection_number.like(f"{prefix}%")
        ).order_by(MaterialRejection.rejection_number.desc()).first()

        if latest:
            try:
                last_num = int(latest.rejection_number.split("-")[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1

        return f"{prefix}{next_num:04d}"

    @staticmethod
    def generate_return_grn_number(db: Session) -> str:
        """
        Generate a unique GRN number for returned materials.

        Format: RGRN-YYYY-XXXX (Return GRN)
        """
        current_year = date.today().year
        prefix = f"RGRN-{current_year}-"

        # Find the highest existing number for this year
        latest = db.query(MaterialRejection).filter(
            MaterialRejection.warehouse_grn_number.like(f"{prefix}%")
        ).order_by(MaterialRejection.warehouse_grn_number.desc()).first()

        if latest and latest.warehouse_grn_number:
            try:
                last_num = int(latest.warehouse_grn_number.split("-")[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1

        return f"{prefix}{next_num:04d}"
