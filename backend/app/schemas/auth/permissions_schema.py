from uuid import UUID

from pydantic import BaseModel


class RoleMenuPermissionBase(BaseModel):
    role_id: UUID
    menu_id: UUID
    can_view: bool = True
    can_edit: bool = False


class RoleMenuPermissionCreate(RoleMenuPermissionBase):
    pass


class RoleMenuPermissionRead(RoleMenuPermissionBase):
    id: UUID

    model_config = {"from_attributes": True}
