from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# Super Admin User Schemas
class SuperAdminBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    is_active: bool = True


class SuperAdminCreate(SuperAdminBase):
    password: str = Field(..., min_length=8, max_length=255)


class SuperAdminUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = Field(None, min_length=2, max_length=255)
    is_active: bool | None = None


class SuperAdminPasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=255)


class SuperAdminRead(SuperAdminBase):
    id: UUID
    last_login_at: datetime | None
    password_changed_at: datetime
    created_at: datetime
    updated_at: datetime
    failed_login_attempts: int
    account_locked_until: datetime | None
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
    resource_id: str | None = None
    tenant_id: str | None = None
    details: str | None = None  # JSON string
    ip_address: str | None = None
    user_agent: str | None = None


class SuperAdminAuditRead(BaseModel):
    id: UUID
    super_admin_id: UUID
    action: str
    resource: str
    resource_id: str | None
    tenant_id: str | None
    details: str | None
    ip_address: str | None
    user_agent: str | None
    timestamp: datetime

    model_config = {"from_attributes": True}


# System Management Schemas
class TenantCreate(BaseModel):
    client_name: str = Field(..., min_length=3, max_length=100)
    schema_name: str = Field(..., min_length=3, max_length=100)
    is_active: bool = True


class TenantUpdate(BaseModel):
    client_name: str | None = Field(None, min_length=3, max_length=100)
    is_active: bool | None = None


class SystemHealthCheck(BaseModel):
    status: str
    database_status: str
    redis_status: str | None
    total_tenants: int
    active_tenants: int
    system_version: str
    uptime: str
    timestamp: datetime
