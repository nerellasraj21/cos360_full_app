from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID


class ReportFilter(BaseModel):
    """Base filter model for reports"""
    academic_year_id: Optional[UUID] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=100, ge=1, le=1000)
    sort_by: Optional[str] = None
    sort_order: str = Field(default="asc", pattern="^(asc|desc)$")


class StudentSummaryFilter(ReportFilter):
    """Filters for Student Summary Report"""
    class_id: Optional[UUID] = None
    section_id: Optional[UUID] = None
    gender: Optional[str] = None
    caste: Optional[str] = None
    religion: Optional[str] = None
    student_type: Optional[str] = None
    address_city: Optional[str] = None


class StaffSummaryFilter(ReportFilter):
    """Filters for Staff Summary Report"""
    department_id: Optional[UUID] = None
    gender: Optional[str] = None
    caste: Optional[str] = None
    employment_type: Optional[str] = None
    address_city: Optional[str] = None
    subject_id: Optional[UUID] = None


class StudentSummaryData(BaseModel):
    """Student Summary Report data model"""
    sl_no: int
    admission_no: str
    full_name: str
    father_name: Optional[str]
    class_section: str
    contact_no: Optional[str]
    address: Optional[str]


class StaffSummaryData(BaseModel):
    """Staff Summary Report data model"""
    sl_no: int
    emp_no: str
    full_name: str
    department: str
    designation: str
    employment_type: str
    subject: Optional[str]
    contact_no: Optional[str]
    address: Optional[str]


class ReportResponse(BaseModel):
    """Base report response model"""
    data: List[Dict[str, Any]] = Field(description="Report data rows")
    total_count: int = Field(description="Total number of records")
    page: int = Field(description="Current page number")
    page_size: int = Field(description="Number of records per page")
    total_pages: int = Field(description="Total number of pages")


class ExportRequest(BaseModel):
    """Export request model"""
    report_type: str
    filters: Dict[str, Any]
    format: str = Field(pattern="^(csv|xlsx|pdf)$")
    filename: Optional[str] = None


class ExportResponse(BaseModel):
    """Export response model"""
    audit_id: UUID
    status: str
    message: str
    is_background: bool = False
    estimated_completion: Optional[datetime] = None


class ReportAuditResponse(BaseModel):
    """Report audit response model"""
    id: UUID
    user_id: UUID
    tenant_id: str
    report_type: str
    filters_applied: Optional[Dict[str, Any]]
    export_format: str
    file_path: Optional[str]
    file_size: Optional[int]
    status: str
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    is_background_job: bool
