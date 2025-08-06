from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.fee.fee_term_dates_schema import FeeTermDatesRead
from app.schemas.fee.fee_term_dates_schema import FeeTermDatesCreate


class FeeTermBase(BaseModel):
    name: str
    is_active: bool = True
    number_of_terms: int
    academic_year_id: int
    
class FeeTermCreate(FeeTermBase):
    fee_term_dates: Optional[List[FeeTermDatesCreate]] = []

class FeeTermUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    number_of_terms: Optional[int] = None
    academic_year_id: Optional[int] = None
    
class FeeTermRead(FeeTermBase):
    id: str  # UUID as string
    fee_term_dates: List[FeeTermDatesRead] = [] # Use read schema for response
    model_config = {"from_attributes": True}