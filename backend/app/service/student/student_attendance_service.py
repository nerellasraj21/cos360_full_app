from datetime import date
import logging
from uuid import UUID

from fastapi import HTTPException, Request
from sqlalchemy import and_, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.masters.admission_model import Admission
from app.models.masters.attendance_model import StudentAttendance
from app.models.student.student_model import Student
from app.schemas.student.attendance_schema import StudentAttendanceCreate, StudentAttendanceOut, StudentAttendanceUpdate
from app.tools.database_error_mapper import map_database_error
from app.tools.error_handler import (
    ErrorCategory,
    create_business_rule_error,
    create_database_error,
    create_error_response,
    create_not_found_error,
    create_validation_error,
)

logger = logging.getLogger(__name__)


async def get_student_admission_date(student_id: UUID, db: AsyncSession) -> date | None:
    """Return the student's admission (join) date, or None if no admission record exists."""
    result = await db.execute(select(Admission.admission_date).where(Admission.student_id == student_id))
    return result.scalar_one_or_none()


async def add_attendance(attendance: StudentAttendanceCreate, db: AsyncSession, request: Request | None = None):
    """
    Create a new student attendance record with comprehensive error handling

    Args:
        attendance: Attendance data
        db: Database session
        request: FastAPI request object for context

    Returns:
        Created attendance record

    Raises:
        HTTPException: For validation, business rule, or database errors
    """
    try:
        # Validate student exists
        student_result = await db.execute(select(Student).where(Student.id == attendance.student_id))
        student = student_result.scalar_one_or_none()
        if not student:
            raise create_not_found_error(
                message="Student not found",
                resource_type="student",
                resource_id=str(attendance.student_id),
                request=request,
            )

        # Validate attendance date
        if attendance.date > date.today():
            raise create_validation_error(
                message="Attendance date cannot be in the future",
                field="date",
                value=str(attendance.date),
                request=request,
            )

        # Attendance cannot be marked before the student's admission (join) date
        admission_date = await get_student_admission_date(attendance.student_id, db)
        if admission_date and attendance.date < admission_date:
            raise create_validation_error(
                message=f"Attendance cannot be marked before the student's admission date ({admission_date})",
                field="date",
                value=str(attendance.date),
                request=request,
            )

        # Check for duplicate attendance entry
        existing_attendance = await db.execute(
            select(StudentAttendance).where(
                and_(StudentAttendance.student_id == attendance.student_id, StudentAttendance.date == attendance.date)
            )
        )
        if existing_attendance.scalar_one_or_none():
            raise create_business_rule_error(
                message="Attendance already marked for this student on this date",
                rule="unique_attendance_per_date",
                request=request,
            )

        # Validate attendance status
        valid_statuses = ["present", "absent", "late", "half_day", "leave"]
        if attendance.status not in valid_statuses:
            raise create_validation_error(
                message=f"Invalid attendance status. Must be one of: {', '.join(valid_statuses)}",
                field="status",
                value=attendance.status,
                request=request,
            )

        # Create attendance record
        new_record = StudentAttendance(**attendance.dict())
        db.add(new_record)

        # Use flush pattern to avoid schema context issues
        await db.flush()

        # Load with relationships before commit
        result = await db.execute(
            select(StudentAttendance)
            .options(selectinload(StudentAttendance.student))
            .where(StudentAttendance.id == new_record.id)
        )
        attendance_with_relations = result.scalar_one()

        await db.commit()
        return attendance_with_relations

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating attendance: {str(e)}")

        # Handle database-specific errors
        if "constraint" in str(e).lower() or "duplicate" in str(e).lower():
            error_code, message, details = map_database_error(e)
            raise create_database_error(message=message, constraint=details.get("constraint"), request=request)

        # Generic system error
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to create attendance record",
            status_code=500,
            request=request,
        )


async def get_attendances(db: AsyncSession, request: Request | None = None) -> list[StudentAttendance]:
    """
    Get all attendance records with error handling

    Args:
        db: Database session
        request: FastAPI request object for context

    Returns:
        List of attendance records

    Raises:
        HTTPException: For database errors
    """
    try:
        result = await db.execute(select(StudentAttendance).options(selectinload(StudentAttendance.student)))
        return result.scalars().all()
    except Exception as e:
        logger.error(f"Error fetching attendance records: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to fetch attendance records",
            status_code=500,
            request=request,
        )


async def get_attendance_by_id(
    attendance_id: UUID, db: AsyncSession, request: Request | None = None
) -> StudentAttendance:
    """
    Get attendance record by ID with comprehensive error handling

    Args:
        attendance_id: Attendance record ID
        db: Database session
        request: FastAPI request object for context

    Returns:
        Attendance record

    Raises:
        HTTPException: For not found or database errors
    """
    try:
        result = await db.execute(
            select(StudentAttendance)
            .options(selectinload(StudentAttendance.student))
            .where(StudentAttendance.id == attendance_id)
        )
        attendance = result.scalar_one_or_none()

        if not attendance:
            raise create_not_found_error(
                message="Attendance record not found",
                resource_type="attendance",
                resource_id=str(attendance_id),
                request=request,
            )

        return attendance

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching attendance {attendance_id}: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to fetch attendance record",
            status_code=500,
            request=request,
        )


async def update_partial_details_attendance(
    attendance_id: UUID, update_data: StudentAttendanceUpdate, db: AsyncSession, request: Request | None = None
) -> StudentAttendance:
    """
    Update attendance record with comprehensive error handling

    Args:
        attendance_id: Attendance record ID
        update_data: Update data
        db: Database session
        request: FastAPI request object for context

    Returns:
        Updated attendance record

    Raises:
        HTTPException: For not found, validation, or database errors
    """
    try:
        result = await db.execute(select(StudentAttendance).where(StudentAttendance.id == attendance_id))
        attendance = result.scalar_one_or_none()

        if not attendance:
            raise create_not_found_error(
                message="Attendance record not found",
                resource_type="attendance",
                resource_id=str(attendance_id),
                request=request,
            )

        # Validate update data
        update_dict = update_data.dict(exclude_unset=True)

        # Validate status if being updated
        if "status" in update_dict:
            valid_statuses = ["present", "absent", "late", "half_day", "leave"]
            if update_dict["status"] not in valid_statuses:
                raise create_validation_error(
                    message=f"Invalid attendance status. Must be one of: {', '.join(valid_statuses)}",
                    field="status",
                    value=update_dict["status"],
                    request=request,
                )

        # Validate date if being updated
        if "date" in update_dict:
            if update_dict["date"] > date.today():
                raise create_validation_error(
                    message="Attendance date cannot be in the future",
                    field="date",
                    value=str(update_dict["date"]),
                    request=request,
                )

            admission_date = await get_student_admission_date(attendance.student_id, db)
            if admission_date and update_dict["date"] < admission_date:
                raise create_validation_error(
                    message=f"Attendance cannot be marked before the student's admission date ({admission_date})",
                    field="date",
                    value=str(update_dict["date"]),
                    request=request,
                )

        # Apply updates
        for field, value in update_dict.items():
            setattr(attendance, field, value)

        # Use flush pattern to avoid schema context issues
        await db.flush()

        # Load with relationships before commit
        result = await db.execute(
            select(StudentAttendance)
            .options(selectinload(StudentAttendance.student))
            .where(StudentAttendance.id == attendance_id)
        )
        updated_attendance = result.scalar_one()

        await db.commit()
        return updated_attendance

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating attendance {attendance_id}: {str(e)}")

        # Handle database-specific errors
        if "constraint" in str(e).lower() or "duplicate" in str(e).lower():
            error_code, message, details = map_database_error(e)
            raise create_database_error(message=message, constraint=details.get("constraint"), request=request)

        # Generic system error
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to update attendance record",
            status_code=500,
            request=request,
        )


async def delete_attendance_data(attendance_id: UUID, db: AsyncSession, request: Request | None = None) -> dict:
    """
    Delete attendance record with comprehensive error handling

    Args:
        attendance_id: Attendance record ID
        db: Database session
        request: FastAPI request object for context

    Returns:
        Success message

    Raises:
        HTTPException: For not found or database errors
    """
    try:
        result = await db.execute(select(StudentAttendance).where(StudentAttendance.id == attendance_id))
        attendance = result.scalar_one_or_none()

        if not attendance:
            raise create_not_found_error(
                message="Attendance record not found",
                resource_type="attendance",
                resource_id=str(attendance_id),
                request=request,
            )

        await db.delete(attendance)
        await db.commit()

        logger.info(f"Successfully deleted attendance record {attendance_id}")
        return {"detail": "Attendance record deleted successfully"}

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting attendance {attendance_id}: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to delete attendance record",
            status_code=500,
            request=request,
        )


async def get_all_student_attendance_with_filters(
    db: AsyncSession,
    start_date: date | None = None,
    end_date: date | None = None,
    student_name: str | None = None,
    request: Request | None = None,
) -> list[StudentAttendanceOut]:
    """
    Get all student attendance with optional filtering and error handling

    Args:
        db: Database session
        start_date: Start date filter
        end_date: End date filter
        student_name: Student name filter
        request: FastAPI request object for context

    Returns:
        List of filtered attendance records

    Raises:
        HTTPException: For validation or database errors
    """
    try:
        # Validate date range
        if start_date and end_date and start_date > end_date:
            raise create_validation_error(
                message="Start date cannot be after end date", field="date_range", request=request
            )

        stmt = select(StudentAttendance).options(selectinload(StudentAttendance.student))

        if start_date and end_date:
            stmt = stmt.where(and_(StudentAttendance.date >= start_date, StudentAttendance.date <= end_date))

        if student_name:
            search = f"%{student_name.lower()}%"
            stmt = stmt.join(StudentAttendance.student).where(
                or_(
                    func.lower(Student.first_name).ilike(search),
                    func.lower(Student.last_name).ilike(search),
                    func.lower(func.concat(Student.first_name, " ", Student.last_name)).ilike(search),
                )
            )

        result = await db.execute(stmt)
        return result.scalars().all()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving filtered attendance records: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to retrieve attendance records",
            status_code=500,
            request=request,
        )


async def get_attendance_for_student(
    student_id: UUID,
    db: AsyncSession,
    start_date: date | None = None,
    end_date: date | None = None,
    request: Request | None = None,
) -> list[StudentAttendance]:
    """
    Get attendance for a specific student with optional date filtering and error handling

    Args:
        student_id: Student ID
        db: Database session
        start_date: Start date filter
        end_date: End date filter
        request: FastAPI request object for context

    Returns:
        List of student attendance records

    Raises:
        HTTPException: For validation or database errors
    """
    try:
        # Validate student exists
        student_result = await db.execute(select(Student).where(Student.id == student_id))
        student = student_result.scalar_one_or_none()
        if not student:
            raise create_not_found_error(
                message="Student not found", resource_type="student", resource_id=str(student_id), request=request
            )

        # Validate date range
        if start_date and end_date and start_date > end_date:
            raise create_validation_error(
                message="Start date cannot be after end date", field="date_range", request=request
            )

        query = select(StudentAttendance).where(StudentAttendance.student_id == student_id)

        if start_date and end_date:
            query = query.where(and_(StudentAttendance.date >= start_date, StudentAttendance.date <= end_date))
        elif start_date:
            query = query.where(StudentAttendance.date >= start_date)
        elif end_date:
            query = query.where(StudentAttendance.date <= end_date)

        result = await db.execute(query)
        return result.scalars().all()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving attendance for student {student_id}: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to retrieve student attendance",
            status_code=500,
            request=request,
        )


async def get_attendance_by_date(
    db: AsyncSession, attendance_date: date, request: Request | None = None
) -> list[StudentAttendance]:
    """
    Get attendance records for a specific date with error handling

    Args:
        db: Database session
        attendance_date: Date to get attendance for
        request: FastAPI request object for context

    Returns:
        List of attendance records for the date

    Raises:
        HTTPException: For validation or database errors
    """
    try:
        # Validate date
        if attendance_date > date.today():
            raise create_validation_error(
                message="Cannot retrieve attendance for future dates",
                field="attendance_date",
                value=str(attendance_date),
                request=request,
            )

        stmt = (
            select(StudentAttendance)
            .options(selectinload(StudentAttendance.student))
            .where(StudentAttendance.date == attendance_date)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving attendance for date {attendance_date}: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to retrieve attendance for date",
            status_code=500,
            request=request,
        )


async def update_attendance_by_date(
    db: AsyncSession, attendance_date: date, attendance_updates: list[dict], request: Request | None = None
) -> list[StudentAttendance]:
    """
    Bulk update attendance for a specific date with comprehensive error handling

    Args:
        db: Database session
        attendance_date: Date to update attendance for
        attendance_updates: List of update data
        request: FastAPI request object for context

    Returns:
        List of updated attendance records

    Raises:
        HTTPException: For validation or database errors
    """
    try:
        # Validate date
        if attendance_date > date.today():
            raise create_validation_error(
                message="Cannot update attendance for future dates",
                field="attendance_date",
                value=str(attendance_date),
                request=request,
            )

        # Validate attendance updates
        if not attendance_updates:
            raise create_validation_error(
                message="No attendance updates provided", field="attendance_updates", request=request
            )

        updated_records = []
        valid_statuses = ["present", "absent", "late", "half_day", "leave"]

        for update_data in attendance_updates:
            student_id = update_data.get("student_id")
            new_status = update_data.get("status")
            new_remarks = update_data.get("remarks")

            if not student_id or not new_status:
                continue

            # Skip students who hadn't joined yet as of this attendance date
            admission_date = await get_student_admission_date(student_id, db)
            if admission_date and attendance_date < admission_date:
                logger.warning(
                    f"Skipping attendance for student {student_id} on {attendance_date}: "
                    f"before admission date ({admission_date})"
                )
                continue

            # Validate status
            if new_status not in valid_statuses:
                raise create_validation_error(
                    message=f"Invalid attendance status '{new_status}'. Must be one of: {', '.join(valid_statuses)}",
                    field="status",
                    value=new_status,
                    request=request,
                )

            result = await db.execute(
                select(StudentAttendance).where(
                    and_(StudentAttendance.student_id == student_id, StudentAttendance.date == attendance_date)
                )
            )
            attendance = result.scalar_one_or_none()

            if attendance:
                attendance.status = new_status
                if new_remarks:
                    attendance.remarks = new_remarks
                updated_records.append(attendance)
            else:
                new_record = StudentAttendance(
                    student_id=student_id,
                    date=attendance_date,
                    status=new_status,
                    remarks=new_remarks,
                )
                db.add(new_record)
                updated_records.append(new_record)

        await db.flush()

        result = await db.execute(
            select(StudentAttendance)
            .options(selectinload(StudentAttendance.student))
            .where(
                and_(
                    StudentAttendance.date == attendance_date, StudentAttendance.id.in_([r.id for r in updated_records])
                )
            )
        )
        refreshed_records = result.scalars().all()

        await db.commit()
        return refreshed_records

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating attendance by date {attendance_date}: {str(e)}")

        # Handle database-specific errors
        if "constraint" in str(e).lower() or "duplicate" in str(e).lower():
            error_code, message, details = map_database_error(e)
            raise create_database_error(message=message, constraint=details.get("constraint"), request=request)

        # Generic system error
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to update attendance by date",
            status_code=500,
            request=request,
        )
