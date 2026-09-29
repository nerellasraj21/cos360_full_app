from uuid import UUID

from pydantic import BaseModel


class RoleBase(BaseModel):
    name: str
    description: str | None = None


class RoleCreate(RoleBase):
    pass


class RoleRead(RoleBase):
    id: UUID
    is_system_role: bool | None = None
    is_custom_role: bool | None = None

    model_config = {"from_attributes": True}
