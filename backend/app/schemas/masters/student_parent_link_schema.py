from uuid import UUID

from pydantic import BaseModel


class StudentParentLinkBase(BaseModel):
    student_id: UUID
    parent_id: UUID


class StudentParentLinkCreate(StudentParentLinkBase):
    pass


class StudentParentLinkOut(StudentParentLinkBase):
    id: UUID

    model_config = {"from_attributes": True}
