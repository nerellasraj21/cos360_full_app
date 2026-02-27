from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import datetime


class ComponentMarkRead(BaseModel):
    component_name: str
    marks_obtained: Optional[Decimal] = None
    max_marks: Optional[Decimal] = None
    is_absent: bool = False


class SubjectResultRead(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    subject_config_id: UUID
    subject_name: Optional[str] = None
    marks_obtained: Optional[Decimal] = None
    max_marks: Optional[Decimal] = None
    percentage: Optional[Decimal] = None
    grade_label: Optional[str] = None
    gpa: Optional[Decimal] = None
    remark_grade: Optional[str] = None
    is_absent: bool = False
    is_passed: Optional[bool] = None


class StudentExamResultRead(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    exam_id: UUID
    student_id: UUID
    student_name: Optional[str] = None
    admission_number: Optional[str] = None
    total_marks_obtained: Optional[Decimal] = None
    total_max_marks: Optional[Decimal] = None
    percentage: Optional[Decimal] = None
    grade_label: Optional[str] = None
    gpa: Optional[Decimal] = None
    rank: Optional[int] = None
    is_passed: Optional[bool] = None
    computed_at: Optional[datetime] = None
    subject_results: List[SubjectResultRead] = []


class ComputeResultResponse(BaseModel):
    exam_id: UUID
    students_computed: int
    status: str = "computed"


class PublishResultResponse(BaseModel):
    exam_id: UUID
    status: str
    published_at: Optional[datetime] = None


class UnlockExamRequest(BaseModel):
    reason: str


class UnlockExamResponse(BaseModel):
    exam_id: UUID
    status: str
    reason: str
