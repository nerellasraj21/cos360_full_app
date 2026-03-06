from datetime import time
from uuid import UUID

from pydantic import BaseModel


class RouteStopBase(BaseModel):
    route_id: UUID
    name: str
    number: int
    reaching_time: time
    fees: float
    is_active: bool = True


class RouteStopCreate(RouteStopBase):
    pass


class RouteStopUpdate(BaseModel):
    route_id: UUID | None = None
    name: str | None = None
    number: int | None = None
    reaching_time: time | None = None
    fees: float | None = None
    is_active: bool | None = None

    model_config = {"from_attributes": True}


class RouteStopOut(RouteStopBase):
    id: UUID
    route_name: str | None = None

    class Config:
        from_attributes = True


class RouteStopDropdown(BaseModel):
    id: UUID
    name: str
    number: int
    reaching_time: time | None = None
    fees: float | None = None

    model_config = {"from_attributes": True}
