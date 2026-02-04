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
    aadhar_number: Optional[str] = None
    apaar_number: Optional[str] = None
    caste: Optional[str] = None
    sub_caste: Optional[str] = None
    community: Optional[str] = None
    nationality: Optional[str] = "Indian"
    mother_tongue: Optional[str] = "Telugu"
    identification_marks: Optional[str] = None

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
    is_active: Optional[bool] = None
    father: Optional["ParentOut"]
    mother: Optional["ParentOut"]

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

from app.schemas.masters.parent_schema import ParentCreate
StudentCreate.update_forward_refs()

from app.schemas.masters.parent_schema import ParentOut
StudentOut.update_forward_refs()