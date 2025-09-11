from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.schemas.fee.fee_term_dates_schema import FeeTermDatesRead
from app.schemas.fee.fee_term_dates_schema import FeeTermDatesCreate


class FeeTermBase(BaseModel):
    term_name: str
    term_status: str = "active"
    number_of_terms: int
    academic_year_id: UUID
    
class FeeTermCreate(FeeTermBase):
    fee_term_dates: List[FeeTermDatesCreate] = []
    
    @model_validator(mode='after')
    def validate_fee_term_dates_count(self):
        if len(self.fee_term_dates) != self.number_of_terms:
            raise ValueError(f'Number of fee term dates ({len(self.fee_term_dates)}) must match number_of_terms ({self.number_of_terms})')
        return self
    
    @field_validator('fee_term_dates')
    def validate_no_duplicate_dates(cls, v):
        dates = [date.fee_term_date for date in v]
        if len(dates) != len(set(dates)):
            raise ValueError('Duplicate fee term dates are not allowed')
        return v

class FeeTermUpdate(BaseModel):
    term_name: Optional[str] = None
    term_status: Optional[str] = None
    number_of_terms: Optional[int] = None
    academic_year_id: Optional[UUID] = None
    fee_term_dates: Optional[List[FeeTermDatesCreate]] = None
    
    @model_validator(mode='after')
    def validate_fee_term_dates_count(self):
        if self.fee_term_dates is not None and self.number_of_terms is not None:
            if len(self.fee_term_dates) != self.number_of_terms:
                raise ValueError(f'Number of fee term dates ({len(self.fee_term_dates)}) must match number_of_terms ({self.number_of_terms})')
        return self
    
    @field_validator('fee_term_dates')
    def validate_no_duplicate_dates(cls, v):
        if v is not None:
            dates = [date.fee_term_date for date in v]
            if len(dates) != len(set(dates)):
                raise ValueError('Duplicate fee term dates are not allowed')
        return v
    
class FeeTermRead(FeeTermBase):
    id: UUID
    fee_term_dates: List[FeeTermDatesRead] = []
    model_config = {"from_attributes": True}

class FeeTermDropdown(BaseModel):
    id: UUID
    term_name: str
    number_of_terms: int
    model_config = {"from_attributes": True}