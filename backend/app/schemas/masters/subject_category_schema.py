from pydantic import BaseModel

class SubjectCategoryCreate(BaseModel):
    name: str

class SubjectCategoryOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class SubjectCategoryDropdown(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}
