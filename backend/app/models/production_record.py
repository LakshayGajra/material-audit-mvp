from sqlalchemy import Column, Integer, Float, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ProductionRecord(Base):
    __tablename__ = "production_records"

    id = Column(Integer, primary_key=True, index=True)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=False)
    finished_good_id = Column(Integer, ForeignKey("finished_goods.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    production_date = Column(Date, server_default=func.current_date())

    contractor = relationship("Contractor", backref="production_records")
    finished_good = relationship("FinishedGood", backref="production_records")
