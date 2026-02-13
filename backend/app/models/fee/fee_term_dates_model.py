from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, ForeignKey, Integer, String, func, Boolean, Date
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

class FeeTermDates(BaseOrg):
    __tablename__ = 'fee_term_dates'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False, index=True)
    term_id = Column(UUID(as_uuid=True), ForeignKey('fee_terms.id', ondelete='CASCADE'), nullable=False, index=True)
    fee_term_date = Column(Date, nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    
    fee_term = relationship("FeeTerm", back_populates="fee_term_dates")
    fee_class_mapping_term_amounts = relationship("FeeClassMappingTermAmount", back_populates="fee_term_date", lazy="select")
    fee_student_map_term_amounts = relationship("FeeStudentMapTermAmount", back_populates="fee_term_date", lazy="select")
    fee_transaction_items = relationship("FeeTransactionItem", back_populates="fee_term_date", lazy="select")
    
    def __repr__(self):
        return f"<FeeTermDates(id={self.id}, term_id={self.term_id}, fee_term_date={self.fee_term_date})>"