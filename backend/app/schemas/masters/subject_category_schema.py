from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class SubjectCategoryBase(BaseModel):
    name: str

class SubjectCategoryCreate(SubjectCategoryBase):
    pass

class SubjectCategoryUpdate(BaseModel):
    name: Optional[str] = None

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
