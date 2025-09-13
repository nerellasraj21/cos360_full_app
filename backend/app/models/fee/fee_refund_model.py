from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, ForeignKey, String, func, Numeric, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

class FeeRefund(BaseOrg):
    """
    Fee refund model for handling refund requests and processing
    Implements approval workflow: pending → approved → processed
    """
    __tablename__ = 'fee_refunds'
    
    # Primary identification
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    refund_number = Column(String(50), nullable=False, unique=True, index=True)  # Auto-generated unique per tenant
    
    # Transaction linkage
    fee_transaction_id = Column(UUID(as_uuid=True), ForeignKey("fee_transactions.id"), nullable=False, index=True)
    
    # Student details (denormalized for business queries)
    student_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    student_admission_num = Column(String(50), nullable=False)
    academic_year_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Refund details
    refund_amount = Column(Numeric(10, 2), nullable=False)  # Amount to be refunded
    refund_reason = Column(String(20), nullable=False)  # fee_adjustment, student_withdrawal, excess_payment, other
    detailed_reason = Column(Text, nullable=True)  # Detailed explanation
    
    # Approval workflow
    status = Column(String(20), nullable=False, default='pending')  # pending, approved, rejected, processed
    
    # Workflow users
    requested_by_user_id = Column(UUID(as_uuid=True), nullable=False)  # Staff who requested refund
    approved_by_user_id = Column(UUID(as_uuid=True), nullable=True)  # Admin who approved/rejected
    processed_by_user_id = Column(UUID(as_uuid=True), nullable=True)  # Staff who processed refund
    
    # Processing details
    refund_method = Column(String(20), nullable=True)  # cash, bank_transfer, cheque
    refund_reference = Column(String(100), nullable=True)  # Bank reference or cheque number
    
    # Approval/rejection details
    approval_remarks = Column(Text, nullable=True)  # Admin's remarks
    processing_remarks = Column(Text, nullable=True)  # Processing staff's remarks
    
    # Important dates
    requested_date = Column(TIMESTAMP, nullable=False, server_default=func.now())
    approved_date = Column(TIMESTAMP, nullable=True)
    processed_date = Column(TIMESTAMP, nullable=True)
    
    # Audit fields
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    fee_transaction = relationship("FeeTransaction", back_populates="refunds")
    
    def __repr__(self):
        return f"<FeeRefund(id={self.id}, refund_number={self.refund_number}, fee_transaction_id={self.fee_transaction_id}, amount={self.refund_amount}, status={self.status})>"