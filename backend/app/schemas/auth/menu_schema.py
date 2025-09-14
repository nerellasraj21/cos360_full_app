from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class MenuBase(BaseModel):
    name: str
    url: Optional[str] = None
    level: str  # L0, L1, L2
    parent_id: Optional[UUID] = None

class MenuCreate(MenuBase):
    pass

class MenuRead(MenuBase):
    id: UUID

    model_config = {"from_attributes": True}
