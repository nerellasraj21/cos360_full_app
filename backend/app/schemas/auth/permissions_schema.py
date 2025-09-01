from pydantic import BaseModel

class RoleMenuPermissionBase(BaseModel):
    role_id: int
    menu_id: int
    can_view: bool = True
    can_edit: bool = False

class RoleMenuPermissionCreate(RoleMenuPermissionBase):
    pass

class RoleMenuPermissionRead(RoleMenuPermissionBase):
    id: int

    model_config = {"from_attributes": True}
