from pydantic import BaseModel
from typing import Optional

class SectionBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class SectionCreate(SectionBase):
    pass  # class_id removed

class SectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    # class_id removed or made optional if needed

class SectionRead(SectionBase):
    id: int
    class_id: int

    model_config = {"from_attributes": True}
