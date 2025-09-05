from pydantic import BaseModel
from uuid import UUID

class SubjectCategoryCreate(BaseModel):
    name: str

class SubjectCategoryOut(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True

class SubjectCategoryDropdown(BaseModel):
    id: UUID
    name: str
    model_config = {"from_attributes": True}
