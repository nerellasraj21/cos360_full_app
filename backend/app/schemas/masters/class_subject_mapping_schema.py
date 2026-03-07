from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ClassSubjectMapBase(BaseModel):
    class_id: UUID
    section_id: UUID | None = None
    subject_id: UUID
    academic_year_id: UUID
    exclude_marks: bool = False
    order: int | None = None
    is_active: bool = True


class ClassSubjectMapCreate(ClassSubjectMapBase):
    pass


class ClassSubjectMapUpdate(BaseModel):
    class_id: UUID | None = None
    section_id: UUID | None = None
    subject_id: UUID | None = None
    academic_year_id: UUID | None = None
    exclude_marks: bool | None = None
    order: int | None = None
    is_active: bool | None = None


class ClassSubjectMapRead(ClassSubjectMapBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    # Include related data
    class_name: str | None = None
    section_name: str | None = None
    subject_name: str | None = None
    academic_year_name: str | None = None

    model_config = {"from_attributes": True}


class ClassSubjectMapDropdown(BaseModel):
    id: UUID
    class_name: str
    section_name: str
    subject_name: str
    exclude_marks: bool
    order: int | None = None

    model_config = {"from_attributes": True}


# Bulk operation schemas
class SubjectMappingItem(BaseModel):
    """Individual subject mapping item for bulk operations"""

    subject_id: UUID
    exclude_marks: bool = False
    order: int | None = None
    is_active: bool = True


class ClassSubjectMapBulkCreate(BaseModel):
    """Request model for bulk creating/updating class-subject mappings.

    If section_id is None/null, the mappings will be applied to ALL sections in the class.
    """

    class_id: UUID
    section_id: UUID | None = None
    academic_year_id: UUID
    subjects: list[SubjectMappingItem]


class ClassSubjectMapBulkResponse(BaseModel):
    """Response model for bulk operations"""

    success: bool
    message: str
    created_count: int
    updated_count: int
    deactivated_count: int
    mappings: list[ClassSubjectMapRead]
