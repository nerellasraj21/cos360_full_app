from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ClassBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True
    short_code: str 

class ClassCreate(ClassBase):
    pass

class ClassUpdate(ClassBase):
    pass

class ClassOut(ClassBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True