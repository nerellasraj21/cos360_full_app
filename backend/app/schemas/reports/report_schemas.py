from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ReportFilter(BaseModel):
    """Base filter model for reports"""

    academic_year_id: UUID | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=100, ge=1, le=1000)
    sort_by: str | None = None
    sort_order: str = Field(default="asc", pattern="^(asc|desc)$")


class StudentSummaryFilter(ReportFilter):
    """Filters for Student Summary Report"""

    class_id: UUID | None = None
    section_id: UUID | None = None
    gender: str | None = None
    caste: str | None = None
    religion: str | None = None
    student_type: str | None = None
    address_city: str | None = None


class StaffSummaryFilter(ReportFilter):
    """Filters for Staff Summary Report"""

    department_id: UUID | None = None
    gender: str | None = None
    caste: str | None = None
    employment_type: str | None = None
    address_city: str | None = None
    subject_id: UUID | None = None


class StudentSummaryData(BaseModel):
    """Student Summary Report data model"""

    sl_no: int
    admission_no: str
    full_name: str
    father_name: str | None
    class_section: str
    contact_no: str | None
    address: str | None


class StaffSummaryData(BaseModel):
    """Staff Summary Report data model"""

    sl_no: int
    emp_no: str
    full_name: str
    department: str
    designation: str
    employment_type: str
    subject: str | None
    contact_no: str | None
    address: str | None


class ReportResponse(BaseModel):
    """Base report response model"""

    data: list[dict[str, Any]] = Field(description="Report data rows")
    total_count: int = Field(description="Total number of records")
    page: int = Field(description="Current page number")
    page_size: int = Field(description="Number of records per page")
    total_pages: int = Field(description="Total number of pages")


class ExportRequest(BaseModel):
    """Export request model"""

    report_type: str
    filters: dict[str, Any]
    format: str = Field(pattern="^(csv|xlsx|pdf)$")
    filename: str | None = None


class ExportResponse(BaseModel):
    """Export response model"""

    audit_id: UUID
    status: str
    message: str
    is_background: bool = False
    estimated_completion: datetime | None = None


class ReportAuditResponse(BaseModel):
    """Report audit response model"""

    id: UUID
    user_id: UUID
    tenant_id: str
    report_type: str
    filters_applied: dict[str, Any] | None
    export_format: str
    file_path: str | None
    file_size: int | None
    status: str
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None
    is_background_job: bool
