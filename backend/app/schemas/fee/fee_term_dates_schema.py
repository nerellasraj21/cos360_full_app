from datetime import date
from uuid import UUID

from pydantic import BaseModel


class FeeTermDatesBase(BaseModel):
    fee_term_date: date


class FeeTermDatesCreate(FeeTermDatesBase):
    pass


class FeeTermDatesUpdate(BaseModel):
    fee_term_date: date | None = None


class FeeTermDatesRead(FeeTermDatesBase):
    id: UUID
    term_id: UUID

    model_config = {"from_attributes": True}
