from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, String, func, Boolean, ForeignKey, Numeric, Date, Integer, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid


class ExpenseTransaction(BaseOrg):
    __tablename__ = "expense_transactions"

    # Ensure unique idempotency key per tenant
    __table_args__ = (
        UniqueConstraint('idempotency_key', name='uq_expense_transaction_idempotency'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    expense_type_id = Column(UUID(as_uuid=True), ForeignKey("expense_types.id"), nullable=False, index=True)

    # Transaction Details
    amount = Column(Numeric(10, 2), nullable=False)
    transaction_date = Column(Date, nullable=False, index=True)
    description = Column(String(500), nullable=False)
    reference_number = Column(String(100), nullable=True)

    # Idempotency & Validation (Security)
    idempotency_key = Column(String(100), nullable=False, index=True)  # Prevent duplicates

    # Payment Details
    payment_method = Column(String(20), nullable=False)  # cash, cheque, bank_transfer, upi
    vendor_name = Column(String(200), nullable=True, index=True)

    # Status & Approval
    status = Column(String(20), default="pending", nullable=False, index=True)  # pending, approved, paid, cancelled
    requires_approval = Column(Boolean, default=False)  # Based on admin settings
    requires_approval_override = Column(Boolean, nullable=True)  # Per-transaction override
    approved_by_user_id = Column(UUID(as_uuid=True), nullable=True)
    approved_by_role = Column(String(50), nullable=True)
    approved_at = Column(TIMESTAMP, nullable=True)
    approval_comment = Column(String(500), nullable=True)  # Required for approvals

    # Department & Scoping (Security)
    department_id = Column(UUID(as_uuid=True), nullable=True, index=True)  # For department-level isolation

    # Concurrency Control (Security)
    version = Column(Integer, default=1, nullable=False)  # Optimistic locking

    # Audit (Security)
    created_by_user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    created_by_role = Column(String(50), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    expense_type = relationship("ExpenseType", back_populates="transactions")
    transaction_items = relationship("ExpenseTransactionItem", back_populates="transaction", cascade="all, delete-orphan")
    attachments = relationship("ExpenseAttachment", back_populates="transaction", cascade="all, delete-orphan")
    audit_logs = relationship("ExpenseAuditLog", back_populates="transaction", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ExpenseTransaction(id={self.id}, amount={self.amount}, status='{self.status}', created_by={self.created_by_user_id})>"