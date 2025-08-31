from pydantic import BaseModel, field_validator
from typing import Optional, List
from app.schemas.fee.fee_term_dates_schema import FeeTermDatesRead

class FeeTypeBase(BaseModel):
    type_name: str
    fee_category_id: str  # UUID as string
    fee_status: str = "active"
    fee_term_id: str  # UUID as string
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
    fee_category_id: Optional[str] = None  # UUID as string
    fee_status: Optional[str] = None
    fee_term_id: Optional[str] = None  # UUID as string
    academic_year_id: Optional[int] = None
    
    @field_validator('fee_status')
    def validate_fee_status(cls, v):
        if v is not None and v not in ['active', 'inactive']:
            raise ValueError('fee_status must be either "active" or "inactive"')
        return v

class FeeTypeRead(FeeTypeBase):
    id: str  # UUID as string
    fee_category_name: Optional[str] = None
    fee_term_name: Optional[str] = None
    academic_year_name: Optional[str] = None
    fee_term_dates: List[FeeTermDatesRead] = []
    model_config = {"from_attributes": True}

class FeeTypeDropdown(BaseModel):
    id: str  # UUID as string
    type_name: str
    model_config = {"from_attributes": True}