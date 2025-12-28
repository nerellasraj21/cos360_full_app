from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class ClassSubjectMapBase(BaseModel):
    class_id: UUID
    section_id: UUID
    subject_id: UUID
    academic_year_id: UUID
    exclude_marks: bool = False
    order: Optional[int] = None
    is_active: bool = True

class ClassSubjectMapCreate(ClassSubjectMapBase):
    pass

class ClassSubjectMapUpdate(BaseModel):
    class_id: Optional[UUID] = None
    section_id: Optional[UUID] = None
    subject_id: Optional[UUID] = None
    academic_year_id: Optional[UUID] = None
    exclude_marks: Optional[bool] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

class ClassSubjectMapRead(ClassSubjectMapBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    # Include related data
    class_name: Optional[str] = None
    section_name: Optional[str] = None
    subject_name: Optional[str] = None
    academic_year_name: Optional[str] = None

    model_config = {"from_attributes": True}

class ClassSubjectMapDropdown(BaseModel):
    id: UUID
    class_name: str
    section_name: str
    subject_name: str
    exclude_marks: bool
    order: Optional[int] = None

    model_config = {"from_attributes": True}

# Bulk operation schemas
class SubjectMappingItem(BaseModel):
    """Individual subject mapping item for bulk operations"""
    subject_id: UUID
    exclude_marks: bool = False
    order: Optional[int] = None
    is_active: bool = True

class ClassSubjectMapBulkCreate(BaseModel):
    """Request model for bulk creating/updating class-subject mappings.

    If section_id is None/null, the mappings will be applied to ALL sections in the class.
    """
    class_id: UUID
    section_id: Optional[UUID] = None
    academic_year_id: UUID
    subjects: List[SubjectMappingItem]

class ClassSubjectMapBulkResponse(BaseModel):
    """Response model for bulk operations"""
    success: bool
    message: str
    created_count: int
    updated_count: int
    deactivated_count: int
    mappings: List[ClassSubjectMapRead]