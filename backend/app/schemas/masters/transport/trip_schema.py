from pydantic import BaseModel
from typing import Optional

class TripBase(BaseModel):
    vehicle_id: int
    route_id: int
    driver_id: int
    trip_number: int

class TripCreate(TripBase):
    pass

class TripUpdate(BaseModel):
    vehicle_id: Optional[int] = None
    route_id: Optional[int] = None
    driver_id: Optional[int] = None
    trip_number: Optional[int] = None

    model_config = {"from_attributes": True}

class TripOut(TripBase):
    id: int

    class Config:
        from_attributes = True
