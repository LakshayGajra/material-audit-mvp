from datetime import date
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship, Session
from sqlalchemy.sql import func
from app.database import Base


class Audit(Base):
    """
    Blind audit record for contractor inventory verification.

    IMPORTANT: The auditor sees minimal information - no expected values!
    Expected quantities are only calculated AFTER the audit is submitted.

    Workflow:
    1. IN_PROGRESS: Auditor conducting physical count
    2. SUBMITTED: Auditor finished, system calculates variances
    3. ANALYZED: Anomalies reviewed by management
    4. CLOSED: Audit completed and archived
    """
    __tablename__ = "audits"

    # Audit types
    TYPE_SCHEDULED = "SCHEDULED"
    TYPE_SURPRISE = "SURPRISE"
    TYPE_FOLLOW_UP = "FOLLOW_UP"

    ALLOWED_TYPES = [TYPE_SCHEDULED, TYPE_SURPRISE, TYPE_FOLLOW_UP]

    # Status values
    STATUS_IN_PROGRESS = "IN_PROGRESS"
    STATUS_SUBMITTED = "SUBMITTED"
    STATUS_ANALYZED = "ANALYZED"
    STATUS_CLOSED = "CLOSED"

    ALLOWED_STATUSES = [STATUS_IN_PROGRESS, STATUS_SUBMITTED, STATUS_ANALYZED, STATUS_CLOSED]

    id = Column(Integer, primary_key=True, index=True)
    audit_number = Column(String(50), unique=True, nullable=False)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=False)
    audit_date = Column(Date, nullable=False)
    auditor_name = Column(String(100), nullable=False)
    audit_type = Column(String(20), nullable=False, default=TYPE_SCHEDULED)
    status = Column(String(20), nullable=False, default=STATUS_IN_PROGRESS)
    submitted_at = Column(DateTime, nullable=True)
    analyzed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    contractor = relationship("Contractor", backref="audits")

    # Indexes
    __table_args__ = (
        Index("ix_audits_contractor_date", "contractor_id", "audit_date"),
        Index("ix_audits_status", "status"),
        Index("ix_audits_contractor_status_date", "contractor_id", "status", "audit_date"),
    )

    def __repr__(self):
        return f"<Audit(id={self.id}, audit_number='{self.audit_number}', status='{self.status}')>"

    def to_dict(self):
        return {
            "id": self.id,
            "audit_number": self.audit_number,
            "contractor_id": self.contractor_id,
            "audit_date": self.audit_date.isoformat() if self.audit_date else None,
            "auditor_name": self.auditor_name,
            "audit_type": self.audit_type,
            "status": self.status,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
            "analyzed_at": self.analyzed_at.isoformat() if self.analyzed_at else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @staticmethod
    def generate_audit_number(db: Session) -> str:
        """
        Generate a unique audit number in format AUD-YYYY-XXXX.

        Example: AUD-2026-0001, AUD-2026-0002, etc.
        """
        current_year = date.today().year
        prefix = f"AUD-{current_year}-"

        # Find the highest existing number for this year
        latest = db.query(Audit).filter(
            Audit.audit_number.like(f"{prefix}%")
        ).order_by(Audit.audit_number.desc()).first()

        if latest:
            try:
                last_num = int(latest.audit_number.split("-")[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1

        return f"{prefix}{next_num:04d}"
