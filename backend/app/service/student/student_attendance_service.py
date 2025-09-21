from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import and_
from typing import Optional, List
from datetime import date
from app.models.masters.attendance_model import StudentAttendance
from app.schemas.student.attendance_schema import (
    StudentAttendanceCreate,
    StudentAttendanceUpdate,
    StudentAttendanceOut
)

# Create Attendance
async def add_attendance(attendance: StudentAttendanceCreate, db: AsyncSession):
    try:
        new_record = StudentAttendance(**attendance.dict())
        db.add(new_record)
        await db.commit()
        await db.refresh(new_record)
        return new_record
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating attendance: {str(e)}")

# Get All Attendance Records
async def get_attendances(db: AsyncSession):
    result = await db.execute(select(StudentAttendance))
    return result.scalars().all()

# Get Attendance by ID
async def get_attendance_by_id(attendance_id: UUID, db: AsyncSession):
    result = await db.execute(select(StudentAttendance).where(StudentAttendance.id == attendance_id))
    attendance = result.scalar_one_or_none()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return attendance

# Update Attendance (PATCH)
async def update_partial_details_attendance(attendance_id: UUID, update_data: StudentAttendanceUpdate, db: AsyncSession):
    result = await db.execute(select(StudentAttendance).where(StudentAttendance.id == attendance_id))
    attendance = result.scalar_one_or_none()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    for field, value in update_data.dict(exclude_unset=True).items():
        setattr(attendance, field, value)

    try:
        await db.commit()
        await db.refresh(attendance)
        return attendance
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating attendance: {str(e)}")

# Delete Attendance
async def delete_attendance_data(attendance_id: UUID, db: AsyncSession):
    result = await db.execute(select(StudentAttendance).where(StudentAttendance.id == attendance_id))
    attendance = result.scalar_one_or_none()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    try:
        await db.delete(attendance)
        await db.commit()
        return {"detail": "Attendance record deleted successfully"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting attendance: {str(e)}")

# Get all student attendance with optional date filtering
async def get_all_student_attendance_with_filters(
    db: AsyncSession,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    student_name: Optional[str] = None
) -> List[StudentAttendanceOut]:
    try:
        stmt = select(StudentAttendance).options(selectinload(StudentAttendance.student))

        if start_date and end_date:
            stmt = stmt.where(
                and_(
                    StudentAttendance.date >= start_date,
                    StudentAttendance.date <= end_date
                )
            )

        if student_name:
            stmt = stmt.join(StudentAttendance.student).where(
                StudentAttendance.student.has(name=student_name)
            )

        result = await db.execute(stmt)
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving attendance records: {str(e)}")

# Get attendance for a specific student with optional date filtering
async def get_attendance_for_student(
    student_id: UUID,
    db: AsyncSession,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):
    query = select(StudentAttendance).where(StudentAttendance.student_id == student_id)

    if start_date and end_date:
        query = query.where(and_(
            StudentAttendance.date >= start_date,
            StudentAttendance.date <= end_date
        ))
    elif start_date:
        query = query.where(StudentAttendance.date >= start_date)
    elif end_date:
        query = query.where(StudentAttendance.date <= end_date)

    result = await db.execute(query)
    return result.scalars().all()

# Get attendance by specific date
async def get_attendance_by_date(
    db: AsyncSession,
    attendance_date: date
):
    try:
        stmt = select(StudentAttendance).options(selectinload(StudentAttendance.student)).where(
            StudentAttendance.date == attendance_date
        )
        result = await db.execute(stmt)
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving attendance for date: {str(e)}")

# Bulk update attendance for a specific date
async def update_attendance_by_date(
    db: AsyncSession,
    attendance_date: date,
    attendance_updates: List[dict]
):
    try:
        updated_records = []
        for update_data in attendance_updates:
            student_id = update_data.get("student_id")
            new_status = update_data.get("status")
            new_remarks = update_data.get("remarks")

            if not student_id or not new_status:
                continue

            result = await db.execute(
                select(StudentAttendance).where(
                    and_(
                        StudentAttendance.student_id == student_id,
                        StudentAttendance.date == attendance_date
                    )
                )
            )
            attendance = result.scalar_one_or_none()

            if attendance:
                attendance.status = new_status
                if new_remarks:
                    attendance.remarks = new_remarks
                updated_records.append(attendance)

        await db.flush()

        result = await db.execute(
            select(StudentAttendance)
            .options(selectinload(StudentAttendance.student))
            .where(
                and_(
                    StudentAttendance.date == attendance_date,
                    StudentAttendance.id.in_([r.id for r in updated_records])
                )
            )
        )
        refreshed_records = result.scalars().all()

        await db.commit()
        return refreshed_records
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating attendance by date: {str(e)}")
