from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, Integer, String, func, Boolean, Date
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid


class AcademicYear(BaseOrg):
    __tablename__ = 'academic_years'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    title = Column(String(50), nullable=False, unique=True)
    is_active = Column(Boolean, default=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # # class relationship
    # class_ = relationship("Class", back_populates="academic_year")
    # subject relationship
    subjects = relationship("Subject", back_populates="academic_year")
    # # class-subject mapping relationship
    class_subject_mappings = relationship("ClassSubjectMap", back_populates="academic_year")
    # Holidays relationship
    holidays = relationship("Holiday", back_populates="academic_year")
    # Fee terms relationship
    fee_terms = relationship("FeeTerm", back_populates="academic_year")
    # Fee categories relationship
    fee_categories = relationship("FeeCategory", back_populates="academic_year")
    # Fee types relationship
    fee_types = relationship("FeeType", back_populates="academic_year")
    # Fee class mappings relationship
    fee_class_mappings = relationship("FeeClassMapping", back_populates="academic_year")
    # Fee student mappings relationship
    fee_student_mappings = relationship("FeeStudentMapping", back_populates="academic_year")

    def __repr__(self):
        return f"AcademicYear(id='{self.id}')"