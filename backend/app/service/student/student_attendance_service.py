from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.masters.attendance_model import StudentAttendance
from app.schemas.student.attendance_schema import (
    StudentAttendanceCreate,
    StudentAttendanceUpdate
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
async def get_attendance_by_id(attendance_id: int, db: AsyncSession):
    result = await db.execute(select(StudentAttendance).where(StudentAttendance.id == attendance_id))
    attendance = result.scalar_one_or_none()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return attendance

# Update Attendance (PATCH)
async def update_partial_details_attendance(attendance_id: int, update_data: StudentAttendanceUpdate, db: AsyncSession):
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
async def delete_attendance_data(attendance_id: int, db: AsyncSession):
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
