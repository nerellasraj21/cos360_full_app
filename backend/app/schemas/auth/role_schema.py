from typing import Optional
from pydantic import BaseModel
from uuid import UUID

class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None

class RoleCreate(RoleBase):
    pass

class RoleRead(RoleBase):
    id: UUID
    is_system_role: Optional[bool] = None
    is_custom_role: Optional[bool] = None

    model_config = {"from_attributes": True}
