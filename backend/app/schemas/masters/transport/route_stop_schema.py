from pydantic import BaseModel
from typing import Optional
from datetime import time

class RouteStopBase(BaseModel):
    route_id: int
    name: str
    number: int
    time: time
    fees: float
    is_active: bool = True

class RouteStopCreate(RouteStopBase):
    pass

class RouteStopUpdate(BaseModel):
    route_id: Optional[int] = None
    name: Optional[str] = None
    number: Optional[int] = None
    time: Optional[time] = None
    fees: Optional[float] = None
    is_active: Optional[bool] = None

    model_config = {"from_attributes": True}

class RouteStopOut(RouteStopBase):
    id: int

    class Config:
        from_attributes = True
