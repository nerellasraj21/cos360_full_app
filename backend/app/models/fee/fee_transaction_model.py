from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, String, func, Boolean, Numeric, Text, Index, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

class FeeTransaction(BaseOrg):
    """
    Core fee transaction model for recording all payment activities
    Supports cash, UPI, cheque, bank transfer payments with proper state management
    """
    __tablename__ = 'fee_transactions'
    
    # Primary identification
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    transaction_number = Column(String(50), nullable=False, unique=True, index=True)  # Auto-generated unique per tenant
    
    # Student linkage
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True)  # Links to students table
    student_admission_num = Column(String(50), nullable=False, index=True)  # For business validation
    academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id"), nullable=False, index=True)
    
    # Transaction core details
    total_amount = Column(Numeric(10, 2), nullable=False)  # Total transaction amount
    payment_method = Column(String(20), nullable=False)  # cash, upi, cheque, bank_transfer
    status = Column(String(20), nullable=False, default='pending')  # pending, completed, cancelled, bounced
    
    # Payment method specific fields
    upi_reference = Column(String(100), nullable=True)  # UPI transaction reference
    upi_app_name = Column(String(50), nullable=True)  # GPay, PhonePe, Paytm, etc.
    
    cheque_number = Column(String(50), nullable=True)  # Cheque number
    cheque_date = Column(TIMESTAMP, nullable=True)  # Cheque date
    cheque_bank = Column(String(100), nullable=True)  # Bank name
    cheque_status = Column(String(20), nullable=True)  # pending, cleared, bounced
    
    bank_reference = Column(String(100), nullable=True)  # Bank transfer reference
    bank_name = Column(String(100), nullable=True)  # Bank name for transfers
    
    # Business workflow
    collected_by_user_id = Column(UUID(as_uuid=True), nullable=False)  # Staff who collected payment
    approved_by_user_id = Column(UUID(as_uuid=True), nullable=True)  # For approval workflows
    
    # Receipt management
    receipt_generated = Column(Boolean, default=False, nullable=False)
    receipt_hash = Column(String(64), nullable=True)  # SHA-256 hash for tamper protection
    
    # Operational fields
    remarks = Column(Text, nullable=True)  # Additional notes
    transaction_date = Column(TIMESTAMP, nullable=False, server_default=func.now())
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    transaction_items = relationship("FeeTransactionItem", back_populates="fee_transaction", cascade="all, delete-orphan")
    receipts = relationship("FeeReceipt", back_populates="fee_transaction", cascade="all, delete-orphan")
    refunds = relationship("FeeRefund", back_populates="fee_transaction")
    student = relationship("Student", foreign_keys=[student_id])
    academic_year = relationship("AcademicYear", foreign_keys=[academic_year_id])
    fee_receipts = relationship("FeeReceipt", back_populates="fee_transaction", foreign_keys="[FeeReceipt.fee_transaction_id]", overlaps="receipts")
    
    # Database indexes for performance
    __table_args__ = (
        Index('idx_fee_trans_student_date', 'student_id', 'transaction_date'),
        Index('idx_fee_trans_status_method', 'status', 'payment_method'),
        Index('idx_fee_trans_academic_year', 'academic_year_id', 'transaction_date'),
    )
    
    def __repr__(self):
        return f"<FeeTransaction(id={self.id}, transaction_number={self.transaction_number}, student_id={self.student_id}, amount={self.total_amount}, status={self.status})>"