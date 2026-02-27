from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from decimal import Decimal


class ExamSettingsBase(BaseModel):
    default_board: Optional[str] = None
    custom_board_name: Optional[str] = None
    hall_ticket_min_attendance: Optional[Decimal] = Field(None, ge=0, le=100)
    exam_fee_type_id: Optional[UUID] = None
    grace_max_per_subject: Optional[int] = Field(None, ge=0, le=100)
    grace_max_subjects: Optional[int] = Field(None, ge=0, le=50)
    grace_auto_apply: bool = False
    reconduct_max_failed_subjects: int = Field(2, ge=0)


class ExamSettingsUpdate(ExamSettingsBase):
    pass


class ExamSettingsRead(ExamSettingsBase):
    model_config = {"from_attributes": True}
    id: UUID
