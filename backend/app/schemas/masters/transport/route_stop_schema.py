from datetime import time
from uuid import UUID

from pydantic import BaseModel, field_validator


def _whole_number_fee(value):
    if value is not None and value != int(value):
        raise ValueError("fees must be a whole number")
    return value


class RouteStopBase(BaseModel):
    route_id: UUID
    name: str
    number: int
    reaching_time: time
    pickup_time: time | None = None
    drop_time: time | None = None
    fees: float | None = None
    is_active: bool = True


class RouteStopCreate(RouteStopBase):
    @field_validator("fees")
    @classmethod
    def fees_whole_number(cls, value):
        return _whole_number_fee(value)


class RouteStopUpdate(BaseModel):
    route_id: UUID | None = None
    name: str | None = None
    number: int | None = None
    reaching_time: time | None = None
    pickup_time: time | None = None
    drop_time: time | None = None
    fees: float | None = None
    is_active: bool | None = None

    model_config = {"from_attributes": True}

    @field_validator("fees")
    @classmethod
    def fees_whole_number(cls, value):
        return _whole_number_fee(value)


class RouteStopOut(RouteStopBase):
    id: UUID
    pickup_time: time | None = None
    drop_time: time | None = None
    route_name: str | None = None

    class Config:
        from_attributes = True


class RouteStopDropdown(BaseModel):
    id: UUID
    name: str
    number: int
    reaching_time: time | None = None
    pickup_time: time | None = None
    drop_time: time | None = None
    fees: float | None = None

    model_config = {"from_attributes": True}
