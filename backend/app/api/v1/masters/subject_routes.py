from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_create, rate_limit_dropdown
from app.schemas.common.pagination_schema import PaginatedResponse
from app.schemas.masters.subject_schema import SubjectCreate, SubjectDropdown, SubjectRead, SubjectUpdate
from app.service.masters.subject_service import (
    create_subject,
    deactivate_subject,
    get_all_subjects,
    get_subject_by_id,
    get_subjects_by_category_id,
    get_subjects_by_category_id_dropdown,
    get_subjects_dropdown,
    update_subject,
)
from app.tools.simple_permissions import (
    check_role_plan_permission_with_error,
    get_current_user_token,
)

router = APIRouter(prefix="/masters/subjects", tags=["Masters/Subjects"])


@router.post("/", response_model=SubjectRead)
@rate_limit_create("30 per minute")
async def create(request: Request, subject: SubjectCreate, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "subjects", "create")

    return await create_subject(db, subject, request)


@router.get("/", response_model=list[SubjectRead])
async def list_all(
    request: Request, active_only: bool = True, academic_year_id: UUID = None, db: AsyncSession = Depends(get_tenant_db)
):
    """Get all subjects as a simple array (non-paginated)"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "subjects", "list")

    result = await get_all_subjects(db, 0, 1000, active_only, academic_year_id, request)
    return result["items"]


@router.get("/paginated", response_model=PaginatedResponse[SubjectRead])
async def list_paginated(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    academic_year_id: UUID = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get subjects with pagination"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "subjects", "list")

    return await get_all_subjects(db, skip, limit, active_only, academic_year_id, request)


@router.get("/dropdown", response_model=list[SubjectDropdown])
@rate_limit_dropdown("100 per minute")
async def get_subjects_dropdown_endpoint(
    request: Request, active_only: bool = True, db: AsyncSession = Depends(get_tenant_db)
):
    """Get subjects for dropdown (id + name only). Rate limited to 100 requests per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "subjects", "list")

    return await get_subjects_dropdown(db, active_only)


@router.get("/categories", response_model=list[dict])
async def get_categories(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get all subject categories"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "subjects", "list")

    # Import here to avoid circular import
    from app.service.masters.subject_category_service import get_all_subject_categories

    return await get_all_subject_categories(db)


@router.get("/by-academic-year/{year_id}", response_model=list[SubjectRead])
async def get_by_academic_year(request: Request, year_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    """Get subjects by academic year ID"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "subjects", "list")

    return await get_all_subjects(db, skip=0, limit=1000, active_only=True, academic_year_id=year_id)


@router.get("/{subject_id}", response_model=SubjectRead)
async def read(request: Request, subject_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "subjects", "read")

    subject = await get_subject_by_id(db, subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject


@router.put("/{subject_id}", response_model=SubjectRead)
async def update(
    request: Request, subject_id: UUID, subject_update: SubjectUpdate, db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "subjects", "update")

    return await update_subject(db, subject_id, subject_update)


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate(request: Request, subject_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "subjects", "delete")

    await deactivate_subject(db, subject_id)


@router.get("/categories/{category_id}/subjects", response_model=list[SubjectRead])
async def get_subjects_by_category(
    request: Request, category_id: UUID, db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "subjects", "list")
    return await get_subjects_by_category_id(category_id, db)


@router.get("/categories/{category_id}/subjects/dropdown", response_model=list[SubjectDropdown])
@rate_limit_dropdown("100 per minute")
async def get_subjects_by_category_dropdown(
    request: Request, category_id: UUID, db: AsyncSession = Depends(get_tenant_db)
):
    """Get subjects by category ID for dropdown (id + name only). Rate limited to 100 requests per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "subjects", "list")
    return await get_subjects_by_category_id_dropdown(category_id, db)
