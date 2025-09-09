from pydantic import BaseModel
from typing import Optional
from datetime import time
from uuid import UUID

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
    route_id: Optional[UUID] = None
    name: Optional[str] = None
    number: Optional[int] = None
    reaching_time: Optional[time] = None
    fees: Optional[float] = None
    is_active: Optional[bool] = None

    model_config = {"from_attributes": True}

class RouteStopOut(RouteStopBase):
    id: UUID

    class Config:
        from_attributes = True

class RouteStopDropdown(BaseModel):
    id: UUID
    name: str
    number: int
    reaching_time: Optional[time] = None
    fees: Optional[float] = None
    
    model_config = {"from_attributes": True}
