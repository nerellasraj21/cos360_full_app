from pydantic import BaseModel
from typing import Optional
from datetime import time
from uuid import UUID

class RouteBase(BaseModel):
    route_name: str
    starting_stop: str
    ending_stop: str
    number_of_stops: int
    route_type: str
    trip_type: str
    start_time: time
    end_time: time
    is_active: bool = True

class RouteCreate(RouteBase):
    pass

class RouteUpdate(BaseModel):
    route_name: Optional[str] = None
    starting_stop: Optional[str] = None
    ending_stop: Optional[str] = None
    number_of_stops: Optional[int] = None
    route_type: Optional[str] = None
    trip_type: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    is_active: Optional[bool] = None

    model_config = {"from_attributes": True}

class RouteOut(RouteBase):
    id: UUID

    class Config:
        from_attributes = True

class RouteDropdown(BaseModel):
    id: UUID
    route_name: str
    model_config = {"from_attributes": True}
