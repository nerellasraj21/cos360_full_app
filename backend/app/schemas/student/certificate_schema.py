from pydantic import BaseModel, Field
from datetime import date
from typing import Optional
from enum import Enum
from uuid import UUID
from app.schemas.student.admission_schema import StudentAdmissionResponse
from pydantic import ConfigDict


# class CertificateType(str, Enum):
#     bonafide = "Bonafide"
#     transfer = "Transfer"
#     conduct = "Conduct"

class CertificateIssueBase(BaseModel):
    student_id: UUID
    certificate_type_id: UUID
    issue_date: Optional[date] = Field(default_factory=date.today)
    description: Optional[str] = Field(None, max_length=255)
    certificate_file: Optional[str] = Field(None, description="Path or filename of uploaded certificate")

    model_config = {"from_attributes": True}

class CertificateIssueCreate(CertificateIssueBase):
    pass


class CertificateIssueUpdate(BaseModel):
    certificate_type_id: UUID
    issue_date: Optional[date]
    description: Optional[str] = Field(None, max_length=255)
    certificate_file: Optional[str]

    model_config = {"from_attributes": True}

class CertificateIssueOut(CertificateIssueBase):
    id: UUID
    student: Optional[StudentAdmissionResponse]

    model_config = ConfigDict(from_attributes=True)

class CertificateFileResponse(BaseModel):
    certificate_type_id: UUID
    issue_date: Optional[date]
    file_path: Optional[str]
    exists_on_disk: bool

    model_config = {"from_attributes": True}
