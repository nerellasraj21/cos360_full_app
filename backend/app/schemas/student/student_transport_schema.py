from pydantic import BaseModel, Field, conint, confloat
from typing import Optional
from datetime import datetime
from typing import Annotated
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

class StudentTransportOut(StudentTransportBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
