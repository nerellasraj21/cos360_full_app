from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.schemas.student.attendance_schema import StudentAttendanceCreate, StudentAttendanceOut, StudentAttendanceUpdate
from app.service.student.student_attendance_service import (
    add_attendance,
    delete_attendance_data,
    get_all_student_attendance_with_filters,
    get_attendance_by_date,
    get_attendance_by_id,
    get_attendance_for_student,
    get_attendances,
    update_attendance_by_date,
    update_partial_details_attendance,
)
from app.tools.enhanced_permissions import check_user_resource_access
from app.tools.simple_permissions import (
    check_role_plan_permission_with_error,
    get_current_user_token,
)

router = APIRouter(prefix="/student/attendance", tags=["Student/Student Attendance"])


# Create Attendance
@router.post("/", response_model=StudentAttendanceOut, status_code=status.HTTP_201_CREATED)
async def create_attendance(
    attendance: StudentAttendanceCreate, request: Request, db: AsyncSession = Depends(get_tenant_db)
):
    """Create student attendance - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "student_attendance", "create")

    return await add_attendance(attendance, db, request)


# Get All Attendance Records
@router.get("/", response_model=list[StudentAttendanceOut])
async def get_all_attendance(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get all attendance records - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "student_attendance", "list")

    return await get_attendances(db, request)


# -------------------- Enhanced Date-based Endpoints --------------------


# Get all attendance with optional date filtering
@router.get("/search", response_model=list[StudentAttendanceOut])
async def get_attendance_with_filters(
    request: Request,
    start_date: date | None = Query(None, description="Filter from this date (YYYY-MM-DD)"),
    end_date: date | None = Query(None, description="Filter to this date (YYYY-MM-DD)"),
    student_name: str | None = Query(None, description="Filter by student name"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get all attendance records with optional date and student filtering"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    await check_role_plan_permission_with_error(db, request, role, "student_attendance", "list")

    return await get_all_student_attendance_with_filters(db, start_date, end_date, student_name, request)


# Get own attendance — for Student role (automatically filters to logged-in student)
# MUST be defined BEFORE /{attendance_id} so FastAPI doesn't swallow it as a UUID param
@router.get("/my-attendance", response_model=list[StudentAttendanceOut])
async def get_my_attendance(
    request: Request,
    start_date: date = Query(..., description="Start date (YYYY-MM-DD) — required"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD) — required"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get attendance for the currently logged-in student within the given date range.
    Student role: automatically uses their own student_id.
    Admin/Teacher: must use /student/{student_id}/filter instead.
    """
    user_context = await check_user_resource_access(db, request, "student_attendance", "read_own")
    if not user_context.student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can access this endpoint")
    return await get_attendance_for_student(user_context.student_id, db, start_date, end_date, request)


# Get Attendance by ID
@router.get("/{attendance_id}", response_model=StudentAttendanceOut)
async def get_attendance(attendance_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get attendance by ID - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "student_attendance", "read")

    return await get_attendance_by_id(attendance_id, db, request)


# Update Attendance (PATCH)
@router.patch("/{attendance_id}", response_model=StudentAttendanceOut)
async def update_attendance(
    attendance_id: UUID,
    update_data: StudentAttendanceUpdate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Update attendance - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "student_attendance", "update")

    return await update_partial_details_attendance(attendance_id, update_data, db, request)


# Delete Attendance
@router.delete("/{attendance_id}")
async def delete_attendance(attendance_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Delete attendance - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "student_attendance", "delete")

    return await delete_attendance_data(attendance_id, db, request)


# Get attendance for specific student with date filtering
@router.get("/student/{student_id}/filter", response_model=list[StudentAttendanceOut])
async def filter_student_attendance(
    request: Request,
    student_id: UUID,
    start_date: date = Query(..., description="Start date (YYYY-MM-DD) — required"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD) — required"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get attendance records for a specific student within the given date range.
    Students can only filter their own student_id. Admin/Teacher can use any student_id.
    """
    user_context = await check_user_resource_access(db, request, "student_attendance", "list")
    # For Student role: validate they are only requesting their own data
    if user_context.access_scope == "own" and user_context.student_id != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own attendance records"
        )

    return await get_attendance_for_student(student_id, db, start_date, end_date, request)


# Get attendance by specific date
@router.get("/by-date/{attendance_date}", response_model=list[StudentAttendanceOut])
async def get_attendance_for_date(request: Request, attendance_date: date, db: AsyncSession = Depends(get_tenant_db)):
    """Get all attendance records for a specific date"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    await check_role_plan_permission_with_error(db, request, role, "student_attendance", "list")

    return await get_attendance_by_date(db, attendance_date, request)


# Bulk update attendance for a specific date
@router.patch("/by-date/{attendance_date}", response_model=list[StudentAttendanceOut])
async def update_attendance_for_date(
    request: Request, attendance_date: date, attendance_updates: list[dict], db: AsyncSession = Depends(get_tenant_db)
):
    """Bulk update attendance records for a specific date"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    await check_role_plan_permission_with_error(db, request, role, "student_attendance", "update")

    return await update_attendance_by_date(db, attendance_date, attendance_updates, request)
