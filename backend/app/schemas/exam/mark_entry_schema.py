from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import datetime
from app.schemas.exam.enums import EntryType


class MarkEntryItem(BaseModel):
    """Single mark entry — one row in student_marks."""
    student_id: UUID
    component_id: UUID
    marks_obtained: Optional[Decimal] = Field(None, ge=0)
    remark_grade: Optional[str] = Field(None, max_length=5)
    is_absent: bool = False


class MarkEntryCreate(BaseModel):
    exam_id: UUID
    subject_config_id: UUID
    marks: List[MarkEntryItem] = Field(..., min_length=1)
    attempt_number: int = Field(1, ge=1)


class MarkEntryRead(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    exam_id: UUID
    student_id: UUID
    component_id: UUID
    marks_obtained: Optional[Decimal]
    remark_grade: Optional[str]
    is_absent: bool
    attempt_number: int
    entry_source: str
    entered_by: UUID
    entered_at: datetime
    updated_at: Optional[datetime]
