import enum
import uuid

from sqlalchemy import (
    TIMESTAMP,
    Boolean,
    Column,
    Date,
    Enum,
    ForeignKey,
    Numeric,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class OldFeeSourceEnum(str, enum.Enum):
    auto_carryforward = "auto_carryforward"
    manual_entry = "manual_entry"


class FeeOld(BaseOrg):
    __tablename__ = "fee_old"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True)
    student_admission_num = Column(String(50), nullable=False)
    academic_year_label = Column(String(20), nullable=False)
    source_academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id"), nullable=True)
    fee_type_name = Column(String(100), nullable=False)
    fee_type_id = Column(UUID(as_uuid=True), ForeignKey("fee_types.id"), nullable=True)
    source = Column(
        Enum(OldFeeSourceEnum, name="oldfeesourceenum", create_type=False),
        nullable=False,
    )
    original_amount = Column(Numeric(10, 2), nullable=False)
    paid_amount = Column(Numeric(10, 2), nullable=False, default=0)
    paid_date = Column(Date, nullable=True)
    receipt_manual = Column(String(100), nullable=True)
    receipt_system = Column(String(100), nullable=True)
    is_settled = Column(Boolean, default=False, nullable=False)
    remarks = Column(String(500), nullable=True)
    current_academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id"), nullable=True)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    student = relationship("Student", foreign_keys=[student_id])
    source_academic_year = relationship("AcademicYear", foreign_keys=[source_academic_year_id])
    current_academic_year = relationship("AcademicYear", foreign_keys=[current_academic_year_id])

    def __repr__(self):
        return f"<FeeOld(id={self.id}, student_id={self.student_id}, year={self.academic_year_label}, amount={self.original_amount})>"
