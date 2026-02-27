from pydantic import BaseModel, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class ExamClassSectionCreate(BaseModel):
    exam_id: UUID
    class_id: UUID
    section_id: Optional[UUID] = None
    stream_id: Optional[UUID] = None


class ExamClassSectionRead(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    exam_id: UUID
    class_id: UUID
    section_id: Optional[UUID] = None
    stream_id: Optional[UUID] = None
    created_at: datetime
