from datetime import date
import enum
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
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
from app.service.masters.staff_service import (
    add_staff_qualification,
    create_staff_attendance,
    create_staff_enrollment,
    delete_staff_attendance,
    delete_staff_enrollment,
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
    update_staff_enrollment,
    update_staff_qualification,
)
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/staff", tags=["Staff"])


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
    await check_role_plan_permission_with_error(db, request, role, "staff", "list")

    return await get_all_drivers_list(db)
