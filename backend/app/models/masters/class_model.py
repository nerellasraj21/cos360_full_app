from sqlalchemy import TIMESTAMP, Column, Integer, String, func, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Class(BaseOrg):
    __tablename__ = 'classes'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    name = Column(String(50), nullable=False, unique=True)
    description = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=False)
    short_code = Column(String(10), nullable=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    # Sections relationship
    sections = relationship("Section", back_populates="class_", lazy='selectin', cascade="all, delete-orphan")
    # Academic Year relationship
    academic_year_id = Column(UUID(as_uuid=True), ForeignKey('academic_years.id'), nullable=False, index=True)
    academic_year = relationship("AcademicYear", backref="classes")
    # Class-Subject Mapping relationship
    class_subject_mappings = relationship("ClassSubjectMap", back_populates="class_")
    # Fee Class Mapping relationship
    fee_class_mappings = relationship("FeeClassMapping", back_populates="class_ref")
    # Fee Student Mapping relationship
    fee_student_mappings = relationship("FeeStudentMapping", back_populates="class_ref")
    
    def __repr__(self):
        return f"<Class(id={self.id}, name='{self.name}')>"
