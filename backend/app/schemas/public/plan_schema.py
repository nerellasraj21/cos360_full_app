from pydantic import BaseModel


class PlanBase(BaseModel):
    name: str
    description: str
    is_active: bool = True


class PlanCreate(PlanBase):
    pass


class PlanUpdate(PlanBase):
    id: int
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class PlanRead(PlanBase):
    id: int

    class config:
        orm_mode = True
