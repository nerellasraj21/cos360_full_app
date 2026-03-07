from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class MarkPermissionCreate(BaseModel):
    exam_id: UUID
    user_id: UUID
    scope_note: str | None = None


class MarkPermissionRead(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    exam_id: UUID
    user_id: UUID
    granted_by: UUID
    scope_note: str | None = None
    is_active: bool
    created_at: datetime


class MarkPermissionUpdate(BaseModel):
    is_active: bool
    scope_note: str | None = None
