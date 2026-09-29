import builtins
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_create, rate_limit_dropdown
from app.schemas.common.pagination_schema import PaginatedResponse
from app.schemas.masters.academic_year_schema import (
    AcademicYearCreate,
    AcademicYearDropdown,
    AcademicYearRead,
    AcademicYearUpdate,
)
from app.service.masters import academic_year_service

# Import the simplified permission system
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user

router = APIRouter(prefix="/masters/academic_years", tags=["Masters/Academic Years"])


@router.post("/", response_model=AcademicYearRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create(
    request: Request,
    academic_year: AcademicYearCreate,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Create a new academic year.

    Requires:
    - Authentication (valid JWT token)
    - Plan-level access to Academic Years menu
    - Role-level access to Academic Years menu with edit permission
    - Resource-level permission: academic_years:create

    Only Admin role has create permission.
    """
    # Multi-layer permission check: Role + Plan validation
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "academic_years", "create")

    return await academic_year_service.create_academic_year(db, academic_year)


@router.get("/", response_model=PaginatedResponse[AcademicYearRead])
@rate_limit_dropdown("100 per minute")
async def list(
    request: Request,
    skip: int = 0,
    limit: int = 10,
    active_only: bool = True,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get all academic years with pagination.

    Requires:
    - Authentication (valid JWT token)
    - Plan-level access to Academic Years menu
    - Role-level access to Academic Years menu with view permission
    - Resource-level permission: academic_years:list

    Available to Admin, Teacher, Student, Parent, Staff roles.
    """
    # Multi-layer permission check: Role + Plan validation
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "academic_years", "list")

    return await academic_year_service.get_all_academic_years(db, skip, limit, active_only)


@router.get("/dropdown", response_model=builtins.list[AcademicYearDropdown])
@rate_limit_dropdown("100 per minute")
async def get_dropdown(
    request: Request,
    active_only: bool = True,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get academic years for dropdown (id + title only).

    Requires:
    - Authentication (valid JWT token)
    - Plan-level access to Academic Years menu
    - Role-level access to Academic Years menu with view permission
    - Resource-level permission: academic_years:read

    Available to Admin, Teacher, Student, Parent, Staff roles.
    Rate limited to 100 requests per minute.
    """
    # Multi-layer permission check: Role + Plan validation
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "academic_years", "read")

    return await academic_year_service.get_academic_years_dropdown(db, active_only)


@router.get("/active", response_model=builtins.list[AcademicYearRead])
@rate_limit_dropdown("100 per minute")
async def get_active(
    request: Request, db: AsyncSession = Depends(get_tenant_db), current_user: dict = Depends(get_current_user)
):
    """
    Get only active academic years.

    Requires:
    - Authentication (valid JWT token)
    - Plan-level access to Academic Years menu
    - Role-level access to Academic Years menu with view permission
    - Resource-level permission: academic_years:read

    Available to Admin, Teacher, Student, Parent, Staff roles.
    Rate limited to 100 requests per minute.
    """
    # Multi-layer permission check: Role + Plan validation
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "academic_years", "read")

    return await academic_year_service.get_all_academic_years(db, skip=0, limit=100, active_only=True)


@router.get("/{academic_year_id}", response_model=AcademicYearRead)
async def read(
    request: Request,
    academic_year_id: UUID,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get a single academic year by ID.

    Requires:
    - Authentication (valid JWT token)
    - Plan-level access to Academic Years menu
    - Role-level access to Academic Years menu with view permission
    - Resource-level permission: academic_years:read

    Available to Admin, Teacher, Student, Parent, Staff roles.
    """
    # Multi-layer permission check: Role + Plan validation
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "academic_years", "read")

    academic_year = await academic_year_service.get_academic_year_by_id(db, academic_year_id)
    if not academic_year:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Academic Year not found")
    return academic_year


@router.put("/{academic_year_id}", response_model=AcademicYearRead)
async def update(
    request: Request,
    academic_year_id: UUID,
    academic_year_update: AcademicYearUpdate,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Update an academic year.

    Requires:
    - Authentication (valid JWT token)
    - Plan-level access to Academic Years menu
    - Role-level access to Academic Years menu with edit permission
    - Resource-level permission: academic_years:update

    Only Admin role has update permission.
    """
    # Multi-layer permission check: Role + Plan validation
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "academic_years", "update")

    updated_academic_year = await academic_year_service.update_academic_year(db, academic_year_id, academic_year_update)
    if not updated_academic_year:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Academic Year not found")
    return updated_academic_year


@router.delete("/{academic_year_id}", response_model=AcademicYearRead)
async def deactivate(
    request: Request,
    academic_year_id: UUID,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Deactivate/delete an academic year.

    Requires:
    - Authentication (valid JWT token)
    - Plan-level access to Academic Years menu
    - Role-level access to Academic Years menu with edit permission
    - Resource-level permission: academic_years:delete

    Only Admin role has delete permission.
    """
    # Multi-layer permission check: Role + Plan validation
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "academic_years", "delete")

    academic_year = await academic_year_service.deactivate_academic_year(db, academic_year_id)
    if not academic_year:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Academic Year not found")
    return academic_year


@router.delete("/{academic_year_id}/permanent", status_code=status.HTTP_200_OK)
async def delete_permanent(
    request: Request,
    academic_year_id: UUID,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Permanently delete an academic year (for testing purposes).

    Requires:
    - Authentication (valid JWT token)
    - Plan-level access to Academic Years menu
    - Role-level access to Academic Years menu with edit permission
    - Resource-level permission: academic_years:delete

    Only Admin role has delete permission.
    """
    # Multi-layer permission check: Role + Plan validation
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "academic_years", "delete")

    result = await academic_year_service.delete_academic_year(db, academic_year_id)
    return result
