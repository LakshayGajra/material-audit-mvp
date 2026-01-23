from sqlalchemy import Column, Integer, String, Text, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(50), unique=True, nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    order_date = Column(Date, nullable=False)
    expected_delivery_date = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default="DRAFT")
    total_amount = Column(Numeric(15, 2), nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(String(100), nullable=True)
    approved_by = Column(String(100), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Allowed status values
    STATUS_DRAFT = "DRAFT"
    STATUS_SUBMITTED = "SUBMITTED"
    STATUS_APPROVED = "APPROVED"
    STATUS_PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED"
    STATUS_RECEIVED = "RECEIVED"
    STATUS_CANCELLED = "CANCELLED"

    ALLOWED_STATUSES = [
        STATUS_DRAFT,
        STATUS_SUBMITTED,
        STATUS_APPROVED,
        STATUS_PARTIALLY_RECEIVED,
        STATUS_RECEIVED,
        STATUS_CANCELLED,
    ]

    supplier = relationship("Supplier", backref="purchase_orders")
    warehouse = relationship("Warehouse", backref="purchase_orders")

    def __repr__(self):
        return f"<PurchaseOrder(id={self.id}, po_number='{self.po_number}', status='{self.status}')>"

    def to_dict(self):
        return {
            "id": self.id,
            "po_number": self.po_number,
            "supplier_id": self.supplier_id,
            "warehouse_id": self.warehouse_id,
            "order_date": self.order_date.isoformat() if self.order_date else None,
            "expected_delivery_date": self.expected_delivery_date.isoformat() if self.expected_delivery_date else None,
            "status": self.status,
            "total_amount": float(self.total_amount) if self.total_amount else None,
            "notes": self.notes,
            "created_by": self.created_by,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
