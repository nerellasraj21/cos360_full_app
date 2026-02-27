from pydantic import BaseModel, field_validator
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import datetime
from app.schemas.exam.enums import EntryType


class ExamSubjectComponentCreate(BaseModel):
    component_name: str
    entry_type: EntryType = EntryType.marks
    max_marks: Optional[Decimal] = None
    min_pass_marks: Optional[Decimal] = None
    include_in_total: bool = True
    is_internal: bool = True
    remark_grade_set_id: Optional[UUID] = None
    sort_order: int = 0


class ExamSubjectComponentRead(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    subject_config_id: UUID
    component_name: str
    entry_type: str
    max_marks: Optional[Decimal] = None
    min_pass_marks: Optional[Decimal] = None
    include_in_total: bool
    is_internal: bool
    remark_grade_set_id: Optional[UUID] = None
    sort_order: int


class ExamSubjectConfigCreate(BaseModel):
    exam_id: UUID
    class_id: UUID
    section_id: Optional[UUID] = None
    subject_id: UUID
    subject_grade_scheme_id: Optional[UUID] = None
    credit_hours: Optional[int] = None
    has_internal_external_split: bool = False
    internal_max_marks: Optional[Decimal] = None
    internal_min_pass: Optional[Decimal] = None
    external_max_marks: Optional[Decimal] = None
    external_min_pass: Optional[Decimal] = None
    sort_order: Optional[int] = None
    is_active: bool = True
    components: List[ExamSubjectComponentCreate] = []


class ExamSubjectConfigRead(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    exam_id: UUID
    class_id: UUID
    section_id: Optional[UUID] = None
    subject_id: UUID
    subject_grade_scheme_id: Optional[UUID] = None
    credit_hours: Optional[int] = None
    has_internal_external_split: bool
    internal_max_marks: Optional[Decimal] = None
    internal_min_pass: Optional[Decimal] = None
    external_max_marks: Optional[Decimal] = None
    external_min_pass: Optional[Decimal] = None
    sort_order: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    components: List[ExamSubjectComponentRead] = []


class ExamSubjectConfigUpdate(BaseModel):
    subject_grade_scheme_id: Optional[UUID] = None
    credit_hours: Optional[int] = None
    has_internal_external_split: Optional[bool] = None
    internal_max_marks: Optional[Decimal] = None
    internal_min_pass: Optional[Decimal] = None
    external_max_marks: Optional[Decimal] = None
    external_min_pass: Optional[Decimal] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
