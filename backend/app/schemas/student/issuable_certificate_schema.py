"""
Issuable Certificate Schemas — Request/Response models
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ============================================================================
# Template Schemas
# ============================================================================

class IssuableCertificateTemplateCreate(BaseModel):
    """Request model for creating a new certificate template"""
    name: str = Field(..., min_length=1, max_length=255)
    html_template: str = Field(..., min_length=1)
    color_theme: str = Field(default="blue")  # blue, green, red, orange

    model_config = ConfigDict(from_attributes=True)


class IssuableCertificateTemplateUpdate(BaseModel):
    """Request model for updating a certificate template"""
    name: str | None = Field(None, max_length=255)
    html_template: str | None = None
    color_theme: str | None = None
    is_active: bool | None = None

    model_config = ConfigDict(from_attributes=True)


class IssuableCertificateTemplateRead(BaseModel):
    """Response model for reading a certificate template"""
    id: UUID
    name: str
    html_template: str
    color_theme: str
    variables_used: str | None
    is_active: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Generated Certificate Schemas
# ============================================================================

class GenerateCertificateRequest(BaseModel):
    """Request model for generating a certificate from template"""
    student_id: UUID
    template_id: UUID
    edited_html: str = Field(..., min_length=1)  # User can edit HTML before saving
    remarks: str | None = Field(None, max_length=500)

    model_config = ConfigDict(from_attributes=True)


class GeneratedCertificateRead(BaseModel):
    """Response model for reading a generated certificate"""
    id: UUID
    student_id: UUID
    template_id: UUID
    html_content: str
    issued_date: datetime
    issued_by: UUID
    remarks: str | None
    is_active: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GenerateCertificateResponse(BaseModel):
    """Response after generating a certificate"""
    id: UUID
    status: str = "success"
    message: str
    download_url: str | None = None

    model_config = ConfigDict(from_attributes=True)
