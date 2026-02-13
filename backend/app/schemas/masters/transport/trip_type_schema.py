from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class TripTypeBase(BaseModel):
    type_name: str
    description: Optional[str] = None
    is_active: bool = True

class TripTypeCreate(TripTypeBase):
    pass

class TripTypeUpdate(BaseModel):
    type_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

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
