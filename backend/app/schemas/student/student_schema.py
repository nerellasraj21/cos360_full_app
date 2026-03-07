from __future__ import annotations

from datetime import date
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, validator


class AdmissionTypeEnum(StrEnum):
    primary = "primary"
    not_primary = "not_primary"


class StudentBase(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str
    is_primary: str | None = "not_primary"
    aadhar_number: str | None = None
    apaar_number: str | None = None
    caste: str | None = None
    sub_caste: str | None = None
    community: str | None = None
    nationality: str | None = "Indian"
    mother_tongue: str | None = "Telugu"
    identification_marks: str | None = None

    @validator("aadhar_number", "apaar_number")
    def validate_aadhar(cls, v):
        if v and (not v.isdigit() or len(v) != 12):
            raise ValueError("Must be a 12-digit number")
        return v


class StudentCreate(StudentBase):
    father: ParentCreate
    mother: ParentCreate


class StudentDetailsOut(StudentBase):
    id: UUID
    first_name: str
    last_name: str


class StudentOut(StudentBase):
    id: UUID
    first_name: str
    last_name: str
    is_active: bool | None = None
    father: ParentOut | None
    mother: ParentOut | None

    model_config = ConfigDict(from_attributes=True)


class StudentDropdown(BaseModel):
    """Student dropdown with display name and admission number"""

    id: str
    display_name: str
    first_name: str
    last_name: str
    admission_number: str


class StudentSimpleDropdown(BaseModel):
    """Simple student dropdown with just ID and name"""

    id: str
    name: str


from app.schemas.masters.parent_schema import ParentCreate  # noqa: E402

StudentCreate.update_forward_refs()

from app.schemas.masters.parent_schema import ParentOut  # noqa: E402

StudentOut.update_forward_refs()
