from datetime import time
from uuid import UUID

from pydantic import BaseModel


class RouteBase(BaseModel):
    route_name: str
    starting_stop: str
    ending_stop: str
    number_of_stops: int
    route_type: str | None = None  # String field - dropdown value
    trip_type: str | None = None  # String field - dropdown value
    start_time: time
    end_time: time
    is_active: bool = True


class RouteCreate(RouteBase):
    pass


class RouteUpdate(BaseModel):
    route_name: str | None = None
    starting_stop: str | None = None
    ending_stop: str | None = None
    number_of_stops: int | None = None
    route_type: str | None = None
    trip_type: str | None = None
    start_time: time | None = None
    end_time: time | None = None
    is_active: bool | None = None

    model_config = {"from_attributes": True}


class RouteOut(RouteBase):
    id: UUID

    class Config:
        from_attributes = True


class RouteDropdown(BaseModel):
    id: UUID
    route_name: str
    model_config = {"from_attributes": True}
