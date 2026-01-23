from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class GoodsReceipt(Base):
    __tablename__ = "goods_receipts"

    id = Column(Integer, primary_key=True, index=True)
    grn_number = Column(String(50), unique=True, nullable=False)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    receipt_date = Column(Date, nullable=False)
    received_by = Column(String(100), nullable=False)
    vehicle_number = Column(String(50), nullable=True)
    supplier_challan_number = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    purchase_order = relationship("PurchaseOrder", backref="goods_receipts")
    warehouse = relationship("Warehouse", backref="goods_receipts")

    def __repr__(self):
        return f"<GoodsReceipt(id={self.id}, grn_number='{self.grn_number}', po_id={self.purchase_order_id})>"

    def to_dict(self):
        return {
            "id": self.id,
            "grn_number": self.grn_number,
            "purchase_order_id": self.purchase_order_id,
            "warehouse_id": self.warehouse_id,
            "receipt_date": self.receipt_date.isoformat() if self.receipt_date else None,
            "received_by": self.received_by,
            "vehicle_number": self.vehicle_number,
            "supplier_challan_number": self.supplier_challan_number,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
