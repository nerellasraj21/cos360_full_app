from pydantic import BaseModel
from uuid import UUID

class PlanMenuBase(BaseModel):
    plan_id: UUID
    menu_id: UUID
    is_active: bool = True
    
class PlanMenuCreate(PlanMenuBase):
    pass

class PlanMenuUpdate(PlanMenuBase):
    id: UUID
    plan_id: UUID
    menu_id: UUID
    is_active: bool = True
    
class PlanMenuRead(PlanMenuBase):
    id: UUID
    
    model_config = {"from_attributes": True}