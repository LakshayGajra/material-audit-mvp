from sqlalchemy import Column, Integer, String, Text, Numeric, Date, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class FinishedGoodsInventory(Base):
    """Tracks finished goods held by the company (received from contractors)."""
    __tablename__ = "finished_goods_inventory"

    id = Column(Integer, primary_key=True, index=True)
    finished_good_id = Column(Integer, ForeignKey("finished_goods.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    current_quantity = Column(Numeric(15, 3), nullable=False, default=0)
    unit_of_measure = Column(String(20), nullable=True)
    last_receipt_date = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    finished_good = relationship("FinishedGood", backref="inventory_records")
    warehouse = relationship("Warehouse", backref="finished_goods_inventory")

    def __repr__(self):
        return f"<FinishedGoodsInventory(id={self.id}, fg_id={self.finished_good_id}, wh_id={self.warehouse_id}, qty={self.current_quantity})>"

    def to_dict(self):
        return {
            "id": self.id,
            "finished_good_id": self.finished_good_id,
            "warehouse_id": self.warehouse_id,
            "current_quantity": float(self.current_quantity) if self.current_quantity else 0,
            "unit_of_measure": self.unit_of_measure,
            "last_receipt_date": self.last_receipt_date.isoformat() if self.last_receipt_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class FinishedGoodsReceipt(Base):
    """Header table for FGR (Finished Goods Receipt) documents."""
    __tablename__ = "finished_goods_receipts"

    id = Column(Integer, primary_key=True, index=True)
    fgr_number = Column(String(20), unique=True, nullable=False)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    receipt_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="draft")  # draft, submitted, inspected, completed, rejected
    received_by = Column(String(100), nullable=True)
    inspected_by = Column(String(100), nullable=True)
    inspection_date = Column(Date, nullable=True)
    inspection_notes = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    contractor = relationship("Contractor", backref="finished_goods_receipts")
    warehouse = relationship("Warehouse", backref="finished_goods_receipts")

    def __repr__(self):
        return f"<FinishedGoodsReceipt(id={self.id}, fgr_number='{self.fgr_number}', status='{self.status}')>"

    def to_dict(self):
        return {
            "id": self.id,
            "fgr_number": self.fgr_number,
            "contractor_id": self.contractor_id,
            "warehouse_id": self.warehouse_id,
            "receipt_date": self.receipt_date.isoformat() if self.receipt_date else None,
            "status": self.status,
            "received_by": self.received_by,
            "inspected_by": self.inspected_by,
            "inspection_date": self.inspection_date.isoformat() if self.inspection_date else None,
            "inspection_notes": self.inspection_notes,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class FinishedGoodsReceiptLine(Base):
    """Line items for each FGR."""
    __tablename__ = "finished_goods_receipt_lines"

    id = Column(Integer, primary_key=True, index=True)
    fgr_id = Column(Integer, ForeignKey("finished_goods_receipts.id"), nullable=False)
    finished_good_id = Column(Integer, ForeignKey("finished_goods.id"), nullable=False)
    quantity_delivered = Column(Numeric(15, 3), nullable=False)
    quantity_accepted = Column(Numeric(15, 3), nullable=True)
    quantity_rejected = Column(Numeric(15, 3), nullable=False, default=0)
    rejection_reason = Column(Text, nullable=True)
    unit_of_measure = Column(String(20), nullable=True)
    bom_deducted = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, server_default=func.now())

    fgr = relationship("FinishedGoodsReceipt", backref="lines")
    finished_good = relationship("FinishedGood", backref="receipt_lines")

    def __repr__(self):
        return f"<FinishedGoodsReceiptLine(id={self.id}, fgr_id={self.fgr_id}, fg_id={self.finished_good_id}, delivered={self.quantity_delivered})>"

    def to_dict(self):
        return {
            "id": self.id,
            "fgr_id": self.fgr_id,
            "finished_good_id": self.finished_good_id,
            "quantity_delivered": float(self.quantity_delivered) if self.quantity_delivered else 0,
            "quantity_accepted": float(self.quantity_accepted) if self.quantity_accepted else None,
            "quantity_rejected": float(self.quantity_rejected) if self.quantity_rejected else 0,
            "rejection_reason": self.rejection_reason,
            "unit_of_measure": self.unit_of_measure,
            "bom_deducted": self.bom_deducted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
