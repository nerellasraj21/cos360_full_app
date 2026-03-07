import uuid

from sqlalchemy import TIMESTAMP, BigInteger, Boolean, Column, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import BaseOrg


class ExpenseAttachment(BaseOrg):
    __tablename__ = "expense_attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    org_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("expense_transactions.id"), nullable=False, index=True)

    # File Details
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False, unique=True)  # UUID-based filename
    file_path = Column(String(500), nullable=False)  # Full path to stored file
    file_size = Column(BigInteger, nullable=False)  # File size in bytes
    mime_type = Column(String(100), nullable=False)
    file_extension = Column(String(10), nullable=False)

    # Security & Integrity (Security)
    file_hash_sha256 = Column(String(64), nullable=False, index=True)  # File integrity verification
    virus_scan_status = Column(String(20), default="pending", nullable=False)  # pending, clean, infected, error
    virus_scan_result = Column(Text, nullable=True)  # Detailed scan results
    virus_scanned_at = Column(TIMESTAMP, nullable=True)

    # Access Control (Security)
    is_public = Column(Boolean, default=False)  # Whether file can be publicly accessed
    is_encrypted = Column(Boolean, default=False)  # Whether file is encrypted at rest
    encryption_key_id = Column(String(100), nullable=True)  # Reference to encryption key

    # Validation & Classification
    document_type = Column(String(50), nullable=False)  # invoice, receipt, bill, contract, etc.
    is_verified = Column(Boolean, default=False)  # Whether document has been verified
    verified_by_user_id = Column(UUID(as_uuid=True), nullable=True)
    verified_at = Column(TIMESTAMP, nullable=True)
    verification_notes = Column(Text, nullable=True)

    # Compliance & Retention
    retention_period_months = Column(Integer, default=84, nullable=False)  # 7 years default
    is_archived = Column(Boolean, default=False)
    archived_at = Column(TIMESTAMP, nullable=True)
    can_be_deleted = Column(Boolean, default=True)

    # Department & Scoping (Security)
    department_id = Column(UUID(as_uuid=True), nullable=True, index=True)  # For department-level isolation

    # Audit (Security)
    uploaded_by_user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    uploaded_by_role = Column(String(50), nullable=False)
    uploaded_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    last_accessed_at = Column(TIMESTAMP, nullable=True)
    access_count = Column(Integer, default=0, nullable=False)
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    transaction = relationship("ExpenseTransaction", back_populates="attachments")

    def __repr__(self):
        return f"<ExpenseAttachment(id={self.id}, filename='{self.original_filename}', type='{self.document_type}', size={self.file_size})>"
