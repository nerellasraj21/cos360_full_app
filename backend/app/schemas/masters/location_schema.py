from pydantic import BaseModel
from typing import Optional
from uuid import UUID

# State Schemas
class StateBase(BaseModel):
    name: str
    code: Optional[str] = None
    is_active: bool = True

class StateCreate(StateBase):
    pass

class StateUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    is_active: Optional[bool] = None

class StateRead(StateBase):
    id: UUID
    model_config = {"from_attributes": True}

class StateDropdown(BaseModel):
    id: UUID
    name: str
    code: Optional[str] = None
    model_config = {"from_attributes": True}

# District Schemas
class DistrictBase(BaseModel):
    state_id: UUID
    name: str
    code: Optional[str] = None
    is_active: bool = True

class DistrictCreate(DistrictBase):
    pass

class DistrictUpdate(BaseModel):
    state_id: Optional[UUID] = None
    name: Optional[str] = None
    code: Optional[str] = None
    is_active: Optional[bool] = None

class DistrictRead(DistrictBase):
    id: UUID
    model_config = {"from_attributes": True}

class DistrictDropdown(BaseModel):
    id: UUID
    name: str
    code: Optional[str] = None
    state_id: UUID
    model_config = {"from_attributes": True}

# Mandal Schemas
class MandalBase(BaseModel):
    district_id: UUID
    name: str
    is_active: bool = True

class MandalCreate(MandalBase):
    pass

class MandalUpdate(BaseModel):
    district_id: Optional[UUID] = None
    name: Optional[str] = None
    is_active: Optional[bool] = None

class MandalRead(MandalBase):
    id: UUID
    model_config = {"from_attributes": True}

class MandalDropdown(BaseModel):
    id: UUID
    name: str
    district_id: UUID
    model_config = {"from_attributes": True}
