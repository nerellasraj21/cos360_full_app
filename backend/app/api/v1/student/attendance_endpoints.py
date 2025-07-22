from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.student.attendance_schema import (
    StudentAttendanceCreate,
    StudentAttendanceOut,
    StudentAttendanceUpdate
)
from app.service.student.student_attendance_service import add_attendance, get_attendance_by_id, get_attendances, delete_attendance_data, update_partial_details_attendance

router = APIRouter(prefix="/attendance", tags=["Student Attendance"])

# Create Attendance
@router.post("/", response_model=StudentAttendanceOut, status_code=status.HTTP_201_CREATED)
async def create_attendance(attendance: StudentAttendanceCreate, db: AsyncSession = Depends(get_db)):
    try:
        return await add_attendance(attendance, db)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating attendance: {str(e)}")

# Get All Attendance Records
@router.get("/", response_model=list[StudentAttendanceOut])
async def get_all_attendance(db: AsyncSession = Depends(get_db)):
    return await get_attendances(db)

# Get Attendance by ID
@router.get("/{attendance_id}", response_model=StudentAttendanceOut)
async def get_attendance(attendance_id: int, db: AsyncSession = Depends(get_db)):
    return await get_attendance_by_id(attendance_id,db)

# Update Attendance (PATCH)
@router.patch("/{attendance_id}", response_model=StudentAttendanceOut)
async def update_attendance(attendance_id: int, update_data: StudentAttendanceUpdate, db: AsyncSession = Depends(get_db)):
    return await update_partial_details_attendance(attendance_id,update_data,db)

# Delete Attendance
@router.delete("/{attendance_id}")
async def delete_attendance(attendance_id: int, db: AsyncSession = Depends(get_db)):
    return await delete_attendance_data(attendance_id,db)
