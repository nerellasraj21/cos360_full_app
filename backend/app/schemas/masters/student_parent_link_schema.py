from pydantic import BaseModel

class StudentParentLinkBase(BaseModel):
    student_id: int
    parent_id: int

class StudentParentLinkCreate(StudentParentLinkBase):
    pass

class StudentParentLinkOut(StudentParentLinkBase):
    id: int

    model_config = {"from_attributes": True}
