from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class ExamSettingsBase(BaseModel):
    default_board: str | None = None
    custom_board_name: str | None = None
    hall_ticket_min_attendance: Decimal | None = Field(None, ge=0, le=100)
    hall_ticket_min_fee_paid_pct: Decimal | None = Field(None, ge=0, le=100)
    exam_fee_type_id: UUID | None = None
    grace_max_per_subject: int | None = Field(None, ge=0, le=100)
    grace_max_subjects: int | None = Field(None, ge=0, le=50)
    grace_auto_apply: bool = False
    reconduct_max_failed_subjects: int = Field(2, ge=0)


class ExamSettingsUpdate(ExamSettingsBase):
    pass


class ExamSettingsRead(ExamSettingsBase):
    model_config = {"from_attributes": True}
    id: UUID
