from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class StudentTripBase(BaseModel):
    trip_id: UUID
    student_id: UUID
    stop_id: UUID
    fee_term_id: UUID
    fee_per_term: float

class StudentTripCreate(StudentTripBase):
    pass

class StudentTripUpdate(BaseModel):
    trip_id: Optional[UUID] = None
    student_id: Optional[UUID] = None
    stop_id: Optional[UUID] = None
    fee_term_id: Optional[UUID] = None
    fee_per_term: Optional[float] = None
    is_active: Optional[bool] = None

    model_config = {"from_attributes": True}

class StudentTripOut(StudentTripBase):
    id: UUID

    class Config:
        from_attributes = True
