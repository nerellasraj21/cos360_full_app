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


class ChildStudentOut(BaseModel):
    """Student summary returned by GET /student-parent-links/my-children"""

    id: str
    first_name: str
    last_name: str
    name: str
    is_active: bool | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    admission_number: str | None = None
    academic_year_id: str | None = None
    academic_year: str | None = None
    class_id: str | None = None
    class_name: str | None = None
    section_id: str | None = None
    section_name: str | None = None
