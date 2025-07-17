from pydantic import BaseModel, Field, conint, confloat
from typing import Optional
from datetime import datetime
from typing import Annotated

class StudentTransportBase(BaseModel):
    student_id: int
    trip_id: int
    stop_id: int
    fee_term_id: Optional[int] = None
    fee_per_term: Annotated[float, confloat(gt=0)] = Field(..., description="Fee must be positive")

class StudentTransportCreate(StudentTransportBase):
    pass

class StudentTransportUpdate(BaseModel):
    trip_id: Optional[int]
    stop_id: Optional[int]
    fee_term_id: Optional[int]
    fee_per_term: Optional[Annotated[float, confloat(gt=0)]]

class StudentTransportOut(StudentTransportBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
