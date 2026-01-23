from decimal import Decimal
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class WarehouseInventory(Base):
    __tablename__ = "warehouse_inventory"

    id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    current_quantity = Column(Numeric(15, 6), nullable=False, default=0)
    unit_of_measure = Column(String(20), nullable=False)
    reorder_point = Column(Numeric(15, 6), nullable=False, default=0)
    reorder_quantity = Column(Numeric(15, 6), nullable=False, default=0)
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    warehouse = relationship("Warehouse", backref="inventory_items")
    material = relationship("Material", backref="warehouse_inventory")

    __table_args__ = (
        UniqueConstraint('warehouse_id', 'material_id', name='uq_warehouse_material'),
    )

    def __repr__(self):
        return f"<WarehouseInventory(warehouse_id={self.warehouse_id}, material_id={self.material_id}, qty={self.current_quantity})>"

    def is_below_reorder_point(self) -> bool:
        current = Decimal(str(self.current_quantity)) if self.current_quantity else Decimal(0)
        reorder = Decimal(str(self.reorder_point)) if self.reorder_point else Decimal(0)
        return current < reorder

    def check_sufficient_stock(self, quantity) -> bool:
        current = Decimal(str(self.current_quantity)) if self.current_quantity else Decimal(0)
        required = Decimal(str(quantity))
        return current >= required

    def to_dict(self):
        return {
            "id": self.id,
            "warehouse_id": self.warehouse_id,
            "material_id": self.material_id,
            "current_quantity": float(self.current_quantity) if self.current_quantity else 0,
            "unit_of_measure": self.unit_of_measure,
            "reorder_point": float(self.reorder_point) if self.reorder_point else 0,
            "reorder_quantity": float(self.reorder_quantity) if self.reorder_quantity else 0,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
        }
