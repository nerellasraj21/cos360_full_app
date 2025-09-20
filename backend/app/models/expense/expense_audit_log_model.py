from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, String, func, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid


class ExpenseAuditLog(BaseOrg):
    __tablename__ = "expense_audit_logs"

    # Primary Key - Immutable once created
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    org_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Reference to the transaction being audited
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("expense_transactions.id"), nullable=False, index=True)

    # Action Details
    action = Column(String(50), nullable=False, index=True)  # create, update, approve, reject, pay, cancel
    action_category = Column(String(30), nullable=False, index=True)  # transaction, approval, payment, document

    # Change Tracking
    field_name = Column(String(100), nullable=True)  # Specific field that was changed (for updates)
    old_value = Column(Text, nullable=True)  # Previous value (JSON string for complex objects)
    new_value = Column(Text, nullable=True)  # New value (JSON string for complex objects)

    # Complete state snapshots for critical actions
    full_record_before = Column(JSON, nullable=True)  # Complete record state before change
    full_record_after = Column(JSON, nullable=True)   # Complete record state after change

    # Action Context
    action_reason = Column(String(500), nullable=True)  # Why the action was taken
    action_notes = Column(Text, nullable=True)  # Additional notes about the action

    # Request Details (Security)
    request_ip_address = Column(String(45), nullable=True)  # IPv4/IPv6 support
    request_user_agent = Column(String(500), nullable=True)
    request_session_id = Column(String(100), nullable=True)

    # System Context
    api_endpoint = Column(String(200), nullable=True)  # Which API endpoint was called
    http_method = Column(String(10), nullable=True)   # GET, POST, PUT, DELETE
    request_id = Column(String(100), nullable=True)   # Correlation ID for tracking

    # Compliance & Workflow
    workflow_stage = Column(String(50), nullable=True)  # pending, approval, payment, completion
    compliance_flags = Column(JSON, nullable=True)      # Any compliance-related flags

    # Department & Scoping (Security)
    department_id = Column(UUID(as_uuid=True), nullable=True, index=True)  # For department-level audit isolation

    # Audit Actor (Security) - IMMUTABLE
    actor_user_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # Who performed the action
    actor_role = Column(String(50), nullable=False, index=True)             # What role they had
    actor_username = Column(String(100), nullable=False)                    # Username at time of action

    # Timing (Security) - IMMUTABLE
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), index=True)

    # IMPORTANT: No updated_at field - audit logs are immutable

    # Relationships
    transaction = relationship("ExpenseTransaction", back_populates="audit_logs")

    def __repr__(self):
        return f"<ExpenseAuditLog(id={self.id}, action='{self.action}', actor={self.actor_username}, created_at={self.created_at})>"