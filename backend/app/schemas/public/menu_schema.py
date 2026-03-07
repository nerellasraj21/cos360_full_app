from pydantic import BaseModel


class MenuBase(BaseModel):
    name: str
    url: str
    level: str
    parent_id: int | None = None


class MenuCreate(MenuBase):
    pass


class MenuUpdate(MenuBase):
    id: int
    name: str | None = None
    url: str | None = None
    level: str | None = None
    parent_id: int | None = None


class MenuRead(MenuBase):
    id: int

    model_config = {"from_attributes": True}
