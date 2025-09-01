from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class LoginRequest(BaseModel):
    username: str = Field(..., description="User's username")
    password: str = Field(..., description="User's password")
    client_name: Optional[str] = Field(None, description="Client name (optional, can be detected from headers/subdomain)")

class UserInfo(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    is_active: bool

class RoleInfo(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

class MenuItemResponse(BaseModel):
    id: int
    name: str
    path: Optional[str] = None
    display_order: int
    children: Optional[List['MenuItemResponse']] = None

class LoginResponse(BaseModel):
    user: UserInfo
    role: RoleInfo
    menu: List[MenuItemResponse]
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

# Error response schemas
class LoginErrorResponse(BaseModel):
    detail: str

# Enable forward references for nested MenuItemResponse
MenuItemResponse.model_rebuild()