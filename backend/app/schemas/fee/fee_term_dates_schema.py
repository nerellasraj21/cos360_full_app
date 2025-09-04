from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from uuid import UUID

class FeeTermDatesBase(BaseModel):
    fee_term_date: date
    
class FeeTermDatesCreate(FeeTermDatesBase):
    pass

class FeeTermDatesUpdate(BaseModel):
    fee_term_date: Optional[date] = None
    
class FeeTermDatesRead(FeeTermDatesBase):
    id: UUID
    term_id: UUID
    
    model_config = {"from_attributes": True}