from sqlalchemy import Column, Integer, String, Text, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class StockTransfer(Base):
    """Stock transfer between warehouses."""
    __tablename__ = "stock_transfers"

    id = Column(Integer, primary_key=True, index=True)
    transfer_number = Column(String(20), unique=True, nullable=False)
    source_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    destination_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    transfer_type = Column(String(20), nullable=False)  # 'material' or 'finished_good'
    status = Column(String(20), nullable=False, default="draft")  # draft, submitted, completed, cancelled
    transfer_date = Column(Date, nullable=False)
    requested_by = Column(String(100), nullable=True)
    approved_by = Column(String(100), nullable=True)
    completed_by = Column(String(100), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    source_warehouse = relationship("Warehouse", foreign_keys=[source_warehouse_id], backref="outgoing_transfers")
    destination_warehouse = relationship("Warehouse", foreign_keys=[destination_warehouse_id], backref="incoming_transfers")
    lines = relationship("StockTransferLine", back_populates="transfer", cascade="all, delete-orphan")

    @staticmethod
    def generate_transfer_number(db) -> str:
        """Generate next transfer number in format ST-YYYY-NNNN."""
        from datetime import datetime
        year = datetime.now().year
        prefix = f"ST-{year}-"

        # Find the highest number for this year
        last = db.query(StockTransfer).filter(
            StockTransfer.transfer_number.like(f"{prefix}%")
        ).order_by(StockTransfer.transfer_number.desc()).first()

        if last:
            try:
                last_num = int(last.transfer_number.replace(prefix, ""))
                next_num = last_num + 1
            except ValueError:
                next_num = 1
        else:
            next_num = 1

        return f"{prefix}{next_num:04d}"

    def __repr__(self):
        return f"<StockTransfer(id={self.id}, number='{self.transfer_number}', status='{self.status}')>"

    def to_dict(self):
        return {
            "id": self.id,
            "transfer_number": self.transfer_number,
            "source_warehouse_id": self.source_warehouse_id,
            "destination_warehouse_id": self.destination_warehouse_id,
            "transfer_type": self.transfer_type,
            "status": self.status,
            "transfer_date": self.transfer_date.isoformat() if self.transfer_date else None,
            "requested_by": self.requested_by,
            "approved_by": self.approved_by,
            "completed_by": self.completed_by,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class StockTransferLine(Base):
    """Line items for stock transfers."""
    __tablename__ = "stock_transfer_lines"

    id = Column(Integer, primary_key=True, index=True)
    transfer_id = Column(Integer, ForeignKey("stock_transfers.id", ondelete="CASCADE"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=True)
    finished_good_id = Column(Integer, ForeignKey("finished_goods.id"), nullable=True)
    quantity = Column(Numeric(15, 3), nullable=False)
    unit_of_measure = Column(String(20), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    transfer = relationship("StockTransfer", back_populates="lines")
    material = relationship("Material", backref="transfer_lines")
    finished_good = relationship("FinishedGood", backref="transfer_lines")

    def __repr__(self):
        item_id = self.material_id or self.finished_good_id
        return f"<StockTransferLine(id={self.id}, transfer_id={self.transfer_id}, item_id={item_id}, qty={self.quantity})>"

    def to_dict(self):
        return {
            "id": self.id,
            "transfer_id": self.transfer_id,
            "material_id": self.material_id,
            "finished_good_id": self.finished_good_id,
            "quantity": float(self.quantity) if self.quantity else 0,
            "unit_of_measure": self.unit_of_measure,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
