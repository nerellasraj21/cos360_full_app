from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import date
import enum
from uuid import UUID

from app.db.tenant_session import get_tenant_db
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error
from app.schemas.masters.staff_schema import StaffEnrollmentCreate, StaffEnrollmentUpdate, StaffEnrollmentOut,StaffOut,DesignationOut,DriverOut
from app.schemas.masters.staff_attendance_schema import StaffAttendanceCreate, StaffAttendanceUpdate, StaffAttendanceOut
from app.service.masters.staff_service import (
    create_staff_enrollment, update_staff_enrollment, get_all_staff_enrollments,
    get_staff_enrollment_by_id, delete_staff_enrollment,
    create_staff_attendance, update_staff_attendance, get_all_staff_attendance,
    get_attendance_for_staff, delete_staff_attendance,get_all_designations_list,
    get_attendance_for_staff, get_staff_list_by_gender,get_staff_details_by_designation,get_all_drivers_list
)

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
async def create_attendance(data: StaffAttendanceCreate, db: AsyncSession = Depends(get_tenant_db)):
    return await create_staff_attendance(data, db)

@router.patch("/attendance/{attendance_id}", response_model=StaffAttendanceOut)
async def update_attendance(attendance_id: UUID, data: StaffAttendanceUpdate, db: AsyncSession = Depends(get_tenant_db)):
    return await update_staff_attendance(attendance_id, data, db)

@router.get("/attendance", response_model=List[StaffAttendanceOut])
async def list_attendance(db: AsyncSession = Depends(get_tenant_db)):
    return await get_all_staff_attendance(db)

@router.get("/attendance/{attendance_id}", response_model=StaffAttendanceOut)
async def get_attendance(attendance_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    return await get_attendance_for_staff(attendance_id, db)

@router.delete("/attendance/{attendance_id}")
async def remove_attendance(attendance_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    return await delete_staff_attendance(attendance_id, db)

# -------------------- Filter Staff Attendance by Date --------------------

@router.get("/{staff_id}/attendance/filter", response_model=List[StaffAttendanceOut])
async def filter_staff_attendance(
    staff_id: UUID,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_tenant_db)
):
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

@router.get("/", response_model=List[DesignationOut])
async def get_all_designations(db: AsyncSession = Depends(get_tenant_db)):
    return await get_all_designations_list(db)

@router.get("/drivers", response_model=List[DriverOut])
async def get_all_drivers(db: AsyncSession = Depends(get_tenant_db)):
    return await get_all_drivers_list(db)