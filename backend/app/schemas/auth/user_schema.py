from pydantic import BaseModel

class UserBase(BaseModel):
    username: str
    is_active: bool = True
    role_id: int

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int

    model_config = {"from_attributes": True}
