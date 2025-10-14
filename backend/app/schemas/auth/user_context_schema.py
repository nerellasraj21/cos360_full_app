from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID

class UserContext(BaseModel):
    """
    Unified user context for all service operations.
    This schema provides complete user context including entity relationships
    and access scope for proper data filtering.
    """
    user_id: UUID
    username: str
    role: str
    department_id: Optional[UUID] = None

    # Entity-specific IDs (populated dynamically based on user type)
    student_id: Optional[UUID] = None
    staff_id: Optional[UUID] = None
    parent_id: Optional[UUID] = None

    # Access scope determination for permission filtering
    access_scope: Optional[str] = None  # "all", "own", "related", "department", "denied"
    allowed_entity_ids: Optional[List[UUID]] = None  # For "related" access scope

    # Additional context for specific use cases
    tenant_schema: Optional[str] = None
    plan_limitations: Optional[dict] = None

    class Config:
        json_encoders = {
            UUID: str
        }
        from_attributes = True

class UserContextRequest(BaseModel):
    """Schema for requesting user context resolution"""
    resource: str
    action: str
    target_entity_id: Optional[UUID] = None

class UserContextResponse(BaseModel):
    """Response schema for user context with resolved permissions"""
    context: UserContext
    has_access: bool
    access_type: str  # "full", "own", "related", "denied"
    message: Optional[str] = None