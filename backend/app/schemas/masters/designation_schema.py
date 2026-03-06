from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class DesignationBase(BaseModel):
    title: str


class DesignationCreate(DesignationBase):
    pass


class DesignationUpdate(BaseModel):
    title: str | None = None


class DesignationRead(DesignationBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    staff_count: int = Field(default=0, description="Number of staff members with this designation")
    model_config = {"from_attributes": True}


class DesignationDropdown(BaseModel):
    id: UUID
    title: str
    model_config = {"from_attributes": True}
