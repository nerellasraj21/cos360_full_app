from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, ForeignKey, Integer, String, func, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

class FeeStudentMapTermAmount(BaseOrg):
    __tablename__ = 'fee_student_map_term_amounts'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    fee_student_map_id = Column(UUID(as_uuid=True), ForeignKey("fee_student_mappings.id"), nullable=False)
    term_amount = Column(Numeric(10, 2), nullable=False)
    term_id = Column(UUID(as_uuid=True), ForeignKey("fee_terms.id"), nullable=False)
    term_date_id = Column(UUID(as_uuid=True), ForeignKey("fee_term_dates.id"), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    fee_student_mapping = relationship("FeeStudentMapping", back_populates="term_amounts")
    fee_term = relationship("FeeTerm", back_populates="fee_student_map_term_amounts")
    fee_term_date = relationship("FeeTermDates", back_populates="fee_student_map_term_amounts")
    
    def __repr__(self):
        return f"<FeeStudentMapTermAmount(id={self.id}, fee_student_map_id={self.fee_student_map_id}, term_amount={self.term_amount}, term_id={self.term_id})>"