from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.tools.jwt_utils import ACCESS_TOKEN_EXPIRES_IN


class LoginRequest(BaseModel):
    username: str = Field(..., description="User's username")
    password: str = Field(..., description="User's password")
    client_name: str | None = Field(None, description="Client name (optional, can be detected from headers/subdomain)")
    academic_year_id: UUID = Field(..., description="Academic year selected at login (required)")


class AcademicYearOption(BaseModel):
    id: UUID
    title: str
    is_active: bool


class UserInfo(BaseModel):
    id: UUID
    username: str
    email: str | None = None
    is_active: bool


class RoleInfo(BaseModel):
    id: UUID
    name: str
    description: str | None = None


class MenuItemResponse(BaseModel):
    id: UUID
    name: str
    path: str | None = None
    display_order: int
    children: list["MenuItemResponse"] | None = None


class LoginResponse(BaseModel):
    user: UserInfo
    role: RoleInfo
    menu: list[MenuItemResponse]
    permissions: dict[str, list[str]] = Field(
        default_factory=dict, description="User's resource permissions grouped by resource"
    )
    entity_id: str | None = Field(None, description="Entity ID (student_id, parent_id, or staff_id) based on role")
    academic_year_id: UUID
    academic_year_title: str
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(ACCESS_TOKEN_EXPIRES_IN, description="Access token lifetime in seconds")


# Legacy response for backward compatibility
class LegacyLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Refresh token schemas
class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Valid refresh token")


class RefreshTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(ACCESS_TOKEN_EXPIRES_IN, description="Access token lifetime in seconds")
    academic_year_id: Optional[UUID] = None
    academic_year_title: Optional[str] = None


# Logout schemas
class LogoutRequest(BaseModel):
    refresh_token: str | None = Field(None, description="Refresh token to also invalidate on logout")


class LogoutInstructions(BaseModel):
    clear_tokens: bool = True
    clear_menu: bool = True
    redirect_to: str = "/login"


class LogoutResponse(BaseModel):
    message: str
    instructions: LogoutInstructions


class LogoutErrorResponse(BaseModel):
    detail: str


# Error response schemas
class LoginErrorResponse(BaseModel):
    detail: str


# First-time login / password change schemas
class PasswordChangeRequiredResponse(BaseModel):
    """Returned when a staff member logs in for the first time with a temp password."""

    requires_password_change: bool = True
    change_password_token: str = Field(..., description="Short-lived token (15 min) to authorize the set-password call")
    message: str = "Please set a new password to continue"
    academic_year_id: UUID
    academic_year_title: str


class SetPasswordRequest(BaseModel):
    change_password_token: str = Field(..., description="Token received from the first-login response")
    new_password: str = Field(..., min_length=8, description="New password (min 8 characters)")
    confirm_password: str = Field(..., description="Must match new_password")


class SetPasswordResponse(BaseModel):
    message: str = "Password updated successfully"
    user: UserInfo
    role: RoleInfo
    menu: list[MenuItemResponse]
    permissions: dict[str, list[str]] = Field(default_factory=dict)
    entity_id: str | None = None
    academic_year_id: Optional[UUID] = None
    academic_year_title: Optional[str] = None
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# Enable forward references for nested MenuItemResponse
MenuItemResponse.model_rebuild()
