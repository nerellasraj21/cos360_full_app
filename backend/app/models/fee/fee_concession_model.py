import enum
import uuid

from sqlalchemy import (
    TIMESTAMP,
    Boolean,
    Column,
    Enum,
    ForeignKey,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class ConcessionApproverEnum(str, enum.Enum):
    owner = "owner"
    principal = "principal"
    management = "management"
    correspondent = "correspondent"


class FeeConcession(BaseOrg):
    __tablename__ = "fee_concessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True)
    student_admission_num = Column(String(50), nullable=False)
    fee_type_id = Column(UUID(as_uuid=True), ForeignKey("fee_types.id"), nullable=False, index=True)
    fee_student_map_id = Column(UUID(as_uuid=True), ForeignKey("fee_student_mappings.id"), nullable=False)
    academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id"), nullable=False, index=True)
    assigned_fee = Column(Numeric(10, 2), nullable=False)
    concession_amount = Column(Numeric(10, 2), nullable=False)
    reason = Column(String(500), nullable=False)
    approved_by = Column(
        Enum(ConcessionApproverEnum, name="concessionapproverenum", create_type=False),
        nullable=False,
    )
    approved_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    recorded_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("student_id", "fee_type_id", "academic_year_id", name="uq_concession_student_fee_year"),
    )

    # Relationships
    student = relationship("Student", foreign_keys=[student_id])
    fee_type = relationship("FeeType", foreign_keys=[fee_type_id])
    fee_student_mapping = relationship("FeeStudentMapping", foreign_keys=[fee_student_map_id])
    academic_year = relationship("AcademicYear", foreign_keys=[academic_year_id])

    def __repr__(self):
        return f"<FeeConcession(id={self.id}, student_id={self.student_id}, fee_type_id={self.fee_type_id}, amount={self.concession_amount})>"
