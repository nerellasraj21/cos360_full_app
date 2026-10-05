from uuid import UUID

from pydantic import BaseModel, field_validator


class SubjectCategoryBase(BaseModel):
    name: str


def _clean_category_name(value: str | None) -> str | None:
    if value is None:
        return value
    value = value.strip()
    if not value:
        raise ValueError("Category name cannot be empty")
    if len(value) > 100:
        raise ValueError("Category name cannot exceed 100 characters")
    return value


class SubjectCategoryCreate(SubjectCategoryBase):
    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        return _clean_category_name(v)


class SubjectCategoryUpdate(BaseModel):
    name: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        return _clean_category_name(v)


class SubjectCategoryOut(SubjectCategoryBase):
    id: UUID
    model_config = {"from_attributes": True}


# Alias for consistency (keeping both for backward compatibility)
class SubjectCategoryRead(SubjectCategoryOut):
    pass


class SubjectCategoryDropdown(BaseModel):
    id: UUID
    name: str
    model_config = {"from_attributes": True}
