"""
Pydantic schemas for attendance reports
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal


class StudentAttendanceFilter(BaseModel):
    """Filter for student attendance reports"""
    academic_year_id: Optional[UUID] = None
    class_id: Optional[UUID] = None
    section_id: Optional[UUID] = None
    student_id: Optional[UUID] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    attendance_status: Optional[str] = None  # Present, Absent, Late, Excused
    month: Optional[int] = None
    year: Optional[int] = None
    page: int = 1
    page_size: int = 100
    sort_by: Optional[str] = None
    sort_order: str = "asc"


class StaffAttendanceFilter(BaseModel):
    """Filter for staff attendance reports"""
    staff_id: Optional[UUID] = None
    department: Optional[str] = None
    designation_id: Optional[UUID] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    attendance_status: Optional[str] = None  # Present, Absent, Late, Excused
    month: Optional[int] = None
    year: Optional[int] = None
    page: int = 1
    page_size: int = 100
    sort_by: Optional[str] = None
    sort_order: str = "asc"


class StudentAttendanceData(BaseModel):
    """Student attendance report data"""
    sl_no: int
    admission_no: str
    student_name: str
    class_section: str
    date: date
    attendance_status: str
    marked_by: Optional[str] = None
    marked_at: Optional[datetime] = None
    remarks: Optional[str] = None
    total_days: Optional[int] = None
    present_days: Optional[int] = None
    absent_days: Optional[int] = None
    attendance_percentage: Optional[float] = None


class StaffAttendanceData(BaseModel):
    """Staff attendance report data"""
    sl_no: int
    staff_id: str
    staff_name: str
    designation: Optional[str] = None
    department: Optional[str] = None
    date: date
    attendance_status: str
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    total_hours: Optional[float] = None
    marked_by: Optional[str] = None
    marked_at: Optional[datetime] = None
    remarks: Optional[str] = None


class AttendanceSummaryStats(BaseModel):
    """Attendance summary statistics"""
    total_students: int = 0
    total_staff: int = 0
    present_count: int = 0
    absent_count: int = 0
    late_count: int = 0
    excused_count: int = 0
    attendance_percentage: float = 0.0
    date_range: Optional[str] = None


class StudentAttendanceSummary(BaseModel):
    """Student attendance summary response"""
    summary_stats: AttendanceSummaryStats
    class_wise_stats: List[Dict[str, Any]] = []
    monthly_trends: List[Dict[str, Any]] = []
    top_absentees: List[Dict[str, Any]] = []


class StaffAttendanceSummary(BaseModel):
    """Staff attendance summary response"""
    summary_stats: AttendanceSummaryStats
    department_wise_stats: List[Dict[str, Any]] = []
    monthly_trends: List[Dict[str, Any]] = []
    late_arrivals: List[Dict[str, Any]] = []


class AttendanceComparisonFilter(BaseModel):
    """Filter for attendance comparison reports"""
    compare_type: str = "monthly"  # monthly, yearly, class_wise
    academic_year_id: Optional[UUID] = None
    class_ids: Optional[List[UUID]] = None
    month_from: Optional[int] = None
    month_to: Optional[int] = None
    year: Optional[int] = None


class AttendanceComparisonData(BaseModel):
    """Attendance comparison data"""
    period: str
    entity_name: str  # Class name, month name, etc.
    total_days: int
    present_count: int
    absent_count: int
    attendance_percentage: float
    comparison_data: Dict[str, Any] = {}