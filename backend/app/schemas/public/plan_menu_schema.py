from pydantic import BaseModel

class PlanMenuBase(BaseModel):
    plan_id: int
    menu_id: int
    is_active: bool = True
    
class PlanMenuCreate(PlanMenuBase):
    pass

class PlanMenuUpdate(PlanMenuBase):
    id: int
    plan_id: int
    menu_id: int
    is_active: bool = True
    
class PlanMenuRead(PlanMenuBase):
    id: int
    
    model_config = {"from_attributes": True}