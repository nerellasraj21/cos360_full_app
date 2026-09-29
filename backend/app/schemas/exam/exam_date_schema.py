from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, Field


class ExamDateBase(BaseModel):
    exam_id: UUID
    class_id: UUID
    section_id: UUID | None = None
    subject_id: UUID
    exam_date: date
    start_time: time | None = None
    end_time: time | None = None
    venue: str | None = Field(None, max_length=100)
    notes: str | None = Field(None, max_length=300)


class ExamDateCreate(ExamDateBase):
    pass


class ExamDateBulkCreate(BaseModel):
    dates: list[ExamDateCreate] = Field(..., min_length=1)


class ClassSectionRef(BaseModel):
    class_id: UUID
    section_id: UUID | None = None


class ExamDateMultiSectionCreate(BaseModel):
    exam_id: UUID
    subject_id: UUID
    exam_date: date
    start_time: time | None = None
    end_time: time | None = None
    venue: str | None = Field(None, max_length=100)
    notes: str | None = Field(None, max_length=300)
    class_sections: list[ClassSectionRef] = Field(..., min_length=1)


class ExamDateUpdate(BaseModel):
    exam_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    venue: str | None = Field(None, max_length=100)
    notes: str | None = Field(None, max_length=300)


class ExamDateRead(ExamDateBase):
    model_config = {"from_attributes": True}
    id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime
