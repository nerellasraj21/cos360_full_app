from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class AuditLogRead(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    exam_id: UUID
    student_id: UUID | None = None
    subject_id: UUID | None = None
    action: str
    old_value: str | None = None
    new_value: str | None = None
    reason: str | None = None
    performed_by: UUID
    performed_at: datetime
    metadata_: Any | None = None
