from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID

class HolidayBase(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    is_active: bool = False
    academic_year_id: UUID
    
class HolidayCreate(HolidayBase):
    pass

class HolidayUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    
class HolidayRead(HolidayBase):
    id: UUID
    model_config = {"from_attributes": True}

class HolidayDropdown(BaseModel):
    id: UUID
    name: str
    model_config = {"from_attributes": True}