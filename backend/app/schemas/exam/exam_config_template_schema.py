from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


# ── Component stored in JSONB ────────────────────────────────────────────────


class TemplateComponentData(BaseModel):
    component_name: str
    entry_type: str = "marks"
    max_marks: Decimal | None = None
    min_pass_marks: Decimal | None = None
    include_in_total: bool = True
    is_internal: bool = True
    remark_grade_set_id: UUID | None = None
    sort_order: int = 0


# ── Template items ───────────────────────────────────────────────────────────


class TemplateItemCreate(BaseModel):
    subject_id: UUID
    subject_grade_scheme_id: UUID | None = None
    credit_hours: int | None = None
    has_internal_external_split: bool = False
    internal_max_marks: Decimal | None = None
    internal_min_pass: Decimal | None = None
    external_max_marks: Decimal | None = None
    external_min_pass: Decimal | None = None
    sort_order: int | None = None
    components: list[TemplateComponentData]


class TemplateItemRead(TemplateItemCreate):
    id: UUID
    template_id: UUID
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def map_components_json(cls, data):
        """Map components_json from the DB model to the 'components' field."""
        if hasattr(data, "components_json") and not hasattr(data, "components"):
            object.__setattr__(data, "components", data.components_json or [])
        elif isinstance(data, dict) and "components_json" in data and "components" not in data:
            data["components"] = data["components_json"] or []
        return data


# ── Template create / read ───────────────────────────────────────────────────


class TemplateCreate(BaseModel):
    template_name: str = Field(..., max_length=150)
    description: str | None = None
    board: str | None = None
    level: str | None = None
    items: list[TemplateItemCreate]


class TemplateSaveFromExam(BaseModel):
    template_name: str = Field(..., max_length=150)
    description: str | None = None
    exam_id: UUID
    class_id: UUID
    section_id: UUID | None = None


class TemplateRead(BaseModel):
    id: UUID
    template_name: str
    description: str | None = None
    board: str | None = None
    level: str | None = None
    source_exam_id: UUID | None = None
    source_class_id: UUID | None = None
    is_active: bool
    items: list[TemplateItemRead]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TemplateListItem(BaseModel):
    id: UUID
    template_name: str
    description: str | None = None
    board: str | None = None
    level: str | None = None
    item_count: int
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Copy / apply ─────────────────────────────────────────────────────────────


class CopyPatternRequest(BaseModel):
    source_class_id: UUID
    source_section_id: UUID | None = None
    target_class_id: UUID
    target_section_id: UUID | None = None
    skip_missing_subjects: bool = False


class ApplyTemplateRequest(BaseModel):
    template_id: UUID
    target_class_id: UUID
    target_section_id: UUID | None = None
    skip_missing_subjects: bool = False


# ── Subject comparison ───────────────────────────────────────────────────────


class SubjectComparisonItem(BaseModel):
    subject_id: UUID
    subject_name: str | None = None


class SubjectMismatchResponse(BaseModel):
    common_subjects: list[SubjectComparisonItem]
    source_only_subjects: list[SubjectComparisonItem]
    target_only_subjects: list[SubjectComparisonItem]
    can_copy_all: bool
    copyable_count: int


# ── Auto-detect suggestions ─────────────────────────────────────────────────


class PatternSuggestion(BaseModel):
    source_class_id: UUID
    source_section_id: UUID | None = None
    source_class_name: str | None = None
    overlap_subject_count: int
    total_source_configs: int
    total_target_subjects: int
    mismatch: SubjectMismatchResponse


class AutoDetectResponse(BaseModel):
    suggestions: list[PatternSuggestion]
    has_suggestions: bool


# ── Add class-section response ───────────────────────────────────────────────


class AddClassSectionResponse(BaseModel):
    class_section: dict
    auto_detect: AutoDetectResponse
