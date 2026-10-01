from uuid import UUID

from pydantic import BaseModel


class UserContext(BaseModel):
    """
    Unified user context for all service operations.
    This schema provides complete user context including entity relationships
    and access scope for proper data filtering.
    """

    user_id: UUID
    username: str
    role: str
    department_id: UUID | None = None

    # Entity-specific IDs (populated dynamically based on user type)
    student_id: UUID | None = None
    staff_id: UUID | None = None
    parent_id: UUID | None = None

    # Access scope determination for permission filtering
    access_scope: str | None = None  # "all", "own", "related", "department", "denied"
    allowed_entity_ids: list[UUID] | None = None  # For "related" access scope

    # Additional context for specific use cases
    tenant_id: str | None = None
    plan_limitations: dict | None = None

    class Config:
        json_encoders = {UUID: str}
        from_attributes = True


class UserContextRequest(BaseModel):
    """Schema for requesting user context resolution"""

    resource: str
    action: str
    target_entity_id: UUID | None = None


class UserContextResponse(BaseModel):
    """Response schema for user context with resolved permissions"""

    context: UserContext
    has_access: bool
    access_type: str  # "full", "own", "related", "denied"
    message: str | None = None
