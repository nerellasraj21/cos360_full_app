from datetime import date
import enum
import io
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db, get_tenant_id_from_request
from app.middleware.rate_limit_middleware import rate_limit_create, rate_limit_dropdown
from app.schemas.common.pagination_schema import PaginatedResponse
from app.schemas.masters.designation_schema import (
    DesignationCreate,
    DesignationDropdown,
    DesignationRead,
    DesignationUpdate,
)
from app.schemas.masters.staff_attendance_schema import StaffAttendanceCreate, StaffAttendanceOut, StaffAttendanceUpdate
from app.schemas.masters.staff_schema import (
    DesignationOut,
    DriverOut,
    StaffEnrollmentCreate,
    StaffEnrollmentOut,
    StaffEnrollmentUpdate,
    StaffOut,
    StaffQualificationCreate,
    StaffQualificationOut,
    StaffQualificationUpdate,
)
from app.service.masters.designation_service import (
    create_designation,
    delete_designation,
    get_all_designations,
    get_designation_by_id,
    get_designations_dropdown,
    update_designation,
)
from app.service.masters.staff_bulk_service import (
    generate_blank_staff_template,
    parse_and_bulk_create_staff_enrollments,
)
from app.service.masters.staff_service import (
    add_staff_qualification,
    create_staff_attendance,
    create_staff_enrollment,
    delete_staff_attendance,
    delete_staff_enrollment,
    delete_staff_photo,
    delete_staff_qualification,
    get_all_designations_list,
    get_all_drivers_list,
    get_all_staff_attendance,
    get_all_staff_enrollments,
    get_attendance_for_staff,
    get_staff_attendance_by_date,
    get_staff_attendance_by_id,
    get_staff_details_by_designation,
    get_staff_enrollment_by_id,
    get_staff_list_by_gender,
    get_staff_qualifications,
    update_staff_attendance,
    update_staff_attendance_by_date,
    update_staff_enrollment,
    update_staff_qualification,
    upload_staff_photo,
)
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/staff", tags=["Staff"])

BULK_UPLOAD_TEMPLATE_PATH = (
    Path(__file__).resolve().parents[3] / "static" / "templates" / "staff_bulk_upload_template.xlsx"
)


class GenderEnum(enum.Enum):
    Male = "Male"
    Female = "Female"
    Other = "Other"


# -------------------- Staff Enrollment Endpoints --------------------


@router.post("/enrollment", response_model=StaffEnrollmentOut)
async def create_enrollment(request: Request, data: StaffEnrollmentCreate, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "staff", "create")

    return await create_staff_enrollment(data, db)


@router.post("/enrollment/bulk-upload", status_code=status.HTTP_200_OK)
async def bulk_upload_enrollments(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Bulk-create staff enrollments from the "Staff Admission" sheet of the
    staff Excel template. Each row is validated and created independently;
    valid rows are created even if other rows fail.

    Mandatory columns: First Name, Email, Phone, Address.

    Returns: {"created": [...], "errors": [...], "total_rows": int}

    **Required Permission**: staff:create
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "staff", "create")

    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="File must be an Excel (.xlsx/.xls) file")

    file_bytes = await file.read()
    return await parse_and_bulk_create_staff_enrollments(file_bytes, db)


@router.get("/enrollment/bulk-upload/template")
async def download_staff_bulk_upload_template(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """
    Download the blank Excel template for bulk staff enrollment upload.
    Mandatory column headers (First Name, Phone, Address) are orange.

    **Required Permission**: staff:create
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "staff", "create")

    if not BULK_UPLOAD_TEMPLATE_PATH.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Bulk upload template not found")

    xlsx_bytes = await generate_blank_staff_template(db)
    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=staff_bulk_upload_template.xlsx"},
    )


@router.patch("/enrollment/{staff_id}", response_model=StaffEnrollmentOut)
async def update_enrollment(
    request: Request, staff_id: UUID, data: StaffEnrollmentUpdate, db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "staff", "update")

    return await update_staff_enrollment(staff_id, data, db)


@router.get("/enrollments", response_model=list[StaffEnrollmentOut])
async def list_enrollments(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "staff", "list")

    return await get_all_staff_enrollments(db)


@router.get("/enrollment/{staff_id}", response_model=StaffEnrollmentOut)
async def get_enrollment(request: Request, staff_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "staff", "read")

    return await get_staff_enrollment_by_id(staff_id, db)


@router.delete("/enrollment/{staff_id}")
async def remove_enrollment(request: Request, staff_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "staff", "delete")

    return await delete_staff_enrollment(staff_id, db)


# -------------------- Staff Photo Endpoints --------------------


@router.post("/enrollment/{staff_id}/photo", response_model=StaffEnrollmentOut)
async def upload_photo(
    request: Request,
    staff_id: UUID,
    photo: UploadFile = File(...),
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "staff", "update")
    return await upload_staff_photo(staff_id, photo, db)


@router.delete("/enrollment/{staff_id}/photo")
async def remove_photo(request: Request, staff_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "staff", "update")
    return await delete_staff_photo(staff_id, db)


# -------------------- Staff Attendance Endpoints --------------------


@router.post("/attendance", response_model=StaffAttendanceOut)
async def create_attendance(request: Request, data: StaffAttendanceCreate, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "staff_attendance", "create")

    return await create_staff_attendance(data, db)


@router.patch("/attendance/{attendance_id}", response_model=StaffAttendanceOut)
async def update_attendance(
    request: Request, attendance_id: UUID, data: StaffAttendanceUpdate, db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "staff_attendance", "update")

    return await update_staff_attendance(attendance_id, data, db)


@router.get("/attendance", response_model=list[StaffAttendanceOut])
async def list_attendance(
    request: Request,
    start_date: date | None = Query(None, description="Filter from date (YYYY-MM-DD)"),
    end_date: date | None = Query(None, description="Filter to date (YYYY-MM-DD)"),
    name: str | None = Query(None, description="Filter by staff name"),
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "staff_attendance", "list")

    return await get_all_staff_attendance(db, start_date, end_date, name)


@router.get("/attendance/{attendance_id}", response_model=StaffAttendanceOut)
async def get_attendance(request: Request, attendance_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "staff_attendance", "read")

    return await get_staff_attendance_by_id(attendance_id, db)


@router.delete("/attendance/{attendance_id}")
async def remove_attendance(request: Request, attendance_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "staff_attendance", "delete")

    return await delete_staff_attendance(attendance_id, db)


# Send Staff Attendance Summary SMS (MANUAL #4)
@router.post("/send-attendance-summary")
async def send_attendance_summary(
    request: Request,
    staff_ids: list[UUID],
    period: str = Query(..., description="Period (e.g., July, August, Half-Year)"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Send attendance summary SMS to staff — HR/Admin only (USE CASE #4)"""
    import os
    import uuid as _uuid
    from sqlalchemy import select

    from app.models.communication.communication_model import NotificationQueue
    from app.models.masters.staff_model import Staff
    from app.tasks.communication.send_tasks import send_notification_batch

    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    triggered_by = _uuid.UUID(current_user.get("sub"))

    await check_role_plan_permission_with_error(db, request, role, "staff_attendance", "send_sms")

    queue_ids = []
    queued_count = 0
    skipped_count = 0

    for staff_id in staff_ids:
        try:
            staff_result = await db.execute(
                select(Staff.phone, Staff.first_name, Staff.last_name).where(Staff.id == staff_id)
            )
            staff_row = staff_result.first()
            if not staff_row or not staff_row.phone:
                skipped_count += 1
                continue

            staff_name = f"{staff_row.first_name} {staff_row.last_name}"
            staff_phone = staff_row.phone

            message = (
                f"Dear {staff_name}, your {period} attendance summary is ready on the portal. "
                f"View on the app. — COS360"
            )

            queue_entry = NotificationQueue(
                id=_uuid.uuid4(),
                template_id=None,
                recipient_name=staff_name,
                recipient_phone=staff_phone,
                channel="sms",
                rendered_message=message,
                status="queued",
                triggered_by=triggered_by,
                target_type="staff_attendance_summary",
                target_ref={
                    "msg91_template_id": os.environ.get("MSG91_TEMPLATE_ID_STAFF_ATTENDANCE"),
                    "variables": {
                        "var1": staff_name,
                        "var2": period,
                    },
                },
            )
            db.add(queue_entry)
            queue_ids.append(str(queue_entry.id))
            queued_count += 1

        except Exception:
            skipped_count += 1
            continue

    await db.commit()

    if queue_ids:
        send_notification_batch.delay(queue_ids, "sms", get_tenant_id_from_request(request))

    return {
        "status": "queued",
        "queued_count": queued_count,
        "skipped_count": skipped_count,
        "detail": f"SMS queued for {queued_count} staff. {skipped_count} skipped.",
    }


# -------------------- Filter Staff Attendance by Date --------------------


@router.get("/{staff_id}/attendance/filter", response_model=list[StaffAttendanceOut])
async def filter_staff_attendance(
    request: Request,
    staff_id: UUID,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "staff_attendance", "list")

    return await get_attendance_for_staff(staff_id, db, start_date, end_date)


@router.get("/attendance/by-date/{attendance_date}", response_model=list[StaffAttendanceOut])
async def get_attendance_by_date(request: Request, attendance_date: date, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "staff_attendance", "list")

    return await get_staff_attendance_by_date(attendance_date, db)


@router.patch("/attendance/by-date/{attendance_date}", response_model=list[StaffAttendanceOut])
async def bulk_update_attendance_by_date(
    request: Request, attendance_date: date, attendance_updates: list[dict], db: AsyncSession = Depends(get_tenant_db)
):
    """Bulk update staff attendance records for a specific date"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    await check_role_plan_permission_with_error(db, request, role, "staff_attendance", "update")

    return await update_staff_attendance_by_date(attendance_date, attendance_updates, db)


@router.get("/", response_model=list[StaffOut])
async def get_staff_list(
    request: Request,
    gender: GenderEnum | None = Query(None, description="Filter by gender"),
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "staff", "list")

    return await get_staff_list_by_gender(gender, db)


@router.get("/by-designation")
async def get_staff_by_designation(
    request: Request,
    designation_id: UUID | None = Query(None, description="Filter staff by designation"),
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "staff", "list")

    return await get_staff_details_by_designation(designation_id, db)


# ===== STAFF QUALIFICATION ENDPOINTS =====


@router.post("/{staff_id}/qualifications", response_model=StaffQualificationOut, status_code=status.HTTP_201_CREATED)
async def add_qualification(
    request: Request, staff_id: UUID, data: StaffQualificationCreate, db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "staff", "update")
    return await add_staff_qualification(staff_id, data, db)


@router.get("/{staff_id}/qualifications", response_model=list[StaffQualificationOut])
async def list_qualifications(request: Request, staff_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "staff", "read")
    return await get_staff_qualifications(staff_id, db)


@router.put("/{staff_id}/qualifications/{qualification_id}", response_model=StaffQualificationOut)
async def update_qualification(
    request: Request,
    staff_id: UUID,
    qualification_id: UUID,
    data: StaffQualificationUpdate,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "staff", "update")
    return await update_staff_qualification(staff_id, qualification_id, data, db)


@router.delete("/{staff_id}/qualifications/{qualification_id}")
async def remove_qualification(
    request: Request, staff_id: UUID, qualification_id: UUID, db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "staff", "delete")
    return await delete_staff_qualification(staff_id, qualification_id, db)


# ===== DESIGNATION CRUD ENDPOINTS =====


# Create Designation
@router.post("/designations/", response_model=DesignationRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create_designation_endpoint(
    request: Request, designation_data: DesignationCreate, db: AsyncSession = Depends(get_tenant_db)
):
    """Create a new designation. Rate limited to 30 creates per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "designations", "create")

    return await create_designation(db, designation_data)


# Get All Designations with Pagination
@router.get("/designations/", response_model=PaginatedResponse[DesignationRead])
async def get_all_designations_endpoint(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get all designations with pagination"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "designations", "list")

    return await get_all_designations(db, skip, limit)


# Get Designations Dropdown
@router.get("/designations/dropdown", response_model=list[DesignationDropdown])
@rate_limit_dropdown("300 per minute")
async def get_designations_dropdown_endpoint(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get designations for dropdown selection. Rate limited to 300 requests per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "designations", "list")

    return await get_designations_dropdown(db)


# Get Single Designation
@router.get("/designations/{designation_id}", response_model=DesignationRead)
async def get_designation_endpoint(request: Request, designation_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    """Get a single designation by ID"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "designations", "read")

    return await get_designation_by_id(db, designation_id)


# Update Designation
@router.put("/designations/{designation_id}", response_model=DesignationRead)
async def update_designation_endpoint(
    request: Request,
    designation_id: UUID,
    designation_update: DesignationUpdate,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Update a designation"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "designations", "update")

    return await update_designation(db, designation_id, designation_update)


# Delete Designation
@router.delete("/designations/{designation_id}")
async def delete_designation_endpoint(
    request: Request, designation_id: UUID, db: AsyncSession = Depends(get_tenant_db)
):
    """Delete a designation"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "designations", "delete")

    return await delete_designation(db, designation_id)


# Legacy endpoint (kept for backward compatibility)
@router.get("/designations-legacy", response_model=list[DesignationOut])
async def get_all_designations_legacy(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Legacy endpoint - use /designations/ instead"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "designations", "list")

    return await get_all_designations_list(db)


@router.get("/drivers", response_model=list[DriverOut])
async def get_all_drivers(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "transport_trips", "read")

    return await get_all_drivers_list(db)


# Send Interview Call SMS (MANUAL #3)
@router.post("/send-interview-calls")
async def send_interview_calls(
    request: Request,
    candidate_ids: list[UUID],
    interview_date: str = Query(..., description="Interview date (YYYY-MM-DD)"),
    interview_time: str = Query(..., description="Interview time (HH:MM AM/PM)"),
    position: str = Query(..., description="Position name"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Send interview call SMS to candidates — HR/Recruiter only (USE CASE #3)"""
    import os
    import uuid as _uuid
    from sqlalchemy import select

    from app.models.communication.communication_model import NotificationQueue
    from app.models.masters.staff_model import Staff
    from app.tasks.communication.send_tasks import send_notification_batch

    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    triggered_by = _uuid.UUID(current_user.get("sub"))

    await check_role_plan_permission_with_error(db, request, role, "staff_enrollment", "send_sms")

    queue_ids = []
    queued_count = 0
    skipped_count = 0

    for candidate_id in candidate_ids:
        try:
            staff_result = await db.execute(
                select(Staff.phone, Staff.first_name, Staff.last_name).where(Staff.id == candidate_id)
            )
            staff_row = staff_result.first()
            if not staff_row or not staff_row.phone:
                skipped_count += 1
                continue

            candidate_name = f"{staff_row.first_name} {staff_row.last_name}"
            candidate_phone = staff_row.phone

            message = (
                f"Dear {candidate_name}, your interview for {position} "
                f"is on {interview_date} at {interview_time}. — COS360"
            )

            queue_entry = NotificationQueue(
                id=_uuid.uuid4(),
                template_id=None,
                recipient_name=candidate_name,
                recipient_phone=candidate_phone,
                channel="sms",
                rendered_message=message,
                status="queued",
                triggered_by=triggered_by,
                target_type="interview_call",
                target_ref={
                    "msg91_template_id": os.environ.get("MSG91_TEMPLATE_ID_STAFF_INTERVIEW"),
                    "variables": {
                        "var1": candidate_name,
                        "var2": interview_date,
                        "var3": interview_time,
                        "var4": position,
                    },
                },
            )
            db.add(queue_entry)
            queue_ids.append(str(queue_entry.id))
            queued_count += 1

        except Exception:
            skipped_count += 1
            continue

    await db.commit()

    if queue_ids:
        send_notification_batch.delay(queue_ids, "sms", get_tenant_id_from_request(request))

    return {
        "status": "queued",
        "queued_count": queued_count,
        "skipped_count": skipped_count,
        "detail": f"SMS queued for {queued_count} candidate(s). {skipped_count} skipped.",
    }
