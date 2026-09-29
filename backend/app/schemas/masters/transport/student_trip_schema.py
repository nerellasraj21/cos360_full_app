from uuid import UUID

from pydantic import BaseModel


class StudentTripBase(BaseModel):
    trip_id: UUID
    student_id: UUID
    stop_id: UUID
    fee_term_id: UUID
    fee_per_term: float


class StudentTripCreate(StudentTripBase):
    pass


class StudentTripUpdate(BaseModel):
    trip_id: UUID | None = None
    student_id: UUID | None = None
    stop_id: UUID | None = None
    fee_term_id: UUID | None = None
    fee_per_term: float | None = None
    is_active: bool | None = None

    model_config = {"from_attributes": True}


class StudentTripOut(StudentTripBase):
    id: UUID

    class Config:
        from_attributes = True
