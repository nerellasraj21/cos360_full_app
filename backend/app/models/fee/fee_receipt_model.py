import uuid

from sqlalchemy import TIMESTAMP, Boolean, Column, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class FeeReceipt(BaseOrg):
    """
    Fee receipt model for PDF receipt generation and tracking
    Implements tamper-proof receipt system with hash protection
    """

    __tablename__ = "fee_receipts"

    # Primary identification
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    receipt_number = Column(String(50), nullable=False, unique=True, index=True)  # Sequential per tenant

    # Transaction linkage
    fee_transaction_id = Column(UUID(as_uuid=True), ForeignKey("fee_transactions.id"), nullable=False, index=True)

    # Receipt content
    student_name = Column(String(200), nullable=False)  # Denormalized for receipt printing
    student_admission_num = Column(String(50), nullable=False)  # Denormalized for receipt printing
    class_section = Column(String(100), nullable=False)  # Denormalized for receipt printing
    academic_year = Column(String(50), nullable=False)  # Denormalized for receipt printing

    # Security and integrity
    content_hash = Column(String(64), nullable=False)  # SHA-256 hash of receipt content
    pdf_file_path = Column(String(500), nullable=True)  # Path to stored PDF file

    # Status tracking
    is_reprinted = Column(Boolean, default=False, nullable=False)
    reprint_count = Column("reprint_count", String, server_default="0", nullable=False)  # Track reprints

    # Operational fields
    generated_by_user_id = Column(UUID(as_uuid=True), nullable=False)  # Staff who generated receipt
    remarks = Column(Text, nullable=True)  # Additional notes

    # Audit fields
    generated_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    fee_transaction = relationship("FeeTransaction", back_populates="receipts")

    def __repr__(self):
        return f"<FeeReceipt(id={self.id}, receipt_number={self.receipt_number}, fee_transaction_id={self.fee_transaction_id}, student_name={self.student_name})>"
