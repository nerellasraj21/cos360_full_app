import io
from datetime import date, datetime
from pathlib import Path
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db, get_tenant_id_from_request
from app.schemas.common.pagination_schema import PaginatedResponse
from app.schemas.student.admission_schema import (
    StudentAdmissionCreate,
    StudentAdmissionResponse,
    StudentAdmissionUpdate,
)
from app.schemas.student.student_schema import StudentDropdown, StudentSimpleDropdown, StudentOut
from app.service.student.admission_bulk_service import (
    generate_blank_template,
    generate_prefilled_template,
    parse_and_bulk_create_student_admissions,
)
from app.service.student.admission_service import (
    add_admission,
    delete_admission,
    generate_admission_number,
    get_admission_by_id_with_context,
    get_all_admissions_with_context,
    get_student_by_admission_id,
    search_students_with_context,
    toggle_student_active,
    update_partial_details_admission,
)
from app.service.student.student_service import (
    delete_student_photo,
    get_students_dropdown,
    get_students_simple_dropdown,
    upload_student_photo,
)
from app.tools.enhanced_permissions import check_user_resource_access
from app.tools.simple_permissions import (
    check_role_plan_permission_with_error,
    get_current_user_token,
)

router = APIRouter(prefix="/students/admission", tags=["Student/Student Admission"])

BULK_UPLOAD_TEMPLATE_PATH = (
    Path(__file__).resolve().parents[3] / "static" / "templates" / "student_admission_bulk_upload_template.xlsx"
)

# Note: All endpoints include explicit response_model declarations to ensure proper serialization
# of nested relationships (student, father, mother). This ensures Pydantic correctly serializes
# the complex Student object with its parent relationships for API responses.
# See: https://github.com/anthropics/claude-code/issues/[admission-details-missing]


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=StudentAdmissionResponse)
async def create_admission(
    admission: StudentAdmissionCreate, request: Request, db: AsyncSession = Depends(get_tenant_db)
):
    """Create a new student admission - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "student_admissions", "create")

    admission_response = await add_admission(admission, db, request)
    return admission_response


@router.post("/bulk-upload", status_code=status.HTTP_200_OK)
async def bulk_upload_admissions(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Bulk-create student admissions from the "Student Admission" sheet of the
    admission Excel template. Each row is validated and created independently;
    valid rows are created even if other rows fail.

    Returns: {"created": [...], "errors": [...], "total_rows": int}

    **Required Permission**: student_admissions:create
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    await check_role_plan_permission_with_error(db, request, role, "student_admissions", "create")

    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="File must be an Excel (.xlsx/.xls) file")

    file_bytes = await file.read()
    return await parse_and_bulk_create_student_admissions(file_bytes, db, request)


@router.get("/bulk-upload/template")
async def download_bulk_upload_template(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    include_data: bool = Query(False, description="Auto-fetch: pre-fill the template with existing admissions"),
):
    """
    Download the Excel template for bulk student admission upload.

    - include_data=false (default): blank template, for creating new admissions.
    - include_data=true ("Auto Fetch Details"): same template pre-filled with
      one row per existing admission, for review/export or re-upload after edits.

    **Required Permission**: student_admissions:create
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    await check_role_plan_permission_with_error(db, request, role, "student_admissions", "create")

    if include_data:
        xlsx_bytes = await generate_prefilled_template(db)
        return StreamingResponse(
            io.BytesIO(xlsx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": "attachment; filename=student_admission_bulk_upload_template.xlsx"
            },
        )

    if not BULK_UPLOAD_TEMPLATE_PATH.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Bulk upload template not found")

    xlsx_bytes = await generate_blank_template(db)
    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=student_admission_bulk_upload_template.xlsx"
        },
    )


@router.get("/next-admission-number")
async def get_next_admission_number(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    type: Literal["pre_primary", "regular"] = Query(
        "regular", description="Admission type: pre_primary or regular"
    ),
):
    """
    Preview next admission number (non-binding).

    Returns the next available admission number for the specified type:
    - Pre-Primary: {YEAR}{SEQ:04d} (e.g., 20260001), sequence resets every year
    - Regular: {SEQ:03d} (e.g., 001), sequence increments globally and never resets

    **Note**: This is a preview only. The actual number will be generated during admission creation.

    **Required Permission**: student_admissions:create
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "student_admissions", "create")

    # Generate preview number using current date
    preview_number = await generate_admission_number(db, datetime.now().date(), type)

    return {
        "next_number": preview_number,
        "format": "{YEAR}{SEQ:04d}" if type == "pre_primary" else "{SEQ:03d}",
        "type": type,
        "note": "Preview only. Actual number generated during admission creation.",
    }


@router.get("/id/{student_id}", response_model=StudentAdmissionResponse)
async def get_admission(student_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get admission by student ID with user access validation - All authenticated users"""

    # Enhanced permission check with entity-specific validation
    user_context = await check_user_resource_access(
        db, request, "student_admissions", "read", target_entity_id=student_id
    )

    # Use user-context aware service method
    return await get_admission_by_id_with_context(student_id, db, user_context, request)


@router.patch("/{student_id}", response_model=StudentAdmissionResponse)
async def update_admission(
    student_id: UUID, data: StudentAdmissionUpdate, request: Request, db: AsyncSession = Depends(get_tenant_db)
):
    """Update student admission with user access validation"""

    # Enhanced permission check with entity-specific validation
    await check_user_resource_access(db, request, "student_admissions", "update", target_entity_id=student_id)

    # Use existing service method (could be enhanced later if needed)
    updated_data = await update_partial_details_admission(student_id, data, db, request)
    return updated_data


# Get student by admission ID
@router.get("/by-admission/{admission_id}", response_model=StudentOut)
async def fetch_student_by_admission(admission_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get student by admission ID - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "student_admissions", "read")

    return await get_student_by_admission_id(admission_id, db, request)


# Search (get while typing)
@router.get("/search", response_model=list[StudentOut])
async def search_student_by_text(
    request: Request, db: AsyncSession = Depends(get_tenant_db), query: str = Query(..., min_length=1)
):
    """Search students with user-specific filtering - All authenticated users"""

    # Enhanced permission check with user context resolution
    user_context = await check_user_resource_access(db, request, "student_admissions", "list")

    # Use user-context aware service method
    return await search_students_with_context(query, db, user_context, request)


@router.get("/", response_model=PaginatedResponse[StudentAdmissionResponse], status_code=status.HTTP_200_OK)
async def list_admissions(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return"),
    class_id: UUID | None = Query(None, description="Filter by class ID"),
    section_id: UUID | None = Query(None, description="Filter by section ID"),
    as_of_date: date | None = Query(
        None, description="Exclude students who joined after this date (e.g. for a past attendance date)"
    ),
):
    """List student admissions with user-specific filtering - All authenticated users"""

    # Enhanced permission check with user context resolution
    user_context = await check_user_resource_access(db, request, "student_admissions", "list")

    # Use user-context aware service method
    return await get_all_admissions_with_context(db, user_context, skip, limit, class_id, section_id, as_of_date)


@router.delete("/{admission_id}", status_code=status.HTTP_200_OK, response_model=StudentAdmissionResponse)
async def delete_student_admission(admission_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Delete student admission and related data - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "student_admissions", "delete")

    return await delete_admission(admission_id, db)


@router.patch("/{student_id}/toggle-active", status_code=status.HTTP_200_OK, response_model=StudentAdmissionResponse)
async def toggle_student_active_status(student_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Toggle student active/inactive status - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    await check_role_plan_permission_with_error(db, request, role, "student_admissions", "update")

    return await toggle_student_active(student_id, db)


# Student Photo Endpoints


@router.post("/id/{student_id}/photo", response_model=StudentOut)
async def upload_photo(
    request: Request,
    student_id: UUID,
    photo: UploadFile = File(...),
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "student_admissions", "update")
    return await upload_student_photo(student_id, photo, db)


@router.delete("/id/{student_id}/photo")
async def remove_photo(request: Request, student_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "student_admissions", "update")
    return await delete_student_photo(student_id, db)


# Student Dropdown Endpoints
@router.get("/students/dropdown", response_model=list[StudentDropdown], status_code=status.HTTP_200_OK)
async def get_student_dropdown(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    class_id: UUID | None = Query(None, description="Filter by class ID"),
    section_id: UUID | None = Query(None, description="Filter by section ID"),
    active_only: bool = Query(True, description="Filter only active students"),
    as_of_date: date | None = Query(
        None, description="Exclude students who joined after this date (e.g. for a past attendance date)"
    ),
):
    """
    Get students dropdown data with display name including admission number.
    Returns students in format: "First Last (ADM001)"

    Supports filtering by:
    - class_id: Filter students by class
    - section_id: Filter students by section
    - active_only: Filter only active students (default: True)
    - as_of_date: Exclude students whose admission date is after this date

    **Required Permission**: students:list
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "students", "list")

    return await get_students_dropdown(db, class_id, section_id, active_only, as_of_date)


@router.get("/students/dropdown/simple", response_model=list[StudentSimpleDropdown], status_code=status.HTTP_200_OK)
async def get_student_simple_dropdown(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    class_id: UUID | None = Query(None, description="Filter by class ID"),
    section_id: UUID | None = Query(None, description="Filter by section ID"),
    active_only: bool = Query(True, description="Filter only active students"),
    as_of_date: date | None = Query(
        None, description="Exclude students who joined after this date (e.g. for a past attendance date)"
    ),
):
    """
    Get simple students dropdown data with just ID and name.
    Returns students in format: "First Last"

    Supports filtering by:
    - class_id: Filter students by class
    - section_id: Filter students by section
    - active_only: Filter only active students (default: True)
    - as_of_date: Exclude students whose admission date is after this date

    **Required Permission**: students:list
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "students", "list")

    return await get_students_simple_dropdown(db, class_id, section_id, active_only, as_of_date)


# User-Specific Self-Access Endpoints


@router.get("/my-admission")
async def get_my_admission(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get current user's own admission data - Student only endpoint"""

    # Enhanced permission check for student's own data
    user_context = await check_user_resource_access(db, request, "student_admissions", "read_own")

    if not user_context.student_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only students can access this endpoint")

    # Use user-context aware service method for student's own admission
    return await get_admission_by_id_with_context(user_context.student_id, db, user_context, request)


@router.get("/my-children-admissions")
async def get_my_children_admissions(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return"),
):
    """Get current user's children's admission data - Parent only endpoint"""

    # Enhanced permission check for parent's children data
    user_context = await check_user_resource_access(db, request, "student_admissions", "read_related")

    if not user_context.parent_id or not user_context.allowed_entity_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Only parents with children can access this endpoint"
        )

    # Use user-context aware service method for parent's children admissions
    return await get_all_admissions_with_context(db, user_context, skip, limit)


@router.get("/admission-types/dropdown")
async def get_admission_types_dropdown(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """
    Get admission type options for dropdown.

    Returns a list of all available admission types with:
    - value: The enum value for storage
    - label: Human-readable display text

    **Required Permission**: student_admissions:read
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "student_admissions", "read")

    return [
        {"value": "pre_primary", "label": "Pre Primary Admission"},
        {"value": "regular", "label": "Regular Admission"},
    ]


# Send Admission Confirmation SMS (MANUAL #1 re-send)
@router.post("/send-confirmation", status_code=status.HTTP_200_OK)
async def send_admission_confirmation(
    request: Request,
    admission_ids: list[UUID],
    db: AsyncSession = Depends(get_tenant_db),
):
    """Re-send admission confirmation SMS to parents — Admin only (USE CASE #1 MANUAL)"""
    import os
    import uuid as _uuid
    from sqlalchemy import select

    from app.models.communication.communication_model import NotificationQueue
    from app.models.masters.admission_model import Admission
    from app.models.masters.parent_model import Parent
    from app.models.student.student_model import Student
    from app.models.masters.student_parent_association_model import StudentParentLink
    from app.tasks.communication.send_tasks import send_notification_batch

    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    triggered_by = _uuid.UUID(current_user.get("sub"))

    await check_role_plan_permission_with_error(db, request, role, "student_admissions", "send_sms")

    queue_ids = []
    queued_count = 0
    skipped_count = 0

    for admission_id in admission_ids:
        try:
            admission_result = await db.execute(
                select(Admission).where(Admission.id == admission_id)
            )
            admission = admission_result.scalar_one_or_none()
            if not admission:
                skipped_count += 1
                continue

            student_result = await db.execute(select(Student).where(Student.id == admission.student_id))
            student = student_result.scalar_one_or_none()
            if not student:
                skipped_count += 1
                continue

            parent_result = await db.execute(
                select(Parent.name, Parent.phone)
                .select_from(StudentParentLink)
                .join(Parent, Parent.id == StudentParentLink.parent_id)
                .where(StudentParentLink.student_id == admission.student_id)
                .limit(1)
            )
            parent_row = parent_result.first()
            if not parent_row or not parent_row.phone:
                skipped_count += 1
                continue

            parent_name = parent_row.name or "Parent"
            student_name = f"{student.first_name} {student.last_name}"
            admission_no = admission.admission_number or "N/A"

            message = (
                f"Welcome! {student_name}'s admission (No. {admission_no}) "
                f"is confirmed. — COS360"
            )

            queue_entry = NotificationQueue(
                id=_uuid.uuid4(),
                template_id=None,
                recipient_name=parent_name,
                recipient_phone=parent_row.phone,
                channel="sms",
                rendered_message=message,
                status="queued",
                triggered_by=triggered_by,
                target_type="admission_confirmation",
                target_ref={
                    "msg91_template_id": os.environ.get("MSG91_TEMPLATE_ID_ADMISSION"),
                    "variables": {
                        "var1": student_name,
                        "var2": admission_no,
                        "var3": "N/A",
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
        "detail": f"Admission confirmation SMS queued for {queued_count} admission(s).",
    }
