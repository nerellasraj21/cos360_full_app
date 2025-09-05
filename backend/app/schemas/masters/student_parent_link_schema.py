from pydantic import BaseModel
from uuid import UUID

class StudentParentLinkBase(BaseModel):
    student_id: UUID
    parent_id: UUID

class StudentParentLinkCreate(StudentParentLinkBase):
    pass

class StudentParentLinkOut(StudentParentLinkBase):
    id: UUID

    model_config = {"from_attributes": True}
