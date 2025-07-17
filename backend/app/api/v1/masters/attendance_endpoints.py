# app/routers/student/attendance_router.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.masters.attendance_model import StudentAttendance
from app.schemas.masters.attendance_schema import (
    StudentAttendanceCreate,
    StudentAttendanceOut,
    StudentAttendanceUpdate
)

router = APIRouter(prefix="/attendance", tags=["Student Attendance"])

# Create Attendance
@router.post("/", response_model=StudentAttendanceOut, status_code=status.HTTP_201_CREATED)
async def create_attendance(attendance: StudentAttendanceCreate, db: AsyncSession = Depends(get_db)):
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
@router.get("/", response_model=list[StudentAttendanceOut])
async def get_all_attendance(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StudentAttendance))
    return result.scalars().all()

# Get Attendance by ID
@router.get("/{attendance_id}", response_model=StudentAttendanceOut)
async def get_attendance(attendance_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StudentAttendance).where(StudentAttendance.id == attendance_id))
    attendance = result.scalar_one_or_none()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return attendance

# Update Attendance (PATCH)
@router.patch("/{attendance_id}", response_model=StudentAttendanceOut)
async def update_attendance(attendance_id: int, update_data: StudentAttendanceUpdate, db: AsyncSession = Depends(get_db)):
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
@router.delete("/{attendance_id}")
async def delete_attendance(attendance_id: int, db: AsyncSession = Depends(get_db)):
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
