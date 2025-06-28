from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class HolidayBase(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    is_active: bool = False
    academic_year_id: int
    
class HolidayCreate(HolidayBase):
    pass

class HolidayUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    
class HolidayRead(HolidayBase):
    pass

    