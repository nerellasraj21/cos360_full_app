from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class RouteTypeBase(BaseModel):
    type_name: str
    description: Optional[str] = None
    is_active: bool = True

class RouteTypeCreate(RouteTypeBase):
    pass

class RouteTypeUpdate(BaseModel):
    type_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

    model_config = {"from_attributes": True}

class RouteTypeOut(RouteTypeBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RouteTypeDropdown(BaseModel):
    id: UUID
    type_name: str

    model_config = {"from_attributes": True}
