from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class HallTicketEligibilityRead(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    exam_id: UUID
    student_id: UUID
    class_id: UUID
    section_id: UUID | None = None
    attendance_percent: Decimal | None = None
    attendance_ok: bool
    fee_paid: bool
    attendance_override: bool
    fee_override: bool
    ineligibility_reason: str | None = None
    is_eligible: bool
    hall_ticket_number: str | None = None
    computed_at: datetime | None = None
    # Denormalized student fields — joined at query time
    student_name: str | None = None
    admission_number: str | None = None


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
    hall_ticket_published_at: datetime | None = None
