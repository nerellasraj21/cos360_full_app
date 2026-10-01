from uuid import UUID

from pydantic import BaseModel


class OrganizationBase(BaseModel):
    name: str
    description: str
    is_active: bool = True
    subdomain: str


class OrganizationCreate(OrganizationBase):
    plan_id: UUID


class OrganizationUpdate(OrganizationBase):
    id: UUID
    plan_id: UUID | None = None
    name: str | None = None
    description: str | None = None
    subdomain: str | None = None


class OrganizationRead(OrganizationBase):
    id: UUID
    plan_id: UUID

    model_config = {"from_attributes": True}
