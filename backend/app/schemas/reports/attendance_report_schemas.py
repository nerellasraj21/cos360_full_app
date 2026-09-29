"""
Pydantic schemas for attendance reports
"""

from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class StudentAttendanceFilter(BaseModel):
    """Filter for student attendance reports"""

    academic_year_id: UUID | None = None
    class_id: UUID | None = None
    section_id: UUID | None = None
    student_id: UUID | None = None
    date_from: date | None = None
    date_to: date | None = None
    attendance_status: str | None = None  # Present, Absent, Late, Excused
    month: int | None = None
    year: int | None = None
    page: int = 1
    page_size: int = 100
    sort_by: str | None = None
    sort_order: str = "asc"


class StaffAttendanceFilter(BaseModel):
    """Filter for staff attendance reports"""

    staff_id: UUID | None = None
    department: str | None = None
    designation_id: UUID | None = None
    date_from: date | None = None
    date_to: date | None = None
    attendance_status: str | None = None  # Present, Absent, Late, Excused
    month: int | None = None
    year: int | None = None
    page: int = 1
    page_size: int = 100
    sort_by: str | None = None
    sort_order: str = "asc"


class StudentAttendanceData(BaseModel):
    """Student attendance report data"""

    sl_no: int
    admission_no: str
    student_name: str
    class_section: str
    date: date
    attendance_status: str
    marked_by: str | None = None
    marked_at: datetime | None = None
    remarks: str | None = None
    total_days: int | None = None
    present_days: int | None = None
    absent_days: int | None = None
    attendance_percentage: float | None = None


class StaffAttendanceData(BaseModel):
    """Staff attendance report data"""

    sl_no: int
    staff_id: str
    staff_name: str
    designation: str | None = None
    department: str | None = None
    date: date
    attendance_status: str
    clock_in: datetime | None = None
    clock_out: datetime | None = None
    total_hours: float | None = None
    marked_by: str | None = None
    marked_at: datetime | None = None
    remarks: str | None = None


class AttendanceSummaryStats(BaseModel):
    """Attendance summary statistics"""

    total_students: int = 0
    total_staff: int = 0
    present_count: int = 0
    absent_count: int = 0
    late_count: int = 0
    half_day_count: int = 0
    leave_count: int = 0
    excused_count: int = 0
    attendance_percentage: float = 0.0
    date_range: str | None = None


class StudentAttendanceSummary(BaseModel):
    """Student attendance summary response"""

    summary_stats: AttendanceSummaryStats
    class_wise_stats: list[dict[str, Any]] = []
    monthly_trends: list[dict[str, Any]] = []
    top_absentees: list[dict[str, Any]] = []


class StaffAttendanceSummary(BaseModel):
    """Staff attendance summary response"""

    summary_stats: AttendanceSummaryStats
    department_wise_stats: list[dict[str, Any]] = []
    monthly_trends: list[dict[str, Any]] = []
    late_arrivals: list[dict[str, Any]] = []


class AttendanceComparisonFilter(BaseModel):
    """Filter for attendance comparison reports"""

    compare_type: str = "monthly"  # monthly, yearly, class_wise
    academic_year_id: UUID | None = None
    class_ids: list[UUID] | None = None
    month_from: int | None = None
    month_to: int | None = None
    year: int | None = None


class AttendanceComparisonData(BaseModel):
    """Attendance comparison data"""

    period: str
    entity_name: str  # Class name, month name, etc.
    total_days: int
    present_count: int
    absent_count: int
    attendance_percentage: float
    comparison_data: dict[str, Any] = {}
