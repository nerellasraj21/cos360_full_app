from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class TripTypeBase(BaseModel):
    type_name: str
    description: str | None = None
    is_active: bool = True


class TripTypeCreate(TripTypeBase):
    pass


class TripTypeUpdate(BaseModel):
    type_name: str | None = None
    description: str | None = None
    is_active: bool | None = None

    model_config = {"from_attributes": True}


class TripTypeOut(TripTypeBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TripTypeDropdown(BaseModel):
    id: UUID
    type_name: str

    model_config = {"from_attributes": True}
