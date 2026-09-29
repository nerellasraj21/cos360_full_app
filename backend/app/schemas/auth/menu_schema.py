from uuid import UUID

from pydantic import BaseModel


class MenuBase(BaseModel):
    name: str
    url: str | None = None
    level: str  # L0, L1, L2
    parent_id: UUID | None = None


class MenuCreate(MenuBase):
    pass


class MenuRead(MenuBase):
    id: UUID

    model_config = {"from_attributes": True}
