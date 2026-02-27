from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import datetime


class HallTicketEligibilityRead(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    exam_id: UUID
    student_id: UUID
    class_id: UUID
    section_id: Optional[UUID] = None
    attendance_percent: Optional[Decimal] = None
    attendance_ok: bool
    fee_paid: bool
    attendance_override: bool
    fee_override: bool
    ineligibility_reason: Optional[str] = None
    is_eligible: bool
    hall_ticket_number: Optional[str] = None
    computed_at: Optional[datetime] = None
    # Denormalized student fields — joined at query time
    student_name: Optional[str] = None
    admission_number: Optional[str] = None


class EligibilityOverrideRequest(BaseModel):
    attendance_override: bool = False
    fee_override: bool = False


class ComputeEligibilityResponse(BaseModel):
    exam_id: UUID
    total_students: int
    eligible: int
    ineligible: int


class PublishHallTicketsResponse(BaseModel):
    exam_id: UUID
    hall_ticket_published: bool
    hall_ticket_published_at: Optional[datetime] = None
