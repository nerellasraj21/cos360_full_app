from uuid import UUID

from pydantic import BaseModel, field_validator

from app.schemas.fee.fee_term_dates_schema import FeeTermDatesRead


class FeeTypeBase(BaseModel):
    type_name: str
    fee_category_id: UUID
    fee_status: str = "active"
    fee_term_id: UUID
    academic_year_id: UUID

    @field_validator("fee_status")
    def validate_fee_status(cls, v):
        if v not in ["active", "inactive"]:
            raise ValueError('fee_status must be either "active" or "inactive"')
        return v


class FeeTypeCreate(FeeTypeBase):
    pass


class FeeTypeUpdate(BaseModel):
    type_name: str | None = None
    fee_category_id: UUID | None = None
    fee_status: str | None = None
    fee_term_id: UUID | None = None
    academic_year_id: UUID | None = None

    @field_validator("fee_status")
    def validate_fee_status(cls, v):
        if v is not None and v not in ["active", "inactive"]:
            raise ValueError('fee_status must be either "active" or "inactive"')
        return v


class FeeTypeRead(FeeTypeBase):
    id: UUID
    fee_category_name: str | None = None
    fee_term_name: str | None = None
    academic_year_name: str | None = None
    fee_term_dates: list[FeeTermDatesRead] = []
    model_config = {"from_attributes": True}


class FeeTypeDropdown(BaseModel):
    id: UUID
    type_name: str
    model_config = {"from_attributes": True}
