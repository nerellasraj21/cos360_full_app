import enum
import uuid

from sqlalchemy import Boolean, Column, Date, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class AdmissionTypeEnum(enum.Enum):
    primary = "primary"
    non_primary = "non_primary"


class Admission(BaseOrg):
    __tablename__ = "student_admissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    admission_number = Column(String(50), nullable=True, unique=True)
    admission_type = Column(Enum(AdmissionTypeEnum, name="admissiontypeenum", create_type=False), nullable=True)

    admission_date = Column(Date, nullable=False)
    academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id"))
    admitted_academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id"))
    admitted_class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"))
    admitted_section_id = Column(UUID(as_uuid=True), ForeignKey("sections.id"))
    current_class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"))
    current_section_id = Column(UUID(as_uuid=True), ForeignKey("sections.id"))

    address_line1 = Column(String(255))
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100))
    state = Column(String(100))

    # Location master foreign keys (PUBLIC schema references)
    state_id = Column(UUID(as_uuid=True), nullable=True)
    district_id = Column(UUID(as_uuid=True), nullable=True)
    mandal_id = Column(UUID(as_uuid=True), nullable=True)

    is_previous_school = Column(Boolean, default=False)
    previous_school_name = Column(String(255), nullable=True)
    previous_class = Column(String(50), nullable=True)
    previous_school_remark = Column(String(100), nullable=True)

    student = relationship("Student", back_populates="admissions")

    # Note: Relationships to PUBLIC schema location tables not defined due to cross-schema complexity
    # Service layer should handle validation and lookup
