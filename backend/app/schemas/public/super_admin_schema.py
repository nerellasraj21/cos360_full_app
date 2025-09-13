from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime

# Super Admin User Schemas
class SuperAdminBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    is_active: bool = True

class SuperAdminCreate(SuperAdminBase):
    password: str = Field(..., min_length=8, max_length=255)

class SuperAdminUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    is_active: Optional[bool] = None

class SuperAdminPasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=255)

class SuperAdminRead(SuperAdminBase):
    id: UUID
    last_login_at: Optional[datetime]
    password_changed_at: datetime
    created_at: datetime
    updated_at: datetime
    failed_login_attempts: int
    account_locked_until: Optional[datetime]
    requires_password_change: bool
    
    model_config = {"from_attributes": True}

# Super Admin Authentication Schemas
class SuperAdminLogin(BaseModel):
    username: str
    password: str

class SuperAdminToken(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user_type: str = "super_admin"

# Super Admin Audit Schemas
class SuperAdminAuditCreate(BaseModel):
    super_admin_id: UUID
    action: str
    resource: str
    resource_id: Optional[str] = None
    tenant_id: Optional[str] = None
    details: Optional[str] = None  # JSON string
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class SuperAdminAuditRead(BaseModel):
    id: UUID
    super_admin_id: UUID
    action: str
    resource: str
    resource_id: Optional[str]
    tenant_id: Optional[str]
    details: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    timestamp: datetime
    
    model_config = {"from_attributes": True}

# System Management Schemas
class TenantCreate(BaseModel):
    client_name: str = Field(..., min_length=3, max_length=100)
    schema_name: str = Field(..., min_length=3, max_length=100)
    is_active: bool = True

class TenantUpdate(BaseModel):
    client_name: Optional[str] = Field(None, min_length=3, max_length=100)
    is_active: Optional[bool] = None

class SystemHealthCheck(BaseModel):
    status: str
    database_status: str
    redis_status: Optional[str]
    total_tenants: int
    active_tenants: int
    system_version: str
    uptime: str
    timestamp: datetime