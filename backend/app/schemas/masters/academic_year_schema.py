from pydantic import BaseModel
from datetime import date
from typing import Optional

class AcademicYearBase(BaseModel):
    title: str
    start_date: date
    end_date: date
    is_active: bool = True
    
class AcademicYearCreate(AcademicYearBase):
    pass

class AcademicYearUpdate(BaseModel):
    title: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None

class AcademicYearRead(AcademicYearBase):
    id: int    
    model_config = {"from_attributes": True}