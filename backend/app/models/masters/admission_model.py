from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import BaseOrg
import uuid

class Admission(BaseOrg):
    __tablename__ = "student_admissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    admission_number = Column(String(50), nullable=True, unique=True)

    admission_date = Column(Date, nullable=False)
    academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id"))
    admitted_academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id")) # Add this in migrations.
    admitted_class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"))
    admitted_section_id = Column(UUID(as_uuid=True), ForeignKey("sections.id"))
    current_class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"))
    current_section_id = Column(UUID(as_uuid=True), ForeignKey("sections.id"))

    address_line1 = Column(String(255))
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100))
    state = Column(String(100))
    is_previous_school = Column(Boolean, default=False)
    previous_school_name = Column(String(255), nullable=True)
    previous_class = Column(String(50), nullable=True)
    previous_school_remark = Column(String(100), nullable=True)

    student = relationship("Student", back_populates="admissions")