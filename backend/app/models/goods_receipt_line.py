from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class GoodsReceiptLine(Base):
    __tablename__ = "goods_receipt_lines"

    id = Column(Integer, primary_key=True, index=True)
    goods_receipt_id = Column(Integer, ForeignKey("goods_receipts.id"), nullable=False)
    po_line_id = Column(Integer, ForeignKey("purchase_order_lines.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    quantity_received = Column(Numeric(15, 6), nullable=False)
    unit_of_measure = Column(String(20), nullable=False)
    batch_number = Column(String(100), nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    goods_receipt = relationship("GoodsReceipt", backref="lines")
    po_line = relationship("PurchaseOrderLine", backref="receipt_lines")
    material = relationship("Material", backref="goods_receipt_lines")

    def __repr__(self):
        return f"<GoodsReceiptLine(id={self.id}, grn_id={self.goods_receipt_id}, material_id={self.material_id}, qty={self.quantity_received})>"

    def to_dict(self):
        return {
            "id": self.id,
            "goods_receipt_id": self.goods_receipt_id,
            "po_line_id": self.po_line_id,
            "material_id": self.material_id,
            "quantity_received": float(self.quantity_received) if self.quantity_received else 0,
            "unit_of_measure": self.unit_of_measure,
            "batch_number": self.batch_number,
            "remarks": self.remarks,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
