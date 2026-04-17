from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.exam.enums import ExamLevel, ExamNature, ExamStatus


class ExamBase(BaseModel):
    exam_name: str = Field(..., max_length=150)
    board: str = Field(..., max_length=50)
    custom_board_name: str | None = Field(None, max_length=100)
    level: ExamLevel
    exam_type: str = Field(..., max_length=50)
    nature: ExamNature = ExamNature.formative
    is_internal: bool = True
    weightage_percent: Decimal | None = None
    academic_year_id: UUID
    exam_grade_scheme_id: UUID | None = None
    mark_entry_deadline: date | None = None
    publish_rank: bool = False
    hall_ticket_min_attendance: Decimal | None = Field(None, ge=0, le=100)
    attendance_from_date: date | None = None
    attendance_to_date: date | None = None
    attendance_mode: str | None = Field(None, max_length=20)
    term: str | None = Field(None, max_length=20)


class ExamCreate(ExamBase):
    pass


class ExamUpdate(BaseModel):
    exam_name: str | None = Field(None, max_length=150)
    mark_entry_deadline: date | None = None
    hall_ticket_min_attendance: Decimal | None = Field(None, ge=0, le=100)
    attendance_from_date: date | None = None
    attendance_to_date: date | None = None
    publish_rank: bool | None = None
    term: str | None = None


class ExamRead(ExamBase):
    model_config = {"from_attributes": True}

    id: UUID
    status: ExamStatus
    hall_ticket_published: bool
    hall_ticket_published_at: datetime | None = None
    cloned_from_exam_id: UUID | None = None
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
    mark_entry_deadline: date | None = None
    hall_ticket_min_attendance: Decimal | None = None
    attendance_from_date: date | None = None
    attendance_to_date: date | None = None
    publish_rank: bool = False
    term: str | None = None
    created_at: datetime
    subject_config_count: int | None = None
