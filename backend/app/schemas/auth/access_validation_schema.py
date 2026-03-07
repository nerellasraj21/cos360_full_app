from uuid import UUID

from pydantic import BaseModel, Field, validator


class AccessValidationRequest(BaseModel):
    """Schema for access validation request"""

    user_id: UUID = Field(..., description="UUID of the user to validate access for")
    endpoint: str | None = Field(None, description="API endpoint path (e.g., '/api/v1/fee/fee-categories')")
    menu_item: str | None = Field(None, description="Menu item identifier or name")
    action: str = Field(default="read", description="Action being performed (create, read, update, delete, list)")

    @validator("action")
    def validate_action(cls, v):
        """Validate action name"""
        valid_actions = ["create", "read", "update", "delete", "list", "export", "approve", "import", "bulk_delete"]
        if v.lower() not in valid_actions:
            raise ValueError(f'Action must be one of: {", ".join(valid_actions)}')
        return v.lower()

    @validator("endpoint", "menu_item")
    def validate_at_least_one(cls, v, values):
        """Ensure at least one of endpoint or menu_item is provided"""
        endpoint = values.get("endpoint")
        if not v and not endpoint:
            raise ValueError("Either endpoint or menu_item must be provided")
        return v


class AccessValidationResponse(BaseModel):
    """Schema for access validation response"""

    has_access: bool = Field(..., description="Whether the user has access to the requested resource")
    reason: str | None = Field(None, description="Reason for access denial (for debugging/logging)")
    user_role: str | None = Field(None, description="User's role name")
    resource: str | None = Field(None, description="Resolved resource name")
    action: str | None = Field(None, description="Resolved action name")


class AccessValidationError(BaseModel):
    """Schema for access validation error response"""

    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: dict | None = Field(None, description="Additional error details")
