from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, ForeignKey, Integer, String, func, Boolean, Date
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

class FeeTermDates(BaseOrg):
    __tablename__ = 'fee_term_dates'
    
    fee_term_date_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False, index=True)
    fee_term_id = Column(UUID(as_uuid=True), ForeignKey('fee_terms.id'), nullable=False, index=True)
    fee_term_date = Column(Date, nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    
    fee_term = relationship("FeeTerm", back_populates="fee_term_dates")
    
    def __repr__(self):
        return f"<FeeTermDates(fee_term_date_id={self.fee_term_date_id}, fee_term_id={self.fee_term_id}, fee_Term_date={self.fee_term_date})>"