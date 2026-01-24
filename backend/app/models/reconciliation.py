from datetime import date
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship, Session
from sqlalchemy.sql import func
from app.database import Base


class Reconciliation(Base):
    """
    Periodic contractor inventory reporting and reconciliation.

    Unlike blind audits (where auditor can't see expected values),
    reconciliation shows variances immediately after submission.

    Workflow:
    1. SUBMITTED: Contractor reports inventory counts
    2. REVIEWED: Manager reviews variances
    3. ACCEPTED: Inventory adjusted if needed
    4. DISPUTED: Under investigation
    """
    __tablename__ = "reconciliations"

    # Period types
    PERIOD_WEEKLY = "WEEKLY"
    PERIOD_MONTHLY = "MONTHLY"
    PERIOD_AD_HOC = "AD_HOC"

    ALLOWED_PERIODS = [PERIOD_WEEKLY, PERIOD_MONTHLY, PERIOD_AD_HOC]

    # Status values
    STATUS_SUBMITTED = "SUBMITTED"
    STATUS_REVIEWED = "REVIEWED"
    STATUS_ACCEPTED = "ACCEPTED"
    STATUS_DISPUTED = "DISPUTED"

    ALLOWED_STATUSES = [STATUS_SUBMITTED, STATUS_REVIEWED, STATUS_ACCEPTED, STATUS_DISPUTED]

    id = Column(Integer, primary_key=True, index=True)
    reconciliation_number = Column(String(50), unique=True, nullable=False)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=False)
    reconciliation_date = Column(Date, nullable=False)
    period_type = Column(String(20), nullable=False, default=PERIOD_MONTHLY)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    reported_by = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False, default=STATUS_SUBMITTED)
    reviewed_by = Column(String(100), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    contractor = relationship("Contractor", backref="reconciliations")

    # Indexes
    __table_args__ = (
        Index("ix_reconciliations_contractor_date", "contractor_id", "reconciliation_date"),
        Index("ix_reconciliations_status", "status"),
        Index("ix_reconciliations_period", "period_start", "period_end"),
    )

    def __repr__(self):
        return (f"<Reconciliation(id={self.id}, number='{self.reconciliation_number}', "
                f"status='{self.status}')>")

    def to_dict(self):
        return {
            "id": self.id,
            "reconciliation_number": self.reconciliation_number,
            "contractor_id": self.contractor_id,
            "reconciliation_date": self.reconciliation_date.isoformat() if self.reconciliation_date else None,
            "period_type": self.period_type,
            "period_start": self.period_start.isoformat() if self.period_start else None,
            "period_end": self.period_end.isoformat() if self.period_end else None,
            "reported_by": self.reported_by,
            "status": self.status,
            "reviewed_by": self.reviewed_by,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @staticmethod
    def generate_reconciliation_number(db: Session) -> str:
        """
        Generate a unique reconciliation number in format REC-YYYY-XXXX.

        Example: REC-2026-0001, REC-2026-0002, etc.
        """
        current_year = date.today().year
        prefix = f"REC-{current_year}-"

        # Find the highest existing number for this year
        latest = db.query(Reconciliation).filter(
            Reconciliation.reconciliation_number.like(f"{prefix}%")
        ).order_by(Reconciliation.reconciliation_number.desc()).first()

        if latest:
            try:
                last_num = int(latest.reconciliation_number.split("-")[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1

        return f"{prefix}{next_num:04d}"
