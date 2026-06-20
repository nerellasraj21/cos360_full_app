from datetime import datetime, time
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field, confloat


class StudentTransportBase(BaseModel):
    student_id: UUID
    trip_id: UUID
    stop_id: UUID
    fee_per_term: Annotated[float, confloat(gt=0)] = Field(..., description="Fee must be positive")
    pricing_id: UUID | None = None


class StudentTransportCreate(StudentTransportBase):
    fee_per_term: float | None = None  # auto-filled from stop.fees if not provided


class StudentTransportUpdate(BaseModel):
    trip_id: UUID | None = None
    stop_id: UUID | None = None
    fee_per_term: Annotated[float, confloat(gt=0)] | None = None
    pricing_id: UUID | None = None


# --- Nested detail schemas for enriched response ---


class VehicleInfo(BaseModel):
    id: UUID
    name: str | None = None
    registration_number: str | None = None
    vehicle_type: str | None = None
    model_config = {"from_attributes": True}


class RouteInfo(BaseModel):
    id: UUID
    route_name: str
    starting_stop: str
    ending_stop: str
    start_time: time | None = None
    end_time: time | None = None
    model_config = {"from_attributes": True}


class TripInfo(BaseModel):
    id: UUID
    trip_number: int | None = None
    route: RouteInfo | None = None
    vehicle: VehicleInfo | None = None
    model_config = {"from_attributes": True}


class StopInfo(BaseModel):
    id: UUID
    name: str
    number: int | None = None
    reaching_time: time | None = None
    pickup_time: time | None = None
    drop_time: time | None = None
    fees: int | None = None
    model_config = {"from_attributes": True}


class StudentInfo(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    model_config = {"from_attributes": True}


class PricingInfo(BaseModel):
    id: UUID
    billing_cycle: str
    cycle_name: str
    amount: Decimal
    model_config = {"from_attributes": True}


class StudentTransportOut(StudentTransportBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    trip: TripInfo | None = None
    stop: StopInfo | None = None
    student: StudentInfo | None = None
    pricing: PricingInfo | None = None
    model_config = {"from_attributes": True}
