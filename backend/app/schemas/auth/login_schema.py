from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID

class LoginRequest(BaseModel):
    username: str = Field(..., description="User's username")
    password: str = Field(..., description="User's password")
    client_name: Optional[str] = Field(None, description="Client name (optional, can be detected from headers/subdomain)")

class UserInfo(BaseModel):
    id: UUID
    username: str
    email: Optional[str] = None
    is_active: bool

class RoleInfo(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None

class MenuItemResponse(BaseModel):
    id: UUID
    name: str
    path: Optional[str] = None
    display_order: int
    children: Optional[List['MenuItemResponse']] = None

class LoginResponse(BaseModel):
    user: UserInfo
    role: RoleInfo
    menu: List[MenuItemResponse]
    permissions: Dict[str, List[str]] = Field(default_factory=dict, description="User's resource permissions grouped by resource")
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

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

# Logout schemas
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

# Enable forward references for nested MenuItemResponse
MenuItemResponse.model_rebuild()