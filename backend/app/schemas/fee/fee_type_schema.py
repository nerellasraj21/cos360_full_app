from pydantic import BaseModel, field_validator
from typing import Optional, List
from uuid import UUID
from app.schemas.fee.fee_term_dates_schema import FeeTermDatesRead

class FeeTypeBase(BaseModel):
    type_name: str
    fee_category_id: UUID
    fee_status: str = "active"
    fee_term_id: UUID
    academic_year_id: int
    
    @field_validator('fee_status')
    def validate_fee_status(cls, v):
        if v not in ['active', 'inactive']:
            raise ValueError('fee_status must be either "active" or "inactive"')
        return v

class FeeTypeCreate(FeeTypeBase):
    pass

class FeeTypeUpdate(BaseModel):
    type_name: Optional[str] = None
    fee_category_id: Optional[UUID] = None
    fee_status: Optional[str] = None
    fee_term_id: Optional[UUID] = None
    academic_year_id: Optional[int] = None
    
    @field_validator('fee_status')
    def validate_fee_status(cls, v):
        if v is not None and v not in ['active', 'inactive']:
            raise ValueError('fee_status must be either "active" or "inactive"')
        return v

class FeeTypeRead(FeeTypeBase):
    id: UUID
    fee_category_name: Optional[str] = None
    fee_term_name: Optional[str] = None
    academic_year_name: Optional[str] = None
    fee_term_dates: List[FeeTermDatesRead] = []
    model_config = {"from_attributes": True}

class FeeTypeDropdown(BaseModel):
    id: UUID
    type_name: str
    model_config = {"from_attributes": True}