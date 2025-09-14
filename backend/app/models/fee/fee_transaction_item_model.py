from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, ForeignKey, String, func, Numeric, Index
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

class FeeTransactionItem(BaseOrg):
    """
    Individual fee items within a transaction
    Supports multiple fee types in single transaction (e.g., Tuition + Lab + Sports)
    """
    __tablename__ = 'fee_transaction_items'
    
    # Primary identification
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    
    # Transaction linkage
    fee_transaction_id = Column(UUID(as_uuid=True), ForeignKey("fee_transactions.id"), nullable=False, index=True)
    
    # Fee structure linkage
    fee_type_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # Links to fee_types
    fee_term_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # Links to fee_terms
    
    # Amount details
    amount_due = Column(Numeric(10, 2), nullable=False)  # Original amount due for this fee type/term
    amount_paid = Column(Numeric(10, 2), nullable=False)  # Amount paid in this transaction
    
    # Business validation
    description = Column(String(200), nullable=True)  # Human-readable description
    
    # Audit fields
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    fee_transaction = relationship("FeeTransaction", back_populates="transaction_items")
    
    # Database indexes
    __table_args__ = (
        Index('idx_fee_trans_item_fee_type', 'fee_type_id', 'fee_term_id'),
        Index('idx_fee_trans_item_transaction', 'fee_transaction_id'),
    )
    
    def __repr__(self):
        return f"<FeeTransactionItem(id={self.id}, fee_transaction_id={self.fee_transaction_id}, fee_type_id={self.fee_type_id}, amount_paid={self.amount_paid})>"