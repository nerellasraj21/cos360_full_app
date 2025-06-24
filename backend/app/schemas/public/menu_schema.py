from pydantic import BaseModel
from typing import Optional

class MenuBase(BaseModel):
    name: str
    url: str
    level: str
    parent_id: Optional[int] = None
    
class MenuCreate(MenuBase):
    pass

class MenuUpdate(MenuBase):
    id: int
    name: Optional[str] = None
    url: Optional[str] = None
    level: Optional[str] = None
    parent_id: Optional[int] = None
    
class MenuRead(MenuBase):
    id: int
    
    class Config:
        orm_mode = True 