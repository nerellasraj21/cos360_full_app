from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CertificateUploadRequest(BaseModel):
    """Request model for uploading a new certificate with metadata (multipart/form-data)"""
    student_id: UUID
    certificate_type_id: UUID
    issue_date: date = Field(default_factory=date.today)
    remarks: str | None = Field(None, max_length=500)

    model_config = ConfigDict(from_attributes=True)


class CertificateRead(BaseModel):
    """Response model for reading certificate details"""
    id: UUID
    student_id: UUID
    certificate_type_id: UUID
    type_name: str  # Certificate type name
    file_path: str  # S3 key
    issue_date: date
    remarks: str | None
    created_at: datetime
    updated_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class CertificateUpdateRequest(BaseModel):
    """Request model for updating certificate metadata (PATCH)"""
    certificate_type_id: UUID | None = None
    issue_date: date | None = None
    remarks: str | None = Field(None, max_length=500)

    model_config = ConfigDict(from_attributes=True)


class CertificateDownloadResponse(BaseModel):
    """Response model for certificate download presigned URL"""
    presigned_url: str
    expires_in_seconds: int
    certificate_id: UUID | None = None
    filename: str | None = None

    model_config = ConfigDict(from_attributes=True)


# Backward compatibility
class CertificateFileResponse(BaseModel):
    certificate_type_id: UUID
    issue_date: date | None
    file_path: str | None
    exists_on_disk: bool

    model_config = {"from_attributes": True}
