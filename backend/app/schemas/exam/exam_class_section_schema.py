from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ExamClassSectionCreate(BaseModel):
    exam_id: UUID
    class_id: UUID
    section_id: UUID | None = None
    stream_id: UUID | None = None


class ExamClassSectionRead(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    exam_id: UUID
    class_id: UUID
    section_id: UUID | None = None
    stream_id: UUID | None = None
    created_at: datetime
