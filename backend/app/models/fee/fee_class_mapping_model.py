from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, ForeignKey, Integer, String, func, Boolean, Date, UniqueConstraint, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

class FeeClassMapping(BaseOrg):
    __tablename__ = 'fee_class_mappings'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"), nullable=False)
    fee_type_id = Column(UUID(as_uuid=True), ForeignKey("fee_types.id"), nullable=False)
    total_fee = Column(Numeric(10, 2), nullable=False)
    academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id"), nullable=False)
    all_by_default = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Unique constraint: one mapping per class, fee type, and academic year
    __table_args__ = (
        UniqueConstraint('class_id', 'fee_type_id', 'academic_year_id', name='uq_class_fee_type_academic_year'),
    )
    
    # Relationships
    class_ref = relationship("Class", back_populates="fee_class_mappings")
    fee_type = relationship("FeeType", back_populates="fee_class_mappings")
    academic_year = relationship("AcademicYear", back_populates="fee_class_mappings")
    term_amounts = relationship("FeeClassMappingTermAmount", back_populates="fee_class_mapping", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<FeeClassMapping(id={self.id}, class_id={self.class_id}, fee_type_id={self.fee_type_id}, total_fee={self.total_fee}, academic_year_id={self.academic_year_id})>"