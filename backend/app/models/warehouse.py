from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    contact_person = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)

    # New fields for contractor linking
    owner_type = Column(String(20), nullable=False, default='company')  # 'company' | 'contractor'
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=True)
    can_hold_materials = Column(Boolean, nullable=False, default=True)
    can_hold_finished_goods = Column(Boolean, nullable=False, default=True)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationship to contractor (if contractor-owned)
    contractor = relationship("Contractor", foreign_keys=[contractor_id], backref="warehouses")

    __table_args__ = (
        Index('ix_warehouses_code', 'code'),
        Index('ix_warehouses_contractor_id', 'contractor_id'),
        Index('ix_warehouses_owner_type', 'owner_type'),
    )

    def __repr__(self):
        return f"<Warehouse(id={self.id}, code='{self.code}', name='{self.name}', owner_type='{self.owner_type}')>"

    @property
    def is_contractor_warehouse(self):
        return self.owner_type == 'contractor'

    @property
    def is_company_warehouse(self):
        return self.owner_type == 'company'

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "location": self.location,
            "address": self.address,
            "contact_person": self.contact_person,
            "phone": self.phone,
            "owner_type": self.owner_type,
            "contractor_id": self.contractor_id,
            "contractor_name": self.contractor.name if self.contractor else None,
            "contractor_code": self.contractor.code if self.contractor else None,
            "can_hold_materials": self.can_hold_materials,
            "can_hold_finished_goods": self.can_hold_finished_goods,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
