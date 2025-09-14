from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class DesignationBase(BaseModel):
    title: str

class DesignationCreate(DesignationBase):
    pass

class DesignationUpdate(BaseModel):
    title: Optional[str] = None

class DesignationRead(DesignationBase):
    id: UUID
    model_config = {"from_attributes": True}

class DesignationDropdown(BaseModel):
    id: UUID
    title: str
    model_config = {"from_attributes": True}