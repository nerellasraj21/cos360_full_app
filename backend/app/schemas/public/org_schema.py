from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class OrganizationBase(BaseModel):
    name: str
    description: str
    is_active: bool = True
    subdomain: str
    schema_name: str
    
class OrganizationCreate(OrganizationBase):
    plan_id: UUID
    
class OrganizationUpdate(OrganizationBase):
    id: UUID
    plan_id: Optional[UUID] = None
    name: Optional[str] = None
    description: Optional[str] = None
    subdomain: Optional[str] = None
    schema_name: Optional[str] = None
    
class OrganizationRead(OrganizationBase):
    id: UUID
    plan_id: UUID
    
    model_config = {"from_attributes": True} 