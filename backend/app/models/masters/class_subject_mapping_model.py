from sqlalchemy import Column, Integer, ForeignKey, Boolean, TIMESTAMP, func
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg
from sqlalchemy.dialects.postgresql import UUID
import uuid

class ClassSubjectMap(BaseOrg):
    __tablename__ = 'class_subject_mappings'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    class_id = Column(UUID(as_uuid=True), ForeignKey('classes.id'), nullable=False)
    section_id = Column(UUID(as_uuid=True), ForeignKey('sections.id'), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey('subjects.id'), nullable=False)
    exclude_marks = Column(Boolean, default=False, nullable=False)
    order = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    # Academic Year relationship
    academic_year_id = Column(UUID(as_uuid=True), ForeignKey('academic_years.id'), nullable=False)
    academic_year = relationship("AcademicYear", back_populates="class_subject_mappings")

    # Relationships
    class_ = relationship("Class", back_populates="class_subject_mappings")
    section = relationship("Section", back_populates="class_subject_mappings")
    subject = relationship("Subject", back_populates="class_subject_mappings")

    def __repr__(self):
        return f"<ClassSubjectMap(id={self.id}, class_id={self.class_id}, section_id={self.section_id}, subject_id={self.subject_id})>"    