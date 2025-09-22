from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import date
from app.db.tenant_session import get_tenant_db
from app.schemas.student.attendance_schema import (
    StudentAttendanceCreate,
    StudentAttendanceOut,
    StudentAttendanceUpdate
)
from uuid import UUID
from app.service.student.student_attendance_service import (
    add_attendance, get_attendance_by_id, get_attendances, delete_attendance_data,
    update_partial_details_attendance, get_all_student_attendance_with_filters,
    get_attendance_for_student, get_attendance_by_date, update_attendance_by_date
)
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error

router = APIRouter(prefix="/student/attendance", tags=["Student/Student Attendance"])

# Create Attendance
@router.post("/", response_model=StudentAttendanceOut, status_code=status.HTTP_201_CREATED)
async def create_attendance(attendance: StudentAttendanceCreate, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Create student attendance - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_attendance', 'create')
    
    return await add_attendance(attendance, db, request)

# Get All Attendance Records
@router.get("/", response_model=list[StudentAttendanceOut])
async def get_all_attendance(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get all attendance records - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_attendance', 'list')
    
    return await get_attendances(db, request)

# -------------------- Enhanced Date-based Endpoints --------------------

# Get Attendance by ID
@router.get("/{attendance_id}", response_model=StudentAttendanceOut)
async def get_attendance(attendance_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get attendance by ID - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_attendance', 'read')
    
    return await get_attendance_by_id(attendance_id, db, request)

# Get all attendance with optional date filtering
@router.get("/search", response_model=List[StudentAttendanceOut])
async def get_attendance_with_filters(
    request: Request,
    start_date: Optional[date] = Query(None, description="Filter from this date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter to this date (YYYY-MM-DD)"),
    student_name: Optional[str] = Query(None, description="Filter by student name"),
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get all attendance records with optional date and student filtering"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    await check_role_plan_permission_with_error(db, request, role, 'student_attendance', 'list')

    return await get_all_student_attendance_with_filters(db, start_date, end_date, student_name, request)

# Update Attendance (PATCH)
@router.patch("/{attendance_id}", response_model=StudentAttendanceOut)
async def update_attendance(attendance_id: UUID, update_data: StudentAttendanceUpdate, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Update attendance - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_attendance', 'update')
    
    return await update_partial_details_attendance(attendance_id, update_data, db, request)

# Delete Attendance
@router.delete("/{attendance_id}")
async def delete_attendance(attendance_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Delete attendance - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_attendance', 'delete')
    
    return await delete_attendance_data(attendance_id, db, request)

# Get attendance for specific student with date filtering
@router.get("/student/{student_id}/filter", response_model=List[StudentAttendanceOut])
async def filter_student_attendance(
    request: Request,
    student_id: UUID,
    start_date: Optional[date] = Query(None, description="Filter from this date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter to this date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get attendance records for a specific student with optional date filtering"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    await check_role_plan_permission_with_error(db, request, role, 'student_attendance', 'list')

    return await get_attendance_for_student(student_id, db, start_date, end_date, request)

# Get attendance by specific date
@router.get("/by-date/{attendance_date}", response_model=List[StudentAttendanceOut])
async def get_attendance_for_date(
    request: Request,
    attendance_date: date,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get all attendance records for a specific date"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    await check_role_plan_permission_with_error(db, request, role, 'student_attendance', 'list')

    return await get_attendance_by_date(db, attendance_date, request)

# Bulk update attendance for a specific date
@router.patch("/by-date/{attendance_date}", response_model=List[StudentAttendanceOut])
async def update_attendance_for_date(
    request: Request,
    attendance_date: date,
    attendance_updates: List[dict],
    db: AsyncSession = Depends(get_tenant_db)
):
    """Bulk update attendance records for a specific date"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    await check_role_plan_permission_with_error(db, request, role, 'student_attendance', 'update')

    return await update_attendance_by_date(db, attendance_date, attendance_updates, request)
