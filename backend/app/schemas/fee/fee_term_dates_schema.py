from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class FeeTermDatesBase(BaseModel):
    fee_term_id: str  # UUID as string
    fee_term_date: datetime  # List of dates
    is_active: bool = True
    
class FeeTermDatesCreate(FeeTermDatesBase):
    pass

class FeeTermDatesUpdate(BaseModel):
    fee_term_id: str  # UUID as string
    fee_term_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    
class FeeTermDatesRead(FeeTermDatesBase):
    fee_term_date_id: str  # UUID as string
    
    model_config = {"from_attributes": True}