"""
Service for generating attendance-related reports
"""

import logging
from typing import Any

from sqlalchemy import asc, case, desc, func, select

from app.models.masters.academic_year_model import AcademicYear
from app.models.masters.admission_model import Admission
from app.models.masters.attendance_model import StudentAttendance
from app.models.masters.class_model import Class
from app.models.masters.designations_model import Designation
from app.models.masters.sections_model import Section
from app.models.masters.staff_attendance_model import StaffAttendance
from app.models.masters.staff_model import Staff
from app.models.student.student_model import Student
from app.schemas.reports.attendance_report_schemas import (
    AttendanceSummaryStats,
    StaffAttendanceFilter,
    StaffAttendanceSummary,
    StudentAttendanceFilter,
    StudentAttendanceSummary,
)
from app.service.reports.base_report_service import BaseReportService

logger = logging.getLogger(__name__)


class AttendanceReportService(BaseReportService):
    """Service for generating attendance-related reports"""

    async def get_student_attendance_report(self, filters: StudentAttendanceFilter) -> tuple[list[dict[str, Any]], int]:
        """Get student attendance report data"""
        try:
            # Base query with joins
            query = (
                select(
                    StudentAttendance.id,
                    StudentAttendance.date,
                    StudentAttendance.status,
                    StudentAttendance.remarks,
                    StudentAttendance.marked_at,
                    Student.admission_number,
                    func.concat(Student.first_name, " ", Student.last_name).label("student_name"),
                    Class.name.label("class_name"),
                    Section.name.label("section_name"),
                    AcademicYear.title.label("academic_year"),
                )
                .join(Student, StudentAttendance.student_id == Student.id)
                .join(Admission, Student.id == Admission.student_id)
                .join(Class, Admission.current_class_id == Class.id)
                .join(Section, Admission.current_section_id == Section.id)
                .join(AcademicYear, Admission.academic_year_id == AcademicYear.id)
                .where(StudentAttendance.deleted_at.is_(None))
                .where(Student.deleted_at.is_(None))
                .where(Admission.deleted_at.is_(None))
            )

            # Apply filters
            if filters.academic_year_id:
                query = query.where(AcademicYear.id == filters.academic_year_id)

            if filters.class_id:
                query = query.where(Class.id == filters.class_id)

            if filters.section_id:
                query = query.where(Section.id == filters.section_id)

            if filters.student_id:
                query = query.where(Student.id == filters.student_id)

            if filters.date_from:
                query = query.where(StudentAttendance.date >= filters.date_from)

            if filters.date_to:
                query = query.where(StudentAttendance.date <= filters.date_to)

            if filters.attendance_status:
                query = query.where(StudentAttendance.status == filters.attendance_status)

            if filters.month and filters.year:
                query = query.where(
                    func.extract("month", StudentAttendance.date) == filters.month,
                    func.extract("year", StudentAttendance.date) == filters.year,
                )

            # Get total count
            count_query = select(func.count()).select_from(query.subquery())
            total_count = await self.db.scalar(count_query)

            # Apply sorting
            if filters.sort_by:
                sort_column = getattr(StudentAttendance, filters.sort_by, StudentAttendance.date)
                if filters.sort_order.lower() == "desc":
                    query = query.order_by(desc(sort_column))
                else:
                    query = query.order_by(asc(sort_column))
            else:
                query = query.order_by(desc(StudentAttendance.date), asc(Student.first_name))

            # Apply pagination
            if filters.page and filters.page_size:
                offset = (filters.page - 1) * filters.page_size
                query = query.offset(offset).limit(filters.page_size)

            # Execute query
            result = await self.db.execute(query)
            rows = result.fetchall()

            # Format data
            data = []
            for i, row in enumerate(rows, 1):
                data.append(
                    {
                        "sl_no": i + ((filters.page - 1) * filters.page_size),
                        "admission_no": row.admission_number,
                        "student_name": row.student_name,
                        "class_section": f"{row.class_name}-{row.section_name}",
                        "date": row.date.isoformat() if row.date else None,
                        "attendance_status": row.status,
                        "marked_at": row.marked_at.isoformat() if row.marked_at else None,
                        "remarks": row.remarks,
                        "academic_year": row.academic_year,
                    }
                )

            return data, total_count or 0

        except Exception as e:
            logger.error(f"Error in get_student_attendance_report: {str(e)}")
            raise

    async def get_staff_attendance_report(self, filters: StaffAttendanceFilter) -> tuple[list[dict[str, Any]], int]:
        """Get staff attendance report data"""
        try:
            # Base query with joins
            query = (
                select(
                    StaffAttendance.id,
                    StaffAttendance.date,
                    StaffAttendance.status,
                    StaffAttendance.remarks,
                    StaffAttendance.created_at.label("marked_at"),
                    Staff.staff_id,
                    func.concat(Staff.first_name, " ", Staff.last_name).label("staff_name"),
                    Staff.department,
                    Designation.title.label("designation"),
                )
                .join(Staff, StaffAttendance.staff_id == Staff.id)
                .outerjoin(Designation, Staff.designation_id == Designation.id)
                .where(StaffAttendance.deleted_at.is_(None))
                .where(Staff.deleted_at.is_(None))
            )

            # Apply filters
            if filters.staff_id:
                query = query.where(Staff.id == filters.staff_id)

            if filters.department:
                query = query.where(Staff.department == filters.department)

            if filters.designation_id:
                query = query.where(Staff.designation_id == filters.designation_id)

            if filters.date_from:
                query = query.where(StaffAttendance.date >= filters.date_from)

            if filters.date_to:
                query = query.where(StaffAttendance.date <= filters.date_to)

            if filters.attendance_status:
                query = query.where(StaffAttendance.status == filters.attendance_status)

            if filters.month and filters.year:
                query = query.where(
                    func.extract("month", StaffAttendance.date) == filters.month,
                    func.extract("year", StaffAttendance.date) == filters.year,
                )

            # Get total count
            count_query = select(func.count()).select_from(query.subquery())
            total_count = await self.db.scalar(count_query)

            # Apply sorting
            if filters.sort_by:
                sort_column = getattr(StaffAttendance, filters.sort_by, StaffAttendance.date)
                if filters.sort_order.lower() == "desc":
                    query = query.order_by(desc(sort_column))
                else:
                    query = query.order_by(asc(sort_column))
            else:
                query = query.order_by(desc(StaffAttendance.date), asc(Staff.first_name))

            # Apply pagination
            if filters.page and filters.page_size:
                offset = (filters.page - 1) * filters.page_size
                query = query.offset(offset).limit(filters.page_size)

            # Execute query
            result = await self.db.execute(query)
            rows = result.fetchall()

            # Format data
            data = []
            for i, row in enumerate(rows, 1):
                data.append(
                    {
                        "sl_no": i + ((filters.page - 1) * filters.page_size),
                        "staff_id": row.staff_id,
                        "staff_name": row.staff_name,
                        "designation": row.designation,
                        "department": row.department,
                        "date": row.date.isoformat() if row.date else None,
                        "attendance_status": row.status,
                        "clock_in": None,  # Not available in current model
                        "clock_out": None,  # Not available in current model
                        "total_hours": None,  # Not available in current model
                        "marked_at": row.marked_at.isoformat() if row.marked_at else None,
                        "remarks": row.remarks,
                    }
                )

            return data, total_count or 0

        except Exception as e:
            logger.error(f"Error in get_staff_attendance_report: {str(e)}")
            raise

    async def get_student_attendance_summary_stats(self, filters: StudentAttendanceFilter) -> StudentAttendanceSummary:
        """Get student attendance summary statistics"""
        try:
            # Base query for statistics
            stats_query = (
                select(
                    func.count(StudentAttendance.id).label("total_records"),
                    func.count(case((StudentAttendance.status == "Present", 1))).label("present_count"),
                    func.count(case((StudentAttendance.status == "Absent", 1))).label("absent_count"),
                    func.count(case((StudentAttendance.status == "Late", 1))).label("late_count"),
                    func.count(case((StudentAttendance.status == "Excused", 1))).label("excused_count"),
                    func.count(func.distinct(Student.id)).label("total_students"),
                    func.min(StudentAttendance.date).label("date_from"),
                    func.max(StudentAttendance.date).label("date_to"),
                )
                .join(Student, StudentAttendance.student_id == Student.id)
                .where(StudentAttendance.deleted_at.is_(None))
                .where(Student.deleted_at.is_(None))
            )

            # Apply same filters as main query
            if filters.academic_year_id or filters.class_id or filters.section_id:
                stats_query = stats_query.join(Admission, Student.id == Admission.student_id)
                if filters.academic_year_id:
                    stats_query = stats_query.join(AcademicYear, Admission.academic_year_id == AcademicYear.id)
                    stats_query = stats_query.where(AcademicYear.id == filters.academic_year_id)
                if filters.class_id:
                    stats_query = stats_query.join(Class, Admission.current_class_id == Class.id)
                    stats_query = stats_query.where(Class.id == filters.class_id)
                if filters.section_id:
                    stats_query = stats_query.join(Section, Admission.current_section_id == Section.id)
                    stats_query = stats_query.where(Section.id == filters.section_id)

            if filters.date_from:
                stats_query = stats_query.where(StudentAttendance.date >= filters.date_from)
            if filters.date_to:
                stats_query = stats_query.where(StudentAttendance.date <= filters.date_to)

            # Execute statistics query
            stats_result = await self.db.execute(stats_query)
            stats_row = stats_result.fetchone()

            # Calculate attendance percentage
            total_records = stats_row.total_records or 0
            present_count = stats_row.present_count or 0
            attendance_percentage = (present_count / total_records * 100) if total_records > 0 else 0.0

            # Create date range string
            date_range = None
            if stats_row.date_from and stats_row.date_to:
                date_range = f"{stats_row.date_from} to {stats_row.date_to}"

            # Create summary stats
            summary_stats = AttendanceSummaryStats(
                total_students=stats_row.total_students or 0,
                present_count=present_count,
                absent_count=stats_row.absent_count or 0,
                late_count=stats_row.late_count or 0,
                excused_count=stats_row.excused_count or 0,
                attendance_percentage=round(attendance_percentage, 2),
                date_range=date_range,
            )

            return StudentAttendanceSummary(
                summary_stats=summary_stats,
                class_wise_stats=[],  # Can be implemented later
                monthly_trends=[],  # Can be implemented later
                top_absentees=[],  # Can be implemented later
            )

        except Exception as e:
            logger.error(f"Error in get_student_attendance_summary_stats: {str(e)}")
            raise

    async def get_staff_attendance_summary_stats(self, filters: StaffAttendanceFilter) -> StaffAttendanceSummary:
        """Get staff attendance summary statistics"""
        try:
            # Base query for statistics
            stats_query = (
                select(
                    func.count(StaffAttendance.id).label("total_records"),
                    func.count(case((StaffAttendance.status == "present", 1))).label("present_count"),
                    func.count(case((StaffAttendance.status == "absent", 1))).label("absent_count"),
                    func.count(case((StaffAttendance.status == "late", 1))).label("late_count"),
                    func.count(case((StaffAttendance.status == "half_day", 1))).label("half_day_count"),
                    func.count(case((StaffAttendance.status == "excused", 1))).label("excused_count"),
                    func.count(func.distinct(Staff.id)).label("total_staff"),
                    func.min(StaffAttendance.date).label("date_from"),
                    func.max(StaffAttendance.date).label("date_to"),
                )
                .join(Staff, StaffAttendance.staff_id == Staff.id)
                .where(StaffAttendance.deleted_at.is_(None))
                .where(Staff.deleted_at.is_(None))
            )

            # Apply filters
            if filters.staff_id:
                stats_query = stats_query.where(Staff.id == filters.staff_id)
            if filters.department:
                stats_query = stats_query.where(Staff.department == filters.department)
            if filters.designation_id:
                stats_query = stats_query.where(Staff.designation_id == filters.designation_id)
            if filters.date_from:
                stats_query = stats_query.where(StaffAttendance.date >= filters.date_from)
            if filters.date_to:
                stats_query = stats_query.where(StaffAttendance.date <= filters.date_to)

            # Execute statistics query
            stats_result = await self.db.execute(stats_query)
            stats_row = stats_result.fetchone()

            # Calculate attendance percentage
            total_records = stats_row.total_records or 0
            present_count = stats_row.present_count or 0
            half_day_count = stats_row.half_day_count or 0
            attendance_percentage = (
                (present_count + half_day_count * 0.5) / total_records * 100
            ) if total_records > 0 else 0.0

            # Create date range string
            date_range = None
            if stats_row.date_from and stats_row.date_to:
                date_range = f"{stats_row.date_from} to {stats_row.date_to}"

            # Create summary stats
            summary_stats = AttendanceSummaryStats(
                total_staff=stats_row.total_staff or 0,
                present_count=present_count,
                absent_count=stats_row.absent_count or 0,
                late_count=stats_row.late_count or 0,
                half_day_count=half_day_count,
                excused_count=stats_row.excused_count or 0,
                attendance_percentage=round(attendance_percentage, 2),
                date_range=date_range,
            )

            return StaffAttendanceSummary(
                summary_stats=summary_stats,
                department_wise_stats=[],  # Can be implemented later
                monthly_trends=[],  # Can be implemented later
                late_arrivals=[],  # Can be implemented later
            )

        except Exception as e:
            logger.error(f"Error in get_staff_attendance_summary_stats: {str(e)}")
            raise
