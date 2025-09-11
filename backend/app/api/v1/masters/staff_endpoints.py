from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import date
import enum
from uuid import UUID

from app.db.tenant_session import get_tenant_db
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error
from app.schemas.masters.staff_schema import StaffEnrollmentCreate, StaffEnrollmentUpdate, StaffEnrollmentOut,StaffOut,DesignationOut,DriverOut
from app.schemas.masters.designation_schema import (
    DesignationCreate,
    DesignationRead,
    DesignationUpdate,
    DesignationDropdown
)
from app.schemas.common.pagination_schema import PaginatedResponse
from app.schemas.masters.staff_attendance_schema import StaffAttendanceCreate, StaffAttendanceUpdate, StaffAttendanceOut
from app.service.masters.staff_service import (
    create_staff_enrollment, update_staff_enrollment, get_all_staff_enrollments,
    get_staff_enrollment_by_id, delete_staff_enrollment,
    create_staff_attendance, update_staff_attendance, get_all_staff_attendance,
    get_attendance_for_staff, delete_staff_attendance,get_all_designations_list,
    get_attendance_for_staff, get_staff_list_by_gender,get_staff_details_by_designation,get_all_drivers_list
)
from app.service.masters.designation_service import (
    create_designation,
    get_designation_by_id,
    get_all_designations,
    get_designations_dropdown,
    update_designation,
    delete_designation
)
from app.middleware.rate_limit_middleware import rate_limit_dropdown, rate_limit_api, rate_limit_create

router = APIRouter(prefix="/staff", tags=["Staff"])

class GenderEnum(enum.Enum):
    male = "male"
    female = "female"
    other = "other"

# -------------------- Staff Enrollment Endpoints --------------------

@router.post("/enrollment", response_model=StaffEnrollmentOut)
async def create_enrollment(request: Request, data: StaffEnrollmentCreate, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'staff', 'create')
    
    return await create_staff_enrollment(data, db)

@router.patch("/enrollment/{staff_id}", response_model=StaffEnrollmentOut)
async def update_enrollment(request: Request, staff_id: UUID, data: StaffEnrollmentUpdate, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'staff', 'update')
    
    return await update_staff_enrollment(staff_id, data, db)

@router.get("/enrollments", response_model=List[StaffEnrollmentOut])
async def list_enrollments(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'staff', 'list')
    
    return await get_all_staff_enrollments(db)

@router.get("/enrollment/{staff_id}", response_model=StaffEnrollmentOut)
async def get_enrollment(request: Request, staff_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'staff', 'read')
    
    return await get_staff_enrollment_by_id(staff_id, db)

@router.delete("/enrollment/{staff_id}")
async def remove_enrollment(request: Request, staff_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'staff', 'delete')
    
    return await delete_staff_enrollment(staff_id, db)

# -------------------- Staff Attendance Endpoints --------------------

@router.post("/attendance", response_model=StaffAttendanceOut)
async def create_attendance(request: Request, data: StaffAttendanceCreate, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'staff_attendance', 'create')
    
    return await create_staff_attendance(data, db)

@router.patch("/attendance/{attendance_id}", response_model=StaffAttendanceOut)
async def update_attendance(request: Request, attendance_id: UUID, data: StaffAttendanceUpdate, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'staff_attendance', 'update')
    
    return await update_staff_attendance(attendance_id, data, db)

@router.get("/attendance", response_model=List[StaffAttendanceOut])
async def list_attendance(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'staff_attendance', 'list')
    
    return await get_all_staff_attendance(db)

@router.get("/attendance/{attendance_id}", response_model=StaffAttendanceOut)
async def get_attendance(request: Request, attendance_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'staff_attendance', 'read')
    
    return await get_attendance_for_staff(attendance_id, db)

@router.delete("/attendance/{attendance_id}")
async def remove_attendance(request: Request, attendance_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'staff_attendance', 'delete')
    
    return await delete_staff_attendance(attendance_id, db)

# -------------------- Filter Staff Attendance by Date --------------------

@router.get("/{staff_id}/attendance/filter", response_model=List[StaffAttendanceOut])
async def filter_staff_attendance(
    request: Request,
    staff_id: UUID,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'staff_attendance', 'list')
    
    return await get_attendance_for_staff(staff_id, db, start_date, end_date)

@router.get("/", response_model=List[StaffOut])
async def get_staff_list(
    request: Request,
    gender: Optional[GenderEnum] = Query(None, description="Filter by gender"),
    db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'staff', 'list')
    
    return await get_staff_list_by_gender(gender,db)

@router.get("/by-designation")
async def get_staff_by_designation(
    request: Request,
    designation_id: Optional[UUID] = Query(None, description="Filter staff by designation"),
    db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'staff', 'list')
    
    return await get_staff_details_by_designation(designation_id,db)

# ===== DESIGNATION CRUD ENDPOINTS =====

# Create Designation
@router.post("/designations/", response_model=DesignationRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create_designation_endpoint(request: Request,
    designation_data: DesignationCreate,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Create a new designation. Rate limited to 30 creates per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'designations', 'create')
    
    return await create_designation(db, designation_data)

# Get All Designations with Pagination
@router.get("/designations/", response_model=PaginatedResponse[DesignationRead])
async def get_all_designations_endpoint(request: Request,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return"),
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get all designations with pagination"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'designations', 'list')
    
    return await get_all_designations(db, skip, limit)

# Get Designations Dropdown
@router.get("/designations/dropdown", response_model=List[DesignationDropdown])
@rate_limit_dropdown("300 per minute")
async def get_designations_dropdown_endpoint(request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get designations for dropdown selection. Rate limited to 300 requests per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'designations', 'list')
    
    return await get_designations_dropdown(db)

# Get Single Designation
@router.get("/designations/{designation_id}", response_model=DesignationRead)
async def get_designation_endpoint(request: Request,
    designation_id: UUID,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get a single designation by ID"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'designations', 'read')
    
    return await get_designation_by_id(db, designation_id)

# Update Designation
@router.put("/designations/{designation_id}", response_model=DesignationRead)
async def update_designation_endpoint(request: Request,
    designation_id: UUID,
    designation_update: DesignationUpdate,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Update a designation"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'designations', 'update')
    
    return await update_designation(db, designation_id, designation_update)

# Delete Designation
@router.delete("/designations/{designation_id}")
async def delete_designation_endpoint(request: Request,
    designation_id: UUID,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Delete a designation"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'designations', 'delete')
    
    return await delete_designation(db, designation_id)

# Legacy endpoint (kept for backward compatibility)
@router.get("/designations-legacy", response_model=List[DesignationOut])
async def get_all_designations_legacy(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Legacy endpoint - use /designations/ instead"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'designations', 'list')
    
    return await get_all_designations_list(db)

@router.get("/drivers", response_model=List[DriverOut])
async def get_all_drivers(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'staff', 'list')
    
    return await get_all_drivers_list(db)