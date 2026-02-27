from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import date, time
from app.schemas.exam.enums import ExamNature, ExamLevel, EntryType


# ── Step 3a: Exam core details ────────────────────────────────────────────────
class ExamDetailsPayload(BaseModel):
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
    hall_ticket_min_attendance: Optional[Decimal] = Field(None, ge=0, le=100)
    attendance_from_date: Optional[date] = None
    attendance_to_date: Optional[date] = None
    attendance_mode: Optional[str] = Field(None, max_length=20)
    term: Optional[str] = Field(None, max_length=20)


# ── Step 3b: Class + Section assignment ───────────────────────────────────────
class ClassSectionPayload(BaseModel):
    class_id: UUID
    section_id: Optional[UUID] = None   # null = all sections of that class


# ── Step 3c: Component within a subject config ────────────────────────────────
class ComponentPayload(BaseModel):
    component_name: str = Field(..., max_length=100)
    entry_type: EntryType = EntryType.marks
    max_marks: Optional[Decimal] = Field(None, ge=0)
    min_pass_marks: Optional[Decimal] = Field(None, ge=0)
    include_in_total: bool = True
    is_internal: bool = True
    remark_grade_set_id: Optional[UUID] = None
    sort_order: int = 0

    @model_validator(mode='after')
    def marks_required_for_marks_type(self):
        if self.entry_type == EntryType.marks and self.max_marks is None:
            raise ValueError("max_marks is required when entry_type='marks'")
        if self.entry_type == EntryType.remarks and self.remark_grade_set_id is None:
            raise ValueError("remark_grade_set_id is required when entry_type='remarks'")
        return self


# ── Step 3c: Subject config ───────────────────────────────────────────────────
class SubjectConfigPayload(BaseModel):
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
    components: List[ComponentPayload] = Field(..., min_length=1)


# ── Step 3d: Exam date ────────────────────────────────────────────────────────
class ExamDatePayload(BaseModel):
    class_id: UUID
    section_id: Optional[UUID] = None
    subject_id: UUID
    exam_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    venue: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=300)


# ── Full payload ──────────────────────────────────────────────────────────────
class ExamCreateFull(BaseModel):
    """
    Single-operation exam creation payload.
    All four steps combined. Submitted as ONE API call. Saved in ONE transaction.
    Rolls back entirely if any step fails validation or DB insertion.
    """
    exam: ExamDetailsPayload
    class_sections: List[ClassSectionPayload] = Field(..., min_length=1)
    subject_configs: List[SubjectConfigPayload] = Field(..., min_length=1)
    exam_dates: List[ExamDatePayload] = Field(default_factory=list)

    @model_validator(mode='after')
    def validate_class_sections_match(self):
        """Every subject_config must reference a class_id that appears in class_sections."""
        class_ids = {cs.class_id for cs in self.class_sections}
        for sc in self.subject_configs:
            if sc.class_id not in class_ids:
                raise ValueError(
                    f"subject_config references class_id {sc.class_id} "
                    f"which is not in class_sections"
                )
        return self


# ── Response ──────────────────────────────────────────────────────────────────
class ExamCreateFullResponse(BaseModel):
    exam_id: UUID
    exam_name: str
    status: str
    class_sections_created: int
    subject_configs_created: int
    exam_dates_created: int
