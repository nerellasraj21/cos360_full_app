from uuid import UUID

from pydantic import BaseModel


class FeeCategoryBase(BaseModel):
    category_name: str
    category_status: str = "active"
    academic_year_id: UUID


class FeeCategoryCreate(FeeCategoryBase):
    pass


class FeeCategoryUpdate(BaseModel):
    category_name: str | None = None
    category_status: str | None = None
    academic_year_id: UUID | None = None


class FeeCategoryRead(BaseModel):
    id: UUID
    category_name: str
    category_status: str
    academic_year_id: UUID
    academic_year_title: str | None = None
    model_config = {"from_attributes": True}


class FeeCategoryDropdown(BaseModel):
    id: UUID
    category_name: str
    model_config = {"from_attributes": True}
