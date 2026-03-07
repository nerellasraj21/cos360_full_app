from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class RouteTypeBase(BaseModel):
    type_name: str
    description: str | None = None
    is_active: bool = True


class RouteTypeCreate(RouteTypeBase):
    pass


class RouteTypeUpdate(BaseModel):
    type_name: str | None = None
    description: str | None = None
    is_active: bool | None = None

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
