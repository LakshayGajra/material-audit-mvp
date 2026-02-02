from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class Contractor(Base):
    __tablename__ = "contractors"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(20))
    is_active = Column(Boolean, default=True, nullable=False)

    # Default warehouse for this contractor (for quick lookup)
    default_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)

    # Note: 'warehouses' relationship is defined via backref in Warehouse model

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "phone": self.phone,
            "is_active": self.is_active,
            "default_warehouse_id": self.default_warehouse_id,
        }
