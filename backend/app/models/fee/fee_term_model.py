from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, ForeignKey, Integer, String, func, Boolean, Date
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

class FeeTerm(BaseOrg):
    __tablename__ = 'fee_terms'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    name = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True)
    number_of_terms = Column(Integer, nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"))
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    
    fee_term_dates = relationship("FeeTermDates", back_populates="fee_term")
    
    def __repr__(self):
        return f"<FeeTerm(id={self.id}, name='{self.name}', number_of_terms={self.number_of_terms})>"