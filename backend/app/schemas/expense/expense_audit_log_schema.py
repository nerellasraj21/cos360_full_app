from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ExpenseAuditLogRead(BaseModel):
    """Schema for reading ExpenseAuditLog (read-only, immutable)"""

    id: UUID = Field(..., description="Unique identifier")
    transaction_id: UUID = Field(..., description="Transaction ID")

    # Action details
    action: str = Field(..., description="Action performed")
    action_category: str = Field(..., description="Action category")
    field_name: str | None = Field(None, description="Field that was changed")
    old_value: str | None = Field(None, description="Previous value")
    new_value: str | None = Field(None, description="New value")

    # Complete state snapshots
    full_record_before: dict[str, Any] | None = Field(None, description="Complete record before change")
    full_record_after: dict[str, Any] | None = Field(None, description="Complete record after change")

    # Action context
    action_reason: str | None = Field(None, description="Reason for action")
    action_notes: str | None = Field(None, description="Additional notes")

    # Request details
    request_ip_address: str | None = Field(None, description="Request IP address")
    request_user_agent: str | None = Field(None, description="Request user agent")
    request_session_id: str | None = Field(None, description="Request session ID")

    # System context
    api_endpoint: str | None = Field(None, description="API endpoint called")
    http_method: str | None = Field(None, description="HTTP method")
    request_id: str | None = Field(None, description="Request correlation ID")

    # Workflow and compliance
    workflow_stage: str | None = Field(None, description="Workflow stage")
    compliance_flags: dict[str, Any] | None = Field(None, description="Compliance flags")

    # Department scoping
    department_id: UUID | None = Field(None, description="Department ID")

    # Actor information (immutable)
    actor_user_id: UUID = Field(..., description="User who performed action")
    actor_role: str = Field(..., description="Role of actor")
    actor_username: str = Field(..., description="Username of actor")

    # Timestamp (immutable)
    created_at: datetime = Field(..., description="When action was performed")

    model_config = ConfigDict(from_attributes=True)


class ExpenseAuditLogSummary(BaseModel):
    """Schema for audit log summary/overview"""

    transaction_id: UUID = Field(..., description="Transaction ID")
    total_logs: int = Field(..., description="Total audit log entries")
    last_action: str = Field(..., description="Last action performed")
    last_actor: str = Field(..., description="Last actor username")
    last_action_at: datetime = Field(..., description="Last action timestamp")

    # Action counts by category
    creation_logs: int = Field(0, description="Creation action count")
    update_logs: int = Field(0, description="Update action count")
    approval_logs: int = Field(0, description="Approval action count")
    document_logs: int = Field(0, description="Document action count")

    model_config = ConfigDict(from_attributes=True)
