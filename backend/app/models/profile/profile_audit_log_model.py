from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, String, func, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
import uuid


class ProfileAuditLog(BaseOrg):
    __tablename__ = "profile_audit_logs"

    # Primary Key - Immutable once created
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)
    org_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Reference to the user whose profile was changed
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    profile_type = Column(String(50), nullable=False, index=True)  # student, staff, parent

    # Action Details
    action = Column(String(50), nullable=False, index=True)  # view, update, password_change
    action_category = Column(String(30), nullable=False, index=True)  # profile, security, settings

    # Change Tracking
    field_name = Column(String(100), nullable=True)  # Specific field that was changed (for updates)
    old_value = Column(Text, nullable=True)  # Previous value
    new_value = Column(Text, nullable=True)  # New value

    # Complete state snapshots for critical actions (like password changes)
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

    # Security flags
    is_sensitive_change = Column(String(10), nullable=True)  # TRUE for password changes, email changes
    requires_verification = Column(String(10), nullable=True)  # TRUE if change needs verification

    # Audit Actor (Security) - IMMUTABLE
    actor_user_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # Who performed the action
    actor_role = Column(String(50), nullable=False, index=True)             # What role they had
    actor_username = Column(String(100), nullable=False)                    # Username at time of action

    # Timing (Security) - IMMUTABLE
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), index=True)

    # IMPORTANT: No updated_at field - audit logs are immutable

    def __repr__(self):
        return f"<ProfileAuditLog(id={self.id}, action='{self.action}', profile_type='{self.profile_type}', actor={self.actor_username}, created_at={self.created_at})>"
