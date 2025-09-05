from __future__ import annotations
from pydantic import BaseModel, validator
from datetime import date
from typing import Optional, TYPE_CHECKING, ForwardRef
from enum import Enum
from pydantic import ConfigDict
from uuid import UUID

class AdmissionTypeEnum(str, Enum):
    primary = "primary"
    not_primary = "not_primary"

class StudentBase(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str
    is_primary: Optional[str] = "not_primary"
    aadhar_number: Optional[str]
    apaar_number: Optional[str]
    caste: Optional[str]
    sub_caste: Optional[str]
    community: Optional[str]
    nationality: Optional[str] = "Indian"
    mother_tongue: Optional[str] = "Telugu"
    identification_marks: Optional[str]

    @validator("aadhar_number", "apaar_number")
    def validate_aadhar(cls, v):
        if v and (not v.isdigit() or len(v) != 12):
            raise ValueError("Must be a 12-digit number")
        return v


class StudentCreate(StudentBase):
    father: "ParentCreate"
    mother: "ParentCreate"

class StudentDetailsOut(StudentBase):
    id: UUID
    first_name: str
    last_name: str
    
class StudentOut(StudentBase):
    id: UUID
    first_name: str
    last_name: str
    father: Optional["ParentOut"]
    mother: Optional["ParentOut"]

    model_config = ConfigDict(from_attributes=True)

from app.schemas.masters.parent_schema import ParentCreate
StudentCreate.update_forward_refs()

from app.schemas.masters.parent_schema import ParentOut
StudentOut.update_forward_refs()