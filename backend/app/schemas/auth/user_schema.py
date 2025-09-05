from pydantic import BaseModel
from uuid import UUID

class UserBase(BaseModel):
    username: str
    is_active: bool = True
    role_id: UUID

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: UUID

    model_config = {"from_attributes": True}
