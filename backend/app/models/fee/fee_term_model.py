from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, ForeignKey, Integer, String, func, Boolean, Date
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

class FeeTerm(BaseOrg):
    __tablename__ = 'fee_terms'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    term_name = Column(String(50), nullable=False)
    term_status = Column(String(20), nullable=False, default='active')
    number_of_terms = Column(Integer, nullable=False)
    academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id"), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    academic_year = relationship("AcademicYear", back_populates="fee_terms")
    fee_term_dates = relationship("FeeTermDates", back_populates="fee_term", cascade="all, delete-orphan")
    fee_types = relationship("FeeType", back_populates="fee_term", cascade="all, delete-orphan")
    fee_class_mapping_term_amounts = relationship("FeeClassMappingTermAmount", back_populates="fee_term")
    fee_student_map_term_amounts = relationship("FeeStudentMapTermAmount", back_populates="fee_term")
    
    def __repr__(self):
        return f"<FeeTerm(id={self.id}, term_name='{self.term_name}', number_of_terms={self.number_of_terms})>"