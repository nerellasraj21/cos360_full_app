from pydantic import BaseModel
from typing import Optional
from uuid import UUID

# Caste Schemas
class CasteBase(BaseModel):
    name: str
    code: Optional[str] = None
    is_active: bool = True

class CasteCreate(CasteBase):
    pass

class CasteUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    is_active: Optional[bool] = None

class CasteRead(CasteBase):
    id: UUID
    model_config = {"from_attributes": True}

class CasteDropdown(BaseModel):
    id: UUID
    name: str
    code: Optional[str] = None
    model_config = {"from_attributes": True}

# SubCaste Schemas
class SubCasteBase(BaseModel):
    caste_id: UUID
    name: str
    code: Optional[str] = None
    is_active: bool = True

class SubCasteCreate(SubCasteBase):
    pass

class SubCasteUpdate(BaseModel):
    caste_id: Optional[UUID] = None
    name: Optional[str] = None
    code: Optional[str] = None
    is_active: Optional[bool] = None

class SubCasteRead(SubCasteBase):
    id: UUID
    model_config = {"from_attributes": True}

class SubCasteDropdown(BaseModel):
    id: UUID
    name: str
    code: Optional[str] = None
    caste_id: UUID
    model_config = {"from_attributes": True}
