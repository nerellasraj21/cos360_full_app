from pydantic import BaseModel
from typing import Optional

class StudentTripBase(BaseModel):
    trip_id: int
    student_id: int
    stop_id: int
    fee_term_id: int
    fee_per_term: float

class StudentTripCreate(StudentTripBase):
    pass

class StudentTripUpdate(BaseModel):
    trip_id: Optional[int] = None
    student_id: Optional[int] = None
    stop_id: Optional[int] = None
    fee_term_id: Optional[int] = None
    fee_per_term: Optional[float] = None
    is_active: Optional[bool] = None

    model_config = {"from_attributes": True}

class StudentTripOut(StudentTripBase):
    id: int

    class Config:
        from_attributes = True
