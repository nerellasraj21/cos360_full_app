from app.db.base import BaseOrg
from sqlalchemy import TIMESTAMP, Column, String, func, Boolean, Numeric, Integer, Text, JSON, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
import uuid


class ExpenseSettings(BaseOrg):
    __tablename__ = "expense_settings"

    # Ensure one setting per tenant per setting key
    __table_args__ = (
        UniqueConstraint('setting_key', name='uq_expense_setting_key'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False, index=True)

    # Setting Identification
    setting_key = Column(String(100), nullable=False, index=True)  # auto_approval_limit, require_receipts, etc.
    setting_name = Column(String(200), nullable=False)            # Human-readable name
    setting_description = Column(Text, nullable=True)             # Description of what this setting controls
    setting_category = Column(String(50), nullable=False, index=True)  # approval, workflow, security, compliance

    # Setting Values (flexible storage)
    string_value = Column(String(500), nullable=True)
    numeric_value = Column(Numeric(15, 2), nullable=True)
    integer_value = Column(Integer, nullable=True)
    boolean_value = Column(Boolean, nullable=True)
    json_value = Column(JSON, nullable=True)  # For complex configurations

    # Default & Validation
    default_value = Column(Text, nullable=True)  # JSON string of default value
    is_system_setting = Column(Boolean, default=False)  # Whether this is a system-wide setting
    is_user_configurable = Column(Boolean, default=True)  # Whether users can modify this setting

    # Validation Rules
    validation_rules = Column(JSON, nullable=True)  # JSON schema for validation
    allowed_values = Column(JSON, nullable=True)   # Array of allowed values for enum-type settings

    # Approval & Workflow Settings
    requires_approval = Column(Boolean, default=False)  # Whether changing this setting requires approval
    approval_threshold = Column(Numeric(10, 2), nullable=True)  # Approval threshold for auto-approval

    # Department & Scoping (Security)
    department_id = Column(UUID(as_uuid=True), nullable=True, index=True)  # Department-specific settings
    applies_to_all_departments = Column(Boolean, default=True)

    # Compliance & Security
    is_audit_required = Column(Boolean, default=True)    # Whether changes should be audited
    is_sensitive = Column(Boolean, default=False)        # Whether this is a sensitive setting
    compliance_level = Column(String(20), default="standard")  # standard, high, critical

    # Concurrency Control (Security)
    version = Column(Integer, default=1, nullable=False)  # Optimistic locking

    # Activation & Status
    is_active = Column(Boolean, default=True)
    effective_from = Column(TIMESTAMP, nullable=True)  # When this setting becomes effective
    effective_until = Column(TIMESTAMP, nullable=True) # When this setting expires

    # Audit (Security)
    created_by_user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    created_by_role = Column(String(50), nullable=False)
    last_modified_by_user_id = Column(UUID(as_uuid=True), nullable=True)
    last_modified_by_role = Column(String(50), nullable=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<ExpenseSettings(id={self.id}, key='{self.setting_key}', category='{self.setting_category}', active={self.is_active})>"