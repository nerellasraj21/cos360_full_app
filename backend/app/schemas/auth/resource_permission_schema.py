import re
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, validator


class ResourcePermissionBase(BaseModel):
    """Base schema for ResourcePermission"""

    resource: str = Field(..., max_length=50, description="Resource name (e.g., 'fee_categories', 'students')")
    action: str = Field(
        ..., max_length=30, description="Action name (e.g., 'create', 'read', 'update', 'delete', 'list')"
    )
    is_granted: bool = Field(default=True, description="Whether the permission is granted or denied")

    @validator("resource")
    def validate_resource(cls, v):
        """Validate resource name format"""
        if not v or not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Resource must contain only alphanumeric characters, hyphens, and underscores")
        return v.lower()

    @validator("action")
    def validate_action(cls, v):
        """Validate action name format; scoped actions such as read_own and list_related are valid"""
        v = (v or "").strip().lower()
        if not re.fullmatch(r"[a-z][a-z0-9_]*", v):
            raise ValueError("Action must start with a letter and contain only lowercase letters, digits, and underscores")
        return v


class ResourcePermissionCreate(ResourcePermissionBase):
    """Schema for creating a new ResourcePermission"""

    role_id: UUID = Field(..., description="UUID of the role to assign permission to")


class ResourcePermissionUpdate(BaseModel):
    """Schema for updating a ResourcePermission"""

    is_granted: bool | None = Field(None, description="Whether the permission is granted or denied")


class ResourcePermissionRead(BaseModel):
    """Schema for reading ResourcePermission data"""

    id: UUID = Field(..., description="Unique permission ID")
    role_id: UUID = Field(..., description="UUID of the role this permission belongs to")
    resource: str = Field(..., description="Resource name")
    action: str = Field(..., description="Action name, including scoped actions such as read_own")
    is_granted: bool = Field(..., description="Whether the permission is granted or denied")

    model_config = ConfigDict(from_attributes=True)


class ResourcePermissionWithRole(ResourcePermissionRead):
    """Schema for ResourcePermission with role information"""

    role_name: str | None = Field(None, description="Name of the role")
    role_description: str | None = Field(None, description="Description of the role")


class ResourcePermissionBulkCreate(BaseModel):
    """Schema for bulk creating permissions"""

    role_id: UUID = Field(..., description="UUID of the role to assign permissions to")
    permissions: list[ResourcePermissionBase] = Field(..., description="List of permissions to create")


class ResourcePermissionSummary(BaseModel):
    """Schema for permission summary by role"""

    role_id: UUID
    role_name: str
    total_permissions: int
    granted_permissions: int
    denied_permissions: int
    permissions: list[ResourcePermissionRead]


class PermissionKey(BaseModel):
    """Schema for permission key validation"""

    permission_key: str = Field(..., description="Permission key in format 'resource:action'")

    @validator("permission_key")
    def validate_permission_key(cls, v):
        """Validate permission key format"""
        if ":" not in v:
            raise ValueError('Permission key must be in format "resource:action"')
        parts = v.split(":")
        if len(parts) != 2:
            raise ValueError("Permission key must contain exactly one colon")
        resource, action = parts
        if not resource or not action:
            raise ValueError("Both resource and action must be non-empty")
        return v.lower()


# Dropdown/Select schemas for frontend
class ResourceDropdown(BaseModel):
    """Schema for resource dropdown options"""

    resource: str = Field(..., description="Resource name")
    display_name: str = Field(..., description="Human-readable resource name")


class ActionDropdown(BaseModel):
    """Schema for action dropdown options"""

    action: str = Field(..., description="Action name")
    display_name: str = Field(..., description="Human-readable action name")


class RolePermissionMatrix(BaseModel):
    """Schema for role-permission matrix view"""

    role_id: UUID
    role_name: str
    permissions_by_resource: dict[str, dict[str, bool]]  # {resource: {action: is_granted}}
