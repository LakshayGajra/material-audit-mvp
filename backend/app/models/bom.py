from sqlalchemy import Column, Integer, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class BOM(Base):
    __tablename__ = "bom"

    id = Column(Integer, primary_key=True, index=True)
    finished_good_id = Column(Integer, ForeignKey("finished_goods.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    quantity_per_unit = Column(Float, nullable=False)

    finished_good = relationship("FinishedGood", backref="bom_items")
    material = relationship("Material", backref="bom_items")

    __table_args__ = (
        UniqueConstraint('finished_good_id', 'material_id', name='uq_bom_fg_material'),
    )
