from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import date, datetime
from app.schemas.exam.enums import ExamStatus, ExamNature, ExamLevel


class ExamBase(BaseModel):
    exam_name: str = Field(..., max_length=150)
    board: str = Field(..., max_length=50)
    custom_board_name: Optional[str] = Field(None, max_length=100)
    level: ExamLevel
    exam_type: str = Field(..., max_length=50)
    nature: ExamNature = ExamNature.formative
    is_internal: bool = True
    weightage_percent: Optional[Decimal] = None
    academic_year_id: UUID
    exam_grade_scheme_id: Optional[UUID] = None
    mark_entry_deadline: Optional[date] = None
    publish_rank: bool = False
    hall_ticket_min_attendance: Optional[Decimal] = Field(None, ge=0, le=100)
    attendance_from_date: Optional[date] = None
    attendance_to_date: Optional[date] = None
    attendance_mode: Optional[str] = Field(None, max_length=20)
    term: Optional[str] = Field(None, max_length=20)


class ExamCreate(ExamBase):
    pass


class ExamUpdate(BaseModel):
    exam_name: Optional[str] = Field(None, max_length=150)
    mark_entry_deadline: Optional[date] = None
    hall_ticket_min_attendance: Optional[Decimal] = Field(None, ge=0, le=100)
    attendance_from_date: Optional[date] = None
    attendance_to_date: Optional[date] = None
    publish_rank: Optional[bool] = None
    term: Optional[str] = None


class ExamRead(ExamBase):
    model_config = {"from_attributes": True}

    id: UUID
    status: ExamStatus
    hall_ticket_published: bool
    hall_ticket_published_at: Optional[datetime] = None
    cloned_from_exam_id: Optional[UUID] = None
    created_by: UUID
    created_at: datetime
    updated_at: datetime


class ExamListItem(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    exam_name: str
    board: str
    level: str
    exam_type: str
    nature: str
    status: ExamStatus
    academic_year_id: UUID
    mark_entry_deadline: Optional[date] = None
    created_at: datetime
    subject_config_count: Optional[int] = None
