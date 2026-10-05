from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.masters.subject_category_schema import SubjectCategoryOut


class SubjectBase(BaseModel):
    name: str
    category_id: UUID
    short_code: str | None = None
    is_active: bool = True
    academic_year_id: UUID


class SubjectCreate(SubjectBase):
    name: str = Field(min_length=1, max_length=50)
    short_code: str | None = Field(default=None, max_length=10)


class SubjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    category_id: UUID | None = None
    short_code: str | None = Field(default=None, max_length=10)
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
