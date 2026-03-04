from pydantic import BaseModel, Field, confloat
from typing import Optional, Annotated
from datetime import datetime, time
from uuid import UUID


class StudentTransportBase(BaseModel):
    student_id: UUID
    trip_id: UUID
    stop_id: UUID
    fee_term_id: Optional[UUID] = None
    fee_per_term: Annotated[float, confloat(gt=0)] = Field(..., description="Fee must be positive")


class StudentTransportCreate(StudentTransportBase):
    pass


class StudentTransportUpdate(BaseModel):
    trip_id: Optional[UUID] = None
    stop_id: Optional[UUID] = None
    fee_term_id: Optional[UUID] = None
    fee_per_term: Optional[Annotated[float, confloat(gt=0)]] = None


# --- Nested detail schemas for enriched response ---

class VehicleInfo(BaseModel):
    id: UUID
    name: Optional[str] = None
    registration_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    model_config = {"from_attributes": True}


class RouteInfo(BaseModel):
    id: UUID
    route_name: str
    starting_stop: str
    ending_stop: str
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    model_config = {"from_attributes": True}


class TripInfo(BaseModel):
    id: UUID
    trip_number: Optional[int] = None
    route: Optional[RouteInfo] = None
    vehicle: Optional[VehicleInfo] = None
    model_config = {"from_attributes": True}


class StopInfo(BaseModel):
    id: UUID
    name: str
    number: Optional[int] = None
    reaching_time: Optional[time] = None
    fees: Optional[int] = None
    model_config = {"from_attributes": True}


class StudentTransportOut(StudentTransportBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    trip: Optional[TripInfo] = None
    stop: Optional[StopInfo] = None
    model_config = {"from_attributes": True}
