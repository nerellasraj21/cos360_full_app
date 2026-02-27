from pydantic import BaseModel
from typing import Optional, Any
from uuid import UUID
from datetime import datetime


class AuditLogRead(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    exam_id: UUID
    student_id: Optional[UUID] = None
    subject_id: Optional[UUID] = None
    action: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    reason: Optional[str] = None
    performed_by: UUID
    performed_at: datetime
    metadata_: Optional[Any] = None

