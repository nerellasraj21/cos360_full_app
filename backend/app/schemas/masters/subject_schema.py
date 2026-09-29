from uuid import UUID

from pydantic import BaseModel

from app.schemas.masters.subject_category_schema import SubjectCategoryOut


class SubjectBase(BaseModel):
    name: str
    category_id: UUID
    short_code: str | None = None
    is_active: bool = True
    academic_year_id: UUID


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    name: str | None = None
    category_id: UUID | None = None
    short_code: str | None = None
    is_active: bool | None = None
    academic_year_id: UUID | None = None


class SubjectRead(SubjectBase):
    id: UUID
    name: str
    short_code: str | None = None
    is_active: bool = True
    academic_year_id: UUID
    category: SubjectCategoryOut

    model_config = {"from_attributes": True}


class SubjectDropdown(BaseModel):
    id: UUID
    name: str
    model_config = {"from_attributes": True}
