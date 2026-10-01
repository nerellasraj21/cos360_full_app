"""
Pydantic schemas for Tenant Admin Role Management
Follows COS360 project patterns and conventions
"""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, validator


class RoleCreateRequest(BaseModel):
    """Request schema for creating a new role"""

    name: str = Field(..., min_length=2, max_length=50, description="Role name")
    description: str | None = Field(None, max_length=200, description="Role description")

    @validator("name")
    def validate_name(cls, v):
        # Prevent creation of system roles
        protected_roles = ["Admin", "Teacher", "Staff", "Student", "Parent"]
        if v in protected_roles:
            raise ValueError(f"Cannot create system role '{v}'. Use a different name.")

        # Basic name validation
        if not v.replace(" ", "").replace("_", "").replace("-", "").isalnum():
            raise ValueError("Role name can only contain letters, numbers, spaces, hyphens, and underscores")

        return v.strip()

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Office Manager",
                "description": "Manages office operations and administrative tasks",
                "is_active": True,
            }
        }


class RoleUpdateRequest(BaseModel):
    """Request schema for updating role details"""

    name: str | None = Field(None, min_length=2, max_length=50, description="Role name")
    description: str | None = Field(None, max_length=200, description="Role description")
    is_active: bool | None = Field(None, description="Role active status")

    @validator("name")
    def validate_name(cls, v):
        if v is None:
            return v

        # Prevent renaming to system roles
        protected_roles = ["Admin", "Teacher", "Staff", "Student", "Parent"]
        if v in protected_roles:
            raise ValueError(f"Cannot rename to system role '{v}'. Use a different name.")

        # Basic name validation
        if not v.replace(" ", "").replace("_", "").replace("-", "").isalnum():
            raise ValueError("Role name can only contain letters, numbers, spaces, hyphens, and underscores")

        return v.strip()

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Senior Office Manager",
                "description": "Senior level office operations and administrative tasks",
                "is_active": True,
            }
        }


class RoleRead(BaseModel):
    """Response schema for role data"""

    id: UUID
    name: str
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    permission_count: int | None = Field(None, description="Number of granted permissions")
    user_count: int | None = Field(None, description="Number of users with this role")
    is_system_role: bool | None = Field(None, description="Whether this is a protected system role")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Office Manager",
                "description": "Manages office operations and administrative tasks",
                "is_active": True,
                "created_at": "2025-09-14T10:00:00Z",
                "updated_at": "2025-09-14T10:00:00Z",
                "permission_count": 15,
                "user_count": 3,
                "is_system_role": False,
            }
        }


class RoleCreateResponse(BaseModel):
    """Response schema for role creation"""

    message: str
    role: RoleRead
    next_steps: list[str] = Field(description="Suggested next actions")

    class Config:
        json_schema_extra = {
            "example": {
                "message": "Role created successfully",
                "role": {
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "name": "Office Manager",
                    "description": "Manages office operations and administrative tasks",
                    "is_active": True,
                    "created_at": "2025-09-14T10:00:00Z",
                    "updated_at": "2025-09-14T10:00:00Z",
                    "permission_count": 0,
                    "user_count": 0,
                    "is_system_role": False,
                },
                "next_steps": [
                    "1. Apply a permission template using POST /roles/{id}/apply-template",
                    "2. Assign specific permissions using PUT /roles/{id}/permissions",
                    "3. Assign users to this role when creating/updating users",
                ],
            }
        }


class RoleUpdateResponse(BaseModel):
    """Response schema for role updates"""

    message: str
    role: RoleRead
    changes_made: dict[str, Any] = Field(description="Summary of changes")

    class Config:
        json_schema_extra = {
            "example": {
                "message": "Role updated successfully",
                "role": {
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "name": "Senior Office Manager",
                    "description": "Senior level office operations and administrative tasks",
                    "is_active": True,
                    "created_at": "2025-09-14T10:00:00Z",
                    "updated_at": "2025-09-14T10:30:00Z",
                    "permission_count": 15,
                    "user_count": 3,
                    "is_system_role": False,
                },
                "changes_made": {
                    "name": {"old": "Office Manager", "new": "Senior Office Manager"},
                    "description": {
                        "old": "Manages office operations",
                        "new": "Senior level office operations and administrative tasks",
                    },
                },
            }
        }


class RoleDeleteValidation(BaseModel):
    """Validation response for role deletion"""

    can_delete: bool
    role: RoleRead
    blocking_factors: list[str] = Field(description="Reasons preventing deletion if can_delete is False")
    impact_summary: dict[str, Any] = Field(description="Summary of deletion impact")

    class Config:
        json_schema_extra = {
            "example": {
                "can_delete": False,
                "role": {
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "name": "Office Manager",
                    "description": "Manages office operations and administrative tasks",
                    "is_active": True,
                    "created_at": "2025-09-14T10:00:00Z",
                    "updated_at": "2025-09-14T10:00:00Z",
                    "permission_count": 15,
                    "user_count": 3,
                    "is_system_role": False,
                },
                "blocking_factors": [
                    "Role is assigned to 3 active users",
                    "Cannot delete role while users are assigned",
                ],
                "impact_summary": {
                    "affected_users": 3,
                    "required_action": "Reassign users to different roles before deletion",
                },
            }
        }


class RoleDeleteResponse(BaseModel):
    """Response schema for successful role deletion"""

    message: str
    deleted_role: dict[str, Any] = Field(description="Summary of deleted role")
    impact_summary: dict[str, Any] = Field(description="Deletion impact details")

    class Config:
        json_schema_extra = {
            "example": {
                "message": "Role deleted successfully",
                "deleted_role": {
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "name": "Office Manager",
                    "deleted_at": "2025-09-14T11:00:00Z",
                },
                "impact_summary": {"permissions_removed": 15, "role_deactivated": True, "users_affected": 0},
            }
        }


class BulkPermissionUpdateRequest(BaseModel):
    """Request schema for bulk permission updates"""

    permissions: list[dict[str, Any]] = Field(
        ..., description="List of permissions to update", min_items=1, max_items=100
    )
    clear_existing: bool = Field(
        False, description="Whether to clear all existing permissions before applying new ones"
    )

    @validator("permissions")
    def validate_permissions(cls, v):
        for permission in v:
            if not all(key in permission for key in ["resource", "action", "is_granted"]):
                raise ValueError("Each permission must have 'resource', 'action', and 'is_granted' fields")

            if not isinstance(permission["is_granted"], bool):
                raise ValueError("'is_granted' must be a boolean value")

            if not permission["resource"] or not permission["action"]:
                raise ValueError("'resource' and 'action' cannot be empty")

        return v

    class Config:
        json_schema_extra = {
            "example": {
                "permissions": [
                    {"resource": "academic_years", "action": "read", "is_granted": True},
                    {"resource": "academic_years", "action": "list", "is_granted": True},
                    {"resource": "classes", "action": "read", "is_granted": True},
                    {"resource": "fee_management", "action": "read", "is_granted": False},
                ],
                "clear_existing": False,
            }
        }


class PermissionTemplateRequest(BaseModel):
    """Request schema for applying permission templates"""

    template_name: str = Field(..., description="Name of template to apply")
    overwrite_existing: bool = Field(False, description="Whether to overwrite existing permissions")

    @validator("template_name")
    def validate_template_name(cls, v):
        valid_templates = ["Admin", "Teacher", "Staff", "Student", "Parent"]
        if v not in valid_templates:
            raise ValueError(f"Invalid template. Available templates: {valid_templates}")
        return v

    class Config:
        json_schema_extra = {"example": {"template_name": "Teacher", "overwrite_existing": False}}


class SystemRoleInfo(BaseModel):
    """Information about system roles that cannot be modified"""

    role_name: str
    protection_level: str
    restrictions: list[str]
    description: str

    class Config:
        json_schema_extra = {
            "example": {
                "role_name": "Admin",
                "protection_level": "full",
                "restrictions": [
                    "Cannot be deleted",
                    "Cannot be renamed",
                    "Cannot be deactivated",
                    "Permissions managed by system",
                ],
                "description": "System administrator role with full access",
            }
        }


class RoleListResponse(BaseModel):
    """Response schema for role listing"""

    roles: list[RoleRead]
    total_roles: int
    system_roles: list[str] = Field(description="List of protected system role names")
    custom_roles: list[str] = Field(description="List of custom role names")
    tenant_id: str | None = Field(default=None, description="Current tenant id")

    class Config:
        json_schema_extra = {
            "example": {
                "roles": [
                    {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "name": "Admin",
                        "description": "System administrator with full access",
                        "is_active": True,
                        "created_at": "2025-09-14T10:00:00Z",
                        "updated_at": "2025-09-14T10:00:00Z",
                        "permission_count": 170,
                        "user_count": 2,
                        "is_system_role": True,
                    }
                ],
                "total_roles": 6,
                "system_roles": ["Admin", "Teacher", "Staff", "Student", "Parent"],
                "custom_roles": ["Office Manager"],
                "tenant_id": "6f1c1a6e-3c1d-4b5e-9a57-0e3f6d2b8a11",
            }
        }
