from pydantic import BaseModel, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class MarkPermissionCreate(BaseModel):
    exam_id: UUID
    user_id: UUID
    scope_note: Optional[str] = None


class MarkPermissionRead(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    exam_id: UUID
    user_id: UUID
    granted_by: UUID
    scope_note: Optional[str] = None
    is_active: bool
    created_at: datetime


class MarkPermissionUpdate(BaseModel):
    is_active: bool
    scope_note: Optional[str] = None
