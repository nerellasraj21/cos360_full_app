from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, String, Boolean, Numeric, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
import uuid


class HallTicketEligibility(BaseOrg):
    __tablename__ = 'hall_ticket_eligibility'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
                unique=True, nullable=False, index=True)
    exam_id = Column(UUID(as_uuid=True), ForeignKey('exams.id', ondelete='CASCADE'),
                     nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    class_id = Column(UUID(as_uuid=True), nullable=False)
    section_id = Column(UUID(as_uuid=True), nullable=True)
    attendance_percent = Column(Numeric(5, 2), nullable=True)
    attendance_ok = Column(Boolean, nullable=False, default=False)
    fee_paid = Column(Boolean, nullable=False, default=False)
    attendance_override = Column(Boolean, nullable=False, default=False)
    fee_override = Column(Boolean, nullable=False, default=False)
    ineligibility_reason = Column(String(20), nullable=True)   # FEE_PENDING / LOW_ATTENDANCE / BOTH
    is_eligible = Column(Boolean, nullable=False, default=False)
    hall_ticket_number = Column(String(30), nullable=True)
    computed_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(),
                        onupdate=func.now())

    def __repr__(self):
        return (f"<HallTicketEligibility(student={self.student_id}, "
                f"exam={self.exam_id}, eligible={self.is_eligible})>")
