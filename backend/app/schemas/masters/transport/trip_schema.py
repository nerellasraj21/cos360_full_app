from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class TripBase(BaseModel):
    vehicle_id: UUID
    route_id: UUID
    driver_id: UUID
    trip_number: int

class TripCreate(TripBase):
    pass

class TripUpdate(BaseModel):
    vehicle_id: Optional[UUID] = None
    route_id: Optional[UUID] = None
    driver_id: Optional[UUID] = None
    trip_number: Optional[UUID] = None

    model_config = {"from_attributes": True}

class TripOut(TripBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
