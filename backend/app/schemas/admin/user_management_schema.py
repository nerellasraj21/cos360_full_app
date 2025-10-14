"""
User Management Schemas for Tenant Admin

This module provides Pydantic schemas for tenant admin user management operations.
Allows admins to view, filter, and manage all users across different types (students, staff, parents, etc.)

Created: 2025-10-04
Module: Tenant Admin - User Management
"""

from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from typing import Optional, Literal
from datetime import datetime


class UserWithDetailsResponse(BaseModel):
    """
    Unified user response with entity details

    This schema represents a user account along with their linked entity details
    (student, staff, or parent information). Used for displaying users in admin panels.
    """
    id: UUID
    username: str
    email: Optional[str] = None
    is_active: bool
    role_id: UUID
    role_name: str

    # Entity-specific details (populated based on role)
    entity_type: Optional[Literal["student", "staff", "parent"]] = Field(
        None,
        description="Type of linked entity (student/staff/parent)"
    )
    entity_id: Optional[UUID] = Field(None, description="ID of the linked entity")
    entity_name: Optional[str] = Field(None, description="Full name from student/staff/parent record")
    entity_details: Optional[dict] = Field(None, description="Additional entity-specific details")

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    """
    Paginated user list response

    Used for listing users with pagination support
    """
    users: list[UserWithDetailsResponse]
    total: int = Field(..., description="Total number of users matching filters")
    page: int = Field(..., description="Current page number")
    limit: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")


class UserUpdateRequest(BaseModel):
    """
    Update user basic information

    Allows tenant admin to update user account details without going to
    domain-specific modules (Student/Staff)
    """
    username: Optional[str] = Field(None, min_length=3, max_length=50, description="New username")
    email: Optional[EmailStr] = Field(None, description="New email address")
    is_active: Optional[bool] = Field(None, description="Activate or deactivate user account")


class UserRoleUpdateRequest(BaseModel):
    """
    Update user role

    Allows changing a user's role (e.g., from Staff to Teacher)
    """
    role_id: UUID = Field(..., description="New role ID to assign to user")


class UserPasswordResetRequest(BaseModel):
    """
    Admin password reset

    Allows tenant admin to reset user password (for account recovery, security incidents)
    """
    new_password: str = Field(
        ...,
        min_length=8,
        description="New password for the user"
    )


class UserCreateRequest(BaseModel):
    """
    Create standalone user (Teacher/Admin)

    For creating users that are not tied to Student/Staff enrollment workflows
    (e.g., Teachers, Admins, other custom roles)
    """
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role_id: UUID
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)


class UserDetailedResponse(UserWithDetailsResponse):
    """
    Extended user response with additional details

    Used for detailed user profile view
    """
    # Can add more fields here if needed in the future
    last_login: Optional[datetime] = None
    login_count: Optional[int] = None


class UserStatusUpdateRequest(BaseModel):
    """
    Bulk user status update

    For activating/deactivating multiple users at once
    """
    user_ids: list[UUID] = Field(..., min_items=1)
    is_active: bool


class UserFilterOptions(BaseModel):
    """
    Available filter options for user listing

    Helper schema to show available filter options
    """
    available_roles: list[str] = Field(
        default=["Admin", "Teacher", "Staff", "Student", "Parent"],
        description="Available role filters"
    )
    active_status_options: list[bool] = Field(
        default=[True, False],
        description="Active status filter options"
    )
