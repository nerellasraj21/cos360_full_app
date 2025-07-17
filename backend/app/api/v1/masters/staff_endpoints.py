from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import date

from app.db.session import get_db
from app.schemas.masters.staff_schema import StaffEnrollmentCreate, StaffEnrollmentUpdate, StaffEnrollmentOut
from app.schemas.masters.staff_attendance_schema import StaffAttendanceCreate, StaffAttendanceUpdate, StaffAttendanceOut
from app.service.masters.staff_service import (
    create_staff_enrollment, update_staff_enrollment, get_all_staff_enrollments,
    get_staff_enrollment_by_id, delete_staff_enrollment,
    create_staff_attendance, update_staff_attendance, get_all_staff_attendance,
    get_attendance_for_staff, delete_staff_attendance,
    get_attendance_for_staff
)

router = APIRouter(prefix="/staff", tags=["Staff"])

# -------------------- Staff Enrollment Endpoints --------------------

@router.post("/enrollment", response_model=StaffEnrollmentOut)
async def create_enrollment(data: StaffEnrollmentCreate, db: AsyncSession = Depends(get_db)):
    return await create_staff_enrollment(data, db)

@router.patch("/enrollment/{staff_id}", response_model=StaffEnrollmentOut)
async def update_enrollment(staff_id: int, data: StaffEnrollmentUpdate, db: AsyncSession = Depends(get_db)):
    return await update_staff_enrollment(staff_id, data, db)

@router.get("/enrollments", response_model=List[StaffEnrollmentOut])
async def list_enrollments(db: AsyncSession = Depends(get_db)):
    return await get_all_staff_enrollments(db)

@router.get("/enrollment/{staff_id}", response_model=StaffEnrollmentOut)
async def get_enrollment(staff_id: int, db: AsyncSession = Depends(get_db)):
    return await get_staff_enrollment_by_id(staff_id, db)

@router.delete("/enrollment/{staff_id}")
async def remove_enrollment(staff_id: int, db: AsyncSession = Depends(get_db)):
    return await delete_staff_enrollment(staff_id, db)

# -------------------- Staff Attendance Endpoints --------------------

@router.post("/attendance", response_model=StaffAttendanceOut)
async def create_attendance(data: StaffAttendanceCreate, db: AsyncSession = Depends(get_db)):
    return await create_staff_attendance(data, db)

@router.patch("/attendance/{attendance_id}", response_model=StaffAttendanceOut)
async def update_attendance(attendance_id: int, data: StaffAttendanceUpdate, db: AsyncSession = Depends(get_db)):
    return await update_staff_attendance(attendance_id, data, db)

@router.get("/attendance", response_model=List[StaffAttendanceOut])
async def list_attendance(db: AsyncSession = Depends(get_db)):
    return await get_all_staff_attendance(db)

@router.get("/attendance/{attendance_id}", response_model=StaffAttendanceOut)
async def get_attendance(attendance_id: int, db: AsyncSession = Depends(get_db)):
    return await get_attendance_for_staff(attendance_id, db)

@router.delete("/attendance/{attendance_id}")
async def remove_attendance(attendance_id: int, db: AsyncSession = Depends(get_db)):
    return await delete_staff_attendance(attendance_id, db)

# -------------------- Filter Staff Attendance by Date --------------------

@router.get("/{staff_id}/attendance/filter", response_model=List[StaffAttendanceOut])
async def filter_staff_attendance(
    staff_id: int,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await get_attendance_for_staff(staff_id, db, start_date, end_date)
