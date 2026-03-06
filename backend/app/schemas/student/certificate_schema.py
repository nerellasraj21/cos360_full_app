from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.student.admission_schema import StudentAdmissionResponse

# class CertificateType(str, Enum):
#     bonafide = "Bonafide"
#     transfer = "Transfer"
#     conduct = "Conduct"


class CertificateIssueBase(BaseModel):
    student_id: UUID
    certificate_type_id: UUID
    issue_date: date | None = Field(default_factory=date.today)
    description: str | None = Field(None, max_length=255)
    certificate_file: str | None = Field(None, description="Path or filename of uploaded certificate")

    model_config = {"from_attributes": True}


class CertificateIssueCreate(CertificateIssueBase):
    pass


class CertificateIssueUpdate(BaseModel):
    certificate_type_id: UUID
    issue_date: date | None
    description: str | None = Field(None, max_length=255)
    certificate_file: str | None

    model_config = {"from_attributes": True}


class CertificateIssueOut(CertificateIssueBase):
    id: UUID
    student: StudentAdmissionResponse | None

    model_config = ConfigDict(from_attributes=True)


class CertificateFileResponse(BaseModel):
    certificate_type_id: UUID
    issue_date: date | None
    file_path: str | None
    exists_on_disk: bool

    model_config = {"from_attributes": True}
