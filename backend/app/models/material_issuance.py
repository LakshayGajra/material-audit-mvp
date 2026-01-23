from datetime import date
from sqlalchemy import Column, Integer, String, Text, Numeric, Date, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship, Session
from sqlalchemy.sql import func
from app.database import Base


class MaterialIssuance(Base):
    """
    Transaction log for all material movements to contractors.

    This table is APPEND-ONLY. Never update, never delete.
    Every issuance creates a permanent record.
    """
    __tablename__ = "material_issuances"

    id = Column(Integer, primary_key=True, index=True)
    issuance_number = Column(String(50), unique=True, nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    quantity = Column(Numeric(15, 6), nullable=False)  # Quantity in issuance unit
    unit_of_measure = Column(String(20), nullable=False)  # Issuance unit
    quantity_in_base_unit = Column(Numeric(15, 6), nullable=False)  # Converted to storage unit
    base_unit = Column(String(20), nullable=False)  # Storage unit
    issued_date = Column(Date, nullable=False)
    issued_by = Column(String(100), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    warehouse = relationship("Warehouse", backref="material_issuances")
    contractor = relationship("Contractor", backref="material_issuances")
    material = relationship("Material", backref="material_issuances")

    # Composite index for efficient queries by contractor, material, and date
    __table_args__ = (
        Index("ix_material_issuances_contractor_material_date",
              "contractor_id", "material_id", "issued_date"),
    )

    def __repr__(self):
        return (f"<MaterialIssuance(id={self.id}, issuance_number='{self.issuance_number}', "
                f"contractor_id={self.contractor_id}, material_id={self.material_id})>")

    def to_dict(self):
        return {
            "id": self.id,
            "issuance_number": self.issuance_number,
            "warehouse_id": self.warehouse_id,
            "contractor_id": self.contractor_id,
            "material_id": self.material_id,
            "quantity": float(self.quantity) if self.quantity else None,
            "unit_of_measure": self.unit_of_measure,
            "quantity_in_base_unit": float(self.quantity_in_base_unit) if self.quantity_in_base_unit else None,
            "base_unit": self.base_unit,
            "issued_date": self.issued_date.isoformat() if self.issued_date else None,
            "issued_by": self.issued_by,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @staticmethod
    def generate_issuance_number(db: Session) -> str:
        """
        Generate a unique issuance number in format ISS-YYYY-XXXX.

        Example: ISS-2026-0001, ISS-2026-0002, etc.
        """
        current_year = date.today().year
        prefix = f"ISS-{current_year}-"

        # Find the highest existing number for this year
        latest = db.query(MaterialIssuance).filter(
            MaterialIssuance.issuance_number.like(f"{prefix}%")
        ).order_by(MaterialIssuance.issuance_number.desc()).first()

        if latest:
            # Extract the sequence number and increment
            try:
                last_num = int(latest.issuance_number.split("-")[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1

        return f"{prefix}{next_num:04d}"
