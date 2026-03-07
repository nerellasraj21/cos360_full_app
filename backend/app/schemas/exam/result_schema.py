from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class ComponentMarkRead(BaseModel):
    component_name: str
    marks_obtained: Decimal | None = None
    max_marks: Decimal | None = None
    is_absent: bool = False


class SubjectResultRead(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    subject_config_id: UUID
    subject_name: str | None = None
    marks_obtained: Decimal | None = None
    max_marks: Decimal | None = None
    percentage: Decimal | None = None
    grade_label: str | None = None
    gpa: Decimal | None = None
    remark_grade: str | None = None
    is_absent: bool = False
    is_passed: bool | None = None


class StudentExamResultRead(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    exam_id: UUID
    student_id: UUID
    student_name: str | None = None
    admission_number: str | None = None
    total_marks_obtained: Decimal | None = None
    total_max_marks: Decimal | None = None
    percentage: Decimal | None = None
    grade_label: str | None = None
    gpa: Decimal | None = None
    rank: int | None = None
    is_passed: bool | None = None
    computed_at: datetime | None = None
    subject_results: list[SubjectResultRead] = []


class ComputeResultResponse(BaseModel):
    exam_id: UUID
    students_computed: int
    status: str = "computed"


class PublishResultResponse(BaseModel):
    exam_id: UUID
    status: str
    published_at: datetime | None = None


class UnlockExamRequest(BaseModel):
    reason: str


class UnlockExamResponse(BaseModel):
    exam_id: UUID
    status: str
    reason: str
