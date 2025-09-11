from sqlalchemy import TIMESTAMP, Column, Integer, String, func, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import BaseOrg
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Subject(BaseOrg):
    __tablename__ = 'subjects'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    name = Column(String(50), nullable=False, unique=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("subject_categories.id"), nullable=True)
    is_active = Column(Boolean, default=False)
    short_code = Column(String(10), nullable=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())   
    
    #Acedemic Year relationship
    academic_year_id = Column(UUID(as_uuid=True), ForeignKey('academic_years.id'), nullable=False)
    academic_year = relationship("AcademicYear", back_populates="subjects")
    category = relationship("SubjectCategory", back_populates="subjects")
    
    # class-subject mapping relationship
    class_subject_mappings = relationship("ClassSubjectMap", back_populates="subject")


    def __repr__(self):
        return f"<Subject(id={getattr(self, 'id', 'N/A')}, name='{getattr(self, 'name', 'N/A')}')>" 