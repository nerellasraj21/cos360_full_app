from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, ForeignKey, Integer, String, func, Boolean, Date, UniqueConstraint, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

class FeeClassMappingTermAmount(BaseOrg):
    __tablename__ = 'fee_class_map_term_amounts'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    fee_class_mapping_id = Column(UUID(as_uuid=True), ForeignKey("fee_class_mappings.id", ondelete="CASCADE"), nullable=False)
    term_id = Column(UUID(as_uuid=True), ForeignKey("fee_terms.id"), nullable=False)
    term_amount = Column(Numeric(10, 2), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Unique constraint: one term amount per fee class mapping per term
    __table_args__ = (
        UniqueConstraint('fee_class_mapping_id', 'term_id', name='uq_fee_class_mapping_term'),
    )
    
    # Relationships
    fee_class_mapping = relationship("FeeClassMapping", back_populates="term_amounts")
    fee_term = relationship("FeeTerm", back_populates="fee_class_mapping_term_amounts")
    
    def __repr__(self):
        return f"<FeeClassMappingTermAmount(id={self.id}, fee_class_mapping_id={self.fee_class_mapping_id}, term_id={self.term_id}, term_amount={self.term_amount})>"