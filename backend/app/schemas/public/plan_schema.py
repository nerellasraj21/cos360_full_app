from typing import Optional
from pydantic import BaseModel

class PlanBase(BaseModel):
    name: str
    description: str
    is_active: bool = True
    
class PlanCreate(PlanBase):
    pass

class PlanUpdate(PlanBase):
    id: int
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    
class PlanRead(PlanBase):
    id: int
    
    class config:
        orm_mode = True

