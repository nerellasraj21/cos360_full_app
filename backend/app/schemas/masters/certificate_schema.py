from pydantic import BaseModel, Field
from datetime import date
from typing import Optional
from enum import Enum
from app.schemas.masters.admission_schema import StudentAdmissionResponse


class CertificateType(str, Enum):
    bonafide = "Bonafide"
    transfer = "Transfer"
    conduct = "Conduct"

class CertificateIssueBase(BaseModel):
    student_id: int = Field(..., gt=0)
    certificate_type: CertificateType
    issue_date: Optional[date] = Field(default_factory=date.today)
    description: Optional[str] = Field(None, max_length=255)
    certificate_file: Optional[str] = Field(None, description="Path or filename of uploaded certificate")

    class Config:
        orm_mode = True

class CertificateIssueCreate(CertificateIssueBase):
    pass


class CertificateIssueUpdate(BaseModel):
    certificate_type: Optional[CertificateType]
    issue_date: Optional[date]
    description: Optional[str] = Field(None, max_length=255)
    certificate_file: Optional[str]

    class Config:
        orm_mode = True

class CertificateIssueOut(CertificateIssueBase):
    id: int
    student: Optional[StudentAdmissionResponse]

    class Config:
        orm_mode = True

class CertificateFileResponse(BaseModel):
    certificate_type: str
    issue_date: Optional[date]
    file_path: Optional[str]
    exists_on_disk: bool

    class Config:
        orm_mode = True
