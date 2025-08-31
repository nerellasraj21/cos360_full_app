from pydantic import BaseModel
from typing import Optional, List
from datetime import date

class FeeTermDatesBase(BaseModel):
    fee_term_date: date
    
class FeeTermDatesCreate(FeeTermDatesBase):
    pass

class FeeTermDatesUpdate(BaseModel):
    fee_term_date: Optional[date] = None
    
class FeeTermDatesRead(FeeTermDatesBase):
    id: str  # UUID as string
    term_id: str  # UUID as string
    
    model_config = {"from_attributes": True}