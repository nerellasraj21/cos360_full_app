from uuid import UUID

from pydantic import BaseModel


# Caste Schemas
class CasteBase(BaseModel):
    name: str
    code: str | None = None
    is_active: bool = True


class CasteCreate(CasteBase):
    pass


class CasteUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    is_active: bool | None = None


class CasteRead(CasteBase):
    id: UUID
    model_config = {"from_attributes": True}


class CasteDropdown(BaseModel):
    id: UUID
    name: str
    code: str | None = None
    model_config = {"from_attributes": True}


# SubCaste Schemas
class SubCasteBase(BaseModel):
    caste_id: UUID
    name: str
    code: str | None = None
    is_active: bool = True


class SubCasteCreate(SubCasteBase):
    pass


class SubCasteUpdate(BaseModel):
    caste_id: UUID | None = None
    name: str | None = None
    code: str | None = None
    is_active: bool | None = None


class SubCasteRead(SubCasteBase):
    id: UUID
    model_config = {"from_attributes": True}


class SubCasteDropdown(BaseModel):
    id: UUID
    name: str
    code: str | None = None
    caste_id: UUID
    model_config = {"from_attributes": True}
