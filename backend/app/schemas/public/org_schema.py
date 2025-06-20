from pydantic import BaseModel
from typing import Optional

class OrganizationBase(BaseModel):
    name: str
    description: str
    is_active: bool = True
    subdomain: str
    schema_name: str
    
class OrganizationCreate(OrganizationBase):
    plan_id: int
    
class OrganizationUpdate(OrganizationBase):
    id: int
    plan_id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    subdomain: Optional[str] = None
    schema_name: Optional[str] = None
    
class OrganizationRead(OrganizationBase):
    id: int
    plan_id: int
    
    class Config:
        orm_mode = True