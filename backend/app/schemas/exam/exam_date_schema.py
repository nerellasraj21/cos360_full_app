from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import date, time, datetime


class ExamDateBase(BaseModel):
    exam_id: UUID
    class_id: UUID
    section_id: Optional[UUID] = None
    subject_id: UUID
    exam_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    venue: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=300)


class ExamDateCreate(ExamDateBase):
    pass


class ExamDateBulkCreate(BaseModel):
    dates: List[ExamDateCreate] = Field(..., min_length=1)


class ExamDateUpdate(BaseModel):
    exam_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    venue: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=300)


class ExamDateRead(ExamDateBase):
    model_config = {"from_attributes": True}
    id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime
