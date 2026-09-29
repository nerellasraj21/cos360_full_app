from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class MarkEntryItem(BaseModel):
    """Single mark entry — one row in student_marks."""

    student_id: UUID
    component_id: UUID
    marks_obtained: Decimal | None = Field(None, ge=0)
    remark_grade: str | None = Field(None, max_length=5)
    is_absent: bool = False


class MarkEntryCreate(BaseModel):
    exam_id: UUID
    subject_config_id: UUID
    marks: list[MarkEntryItem] = Field(..., min_length=1)
    attempt_number: int = Field(1, ge=1)


class MarkEntryRead(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    exam_id: UUID
    student_id: UUID
    component_id: UUID
    marks_obtained: Decimal | None
    remark_grade: str | None
    is_absent: bool
    attempt_number: int
    entry_source: str
    entered_by: UUID
    entered_at: datetime
    updated_at: datetime | None
