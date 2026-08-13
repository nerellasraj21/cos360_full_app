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


# Send Absence Alert SMS (MANUAL #2)
@router.post("/send-absence-alerts")
async def send_absence_alerts(
    request: Request,
    student_ids: list[UUID],
    attendance_date: date = Query(..., description="Date of absence (YYYY-MM-DD)"),
    reason: str | None = Query(None, description="Reason for absence"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Send SMS to parents of absent students — Teacher/Admin only (USE CASE #2)"""
    import os
    import uuid as _uuid
    from sqlalchemy import select

    from app.models.communication.communication_model import NotificationQueue
    from app.models.masters.parent_model import Parent
    from app.models.student.student_model import Student
    from app.models.student.student_parent_association_model import StudentParentLink
    from app.tasks.communication.send_tasks import send_notification_batch

    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    triggered_by = _uuid.UUID(current_user.get("sub"))

    await check_role_plan_permission_with_error(db, request, role, "student_attendance", "send_sms")

    queue_ids = []
    queued_count = 0
    skipped_count = 0

    for student_id in student_ids:
        try:
            student_result = await db.execute(select(Student).where(Student.id == student_id))
            student = student_result.scalar_one_or_none()
            if not student:
                skipped_count += 1
                continue

            parent_result = await db.execute(
                select(Parent.name, Parent.phone)
                .select_from(StudentParentLink)
                .join(Parent, Parent.id == StudentParentLink.parent_id)
                .where(StudentParentLink.student_id == student_id)
                .limit(1)
            )
            parent_row = parent_result.first()
            if not parent_row or not parent_row.phone:
                skipped_count += 1
                continue

            parent_name = parent_row.name or "Parent"
            parent_phone = parent_row.phone
            student_name = f"{student.first_name} {student.last_name}"

            reason_str = f"({reason})" if reason else ""
            message = (
                f"Dear {parent_name}, your ward {student_name} "
                f"was marked absent today, {attendance_date.strftime('%d-%b')}. {reason_str} — COS360"
            )

            queue_entry = NotificationQueue(
                id=_uuid.uuid4(),
                template_id=None,
                recipient_name=parent_name,
                recipient_phone=parent_phone,
                channel="sms",
                rendered_message=message,
                status="queued",
                triggered_by=triggered_by,
                target_type="student_absence",
                target_ref={
                    "msg91_template_id": os.environ.get("MSG91_TEMPLATE_ID_ABSENTEE"),
                    "variables": {
                        "var1": student_name,
                        "var2": attendance_date.strftime("%d-%b-%Y"),
                        "var3": reason or "Not specified",
                    },
                },
            )
            db.add(queue_entry)
            queue_ids.append(str(queue_entry.id))
            queued_count += 1

        except Exception as e:
            skipped_count += 1
            continue

    await db.commit()

    if queue_ids:
        send_notification_batch.delay(queue_ids, "sms", request.headers.get("cschema", "public"))

    return {
        "status": "queued",
        "queued_count": queued_count,
        "skipped_count": skipped_count,
        "detail": f"SMS queued for {queued_count} student(s). {skipped_count} skipped (no phone/not found).",
    }
