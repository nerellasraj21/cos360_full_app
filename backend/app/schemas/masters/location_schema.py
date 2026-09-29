from uuid import UUID

from pydantic import BaseModel


# State Schemas
class StateBase(BaseModel):
    name: str
    code: str | None = None
    is_active: bool = True


class StateCreate(StateBase):
    pass


class StateUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    is_active: bool | None = None


class StateRead(StateBase):
    id: UUID
    model_config = {"from_attributes": True}


class StateDropdown(BaseModel):
    id: UUID
    name: str
    code: str | None = None
    model_config = {"from_attributes": True}


# District Schemas
class DistrictBase(BaseModel):
    state_id: UUID
    name: str
    code: str | None = None
    is_active: bool = True


class DistrictCreate(DistrictBase):
    pass


class DistrictUpdate(BaseModel):
    state_id: UUID | None = None
    name: str | None = None
    code: str | None = None
    is_active: bool | None = None


class DistrictRead(DistrictBase):
    id: UUID
    model_config = {"from_attributes": True}


class DistrictDropdown(BaseModel):
    id: UUID
    name: str
    code: str | None = None
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
    district_id: UUID | None = None
    name: str | None = None
    is_active: bool | None = None


class MandalRead(MandalBase):
    id: UUID
    model_config = {"from_attributes": True}


class MandalDropdown(BaseModel):
    id: UUID
    name: str
    district_id: UUID
    model_config = {"from_attributes": True}
