from pydantic import BaseModel
from typing import Optional

class MenuBase(BaseModel):
    name: str
    url: Optional[str] = None
    level: str  # L0, L1, L2
    parent_id: Optional[int] = None

class MenuCreate(MenuBase):
    pass

class MenuRead(MenuBase):
    id: int

    class Config:
        orm_mode = True
