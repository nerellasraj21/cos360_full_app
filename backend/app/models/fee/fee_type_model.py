from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, ForeignKey, Integer, String, func, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

class FeeType(BaseOrg):
    __tablename__ = 'fee_types'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    type_name = Column(String(100), nullable=False)
    fee_category_id = Column(UUID(as_uuid=True), ForeignKey("fee_categories.id"), nullable=False)
    fee_status = Column(String(20), nullable=False, default='active')
    fee_term_id = Column(UUID(as_uuid=True), ForeignKey("fee_terms.id"), nullable=False)
    academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id"), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Unique constraint: type_name must be unique per fee_category
    __table_args__ = (
        UniqueConstraint('type_name', 'fee_category_id', name='uq_type_name_fee_category'),
    )
    
    # Relationships
    fee_category = relationship("FeeCategory", back_populates="fee_types")
    fee_term = relationship("FeeTerm", back_populates="fee_types")
    academic_year = relationship("AcademicYear", back_populates="fee_types")
    fee_class_mappings = relationship("FeeClassMapping", back_populates="fee_type")
    fee_student_mappings = relationship("FeeStudentMapping", back_populates="fee_type")
    
    def __repr__(self):
        return f"<FeeType(id={self.id}, type_name='{self.type_name}', fee_category_id={self.fee_category_id}, fee_status='{self.fee_status}')>"