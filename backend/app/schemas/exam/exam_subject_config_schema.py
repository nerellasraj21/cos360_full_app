from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

from app.schemas.exam.enums import EntryType


class ExamSubjectComponentCreate(BaseModel):
    component_name: str
    entry_type: EntryType = EntryType.marks
    max_marks: Decimal | None = None
    min_pass_marks: Decimal | None = None
    include_in_total: bool = True
    is_internal: bool = True
    remark_grade_set_id: UUID | None = None
    sort_order: int = 0


class ExamSubjectComponentRead(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    subject_config_id: UUID
    component_name: str
    entry_type: str
    max_marks: Decimal | None = None
    min_pass_marks: Decimal | None = None
    include_in_total: bool
    is_internal: bool
    remark_grade_set_id: UUID | None = None
    sort_order: int


class ExamSubjectConfigCreate(BaseModel):
    exam_id: UUID
    class_id: UUID
    section_id: UUID | None = None
    subject_id: UUID
    subject_grade_scheme_id: UUID | None = None
    credit_hours: int | None = None
    has_internal_external_split: bool = False
    internal_max_marks: Decimal | None = None
    internal_min_pass: Decimal | None = None
    external_max_marks: Decimal | None = None
    external_min_pass: Decimal | None = None
    sort_order: int | None = None
    is_active: bool = True
    components: list[ExamSubjectComponentCreate] = []


class ExamSubjectConfigRead(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    exam_id: UUID
    class_id: UUID
    section_id: UUID | None = None
    subject_id: UUID
    subject_grade_scheme_id: UUID | None = None
    credit_hours: int | None = None
    has_internal_external_split: bool
    internal_max_marks: Decimal | None = None
    internal_min_pass: Decimal | None = None
    external_max_marks: Decimal | None = None
    external_min_pass: Decimal | None = None
    sort_order: int | None = None
    created_at: datetime
    updated_at: datetime
    components: list[ExamSubjectComponentRead] = []


class ExamSubjectConfigUpdate(BaseModel):
    subject_grade_scheme_id: UUID | None = None
    credit_hours: int | None = None
    has_internal_external_split: bool | None = None
    internal_max_marks: Decimal | None = None
    internal_min_pass: Decimal | None = None
    external_max_marks: Decimal | None = None
    external_min_pass: Decimal | None = None
    sort_order: int | None = None
    is_active: bool | None = None
