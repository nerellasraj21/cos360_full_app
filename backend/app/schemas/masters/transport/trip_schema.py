from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class TripBase(BaseModel):
    vehicle_id: UUID
    route_id: UUID
    driver_id: UUID
    trip_number: int


class TripCreate(TripBase):
    pass


class TripUpdate(BaseModel):
    vehicle_id: UUID | None = None
    route_id: UUID | None = None
    driver_id: UUID | None = None
    trip_number: UUID | None = None

    model_config = {"from_attributes": True}


class TripOut(TripBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
