from decimal import Decimal
from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class PurchaseOrderLine(Base):
    __tablename__ = "purchase_order_lines"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    quantity_ordered = Column(Numeric(15, 6), nullable=False)
    unit_of_measure = Column(String(20), nullable=False)
    unit_price = Column(Numeric(15, 2), nullable=True)
    quantity_received = Column(Numeric(15, 6), nullable=False, default=0)
    status = Column(String(20), nullable=False, default="PENDING")
    created_at = Column(DateTime, server_default=func.now())

    # Allowed status values
    STATUS_PENDING = "PENDING"
    STATUS_PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED"
    STATUS_RECEIVED = "RECEIVED"
    STATUS_CANCELLED = "CANCELLED"

    ALLOWED_STATUSES = [
        STATUS_PENDING,
        STATUS_PARTIALLY_RECEIVED,
        STATUS_RECEIVED,
        STATUS_CANCELLED,
    ]

    purchase_order = relationship("PurchaseOrder", backref="lines")
    material = relationship("Material", backref="purchase_order_lines")

    def __repr__(self):
        return f"<PurchaseOrderLine(id={self.id}, po_id={self.purchase_order_id}, material_id={self.material_id}, qty={self.quantity_ordered})>"

    def remaining_quantity(self) -> Decimal:
        """Returns the quantity still pending receipt."""
        ordered = Decimal(str(self.quantity_ordered)) if self.quantity_ordered else Decimal(0)
        received = Decimal(str(self.quantity_received)) if self.quantity_received else Decimal(0)
        return ordered - received

    def to_dict(self):
        return {
            "id": self.id,
            "purchase_order_id": self.purchase_order_id,
            "material_id": self.material_id,
            "quantity_ordered": float(self.quantity_ordered) if self.quantity_ordered else 0,
            "unit_of_measure": self.unit_of_measure,
            "unit_price": float(self.unit_price) if self.unit_price else None,
            "quantity_received": float(self.quantity_received) if self.quantity_received else 0,
            "status": self.status,
            "remaining_quantity": float(self.remaining_quantity()),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
