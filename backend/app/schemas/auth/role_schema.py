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

    model_config = {"from_attributes": True}
