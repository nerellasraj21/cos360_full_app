from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.schemas.fee.fee_term_dates_schema import FeeTermDatesRead
from app.schemas.fee.fee_term_dates_schema import FeeTermDatesCreate


class FeeTermBase(BaseModel):
    term_name: str
    term_status: str = "active"
    number_of_terms: int
    academic_year_id: int
    
class FeeTermCreate(FeeTermBase):
    fee_term_dates: List[FeeTermDatesCreate] = []
    
    @field_validator('fee_term_dates')
    def validate_fee_term_dates_count(cls, v, values):
        if 'number_of_terms' in values and len(v) != values['number_of_terms']:
            raise ValueError(f'Number of fee term dates ({len(v)}) must match number_of_terms ({values["number_of_terms"]})')
        return v
    
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
    academic_year_id: Optional[int] = None
    fee_term_dates: Optional[List[FeeTermDatesCreate]] = None
    
    @field_validator('fee_term_dates')
    def validate_fee_term_dates_count(cls, v, values):
        if v is not None and 'number_of_terms' in values and values['number_of_terms'] is not None:
            if len(v) != values['number_of_terms']:
                raise ValueError(f'Number of fee term dates ({len(v)}) must match number_of_terms ({values["number_of_terms"]})')
        return v
    
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