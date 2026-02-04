from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.db.tenant_session import get_tenant_db
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error
from app.schemas.common.pagination_schema import PaginatedResponse
from app.schemas.masters.subject_category_schema import (
    SubjectCategoryCreate,
    SubjectCategoryOut,
    SubjectCategoryUpdate,
    SubjectCategoryDropdown
)
from app.service.masters.subject_category_service import (
    create_subject_category, 
    get_all_subject_categories, 
    get_subject_categories_dropdown,
    get_subject_category_by_id,
    update_subject_category,
    delete_subject_category
)
from app.middleware.rate_limit_middleware import rate_limit_dropdown, rate_limit_create

# router = APIRouter()
router = APIRouter(prefix="/masters/subject_categories", tags=["Masters/SubjectCategories"])

# Alias router for frontend compatibility (inline category creation)
# Frontend expects: POST /api/v1/subject-categories
subject_categories_alias_router = APIRouter(prefix="/subject-categories", tags=["Subject Categories"])

@router.post("/categories", response_model=SubjectCategoryOut)
@rate_limit_create("30 per minute")
async def create_category(request: Request, data: SubjectCategoryCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Create a new subject category. Rate limited to 30 creates per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'subject_categories', 'create')
    
    return await create_subject_category(db, data)

@router.get("/categories", response_model=PaginatedResponse[SubjectCategoryOut])
async def list_categories(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get all subject categories with pagination"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'subject_categories', 'list')

    return await get_all_subject_categories(db, skip=skip, limit=limit)

@router.get("/categories/dropdown", response_model=List[SubjectCategoryDropdown])
@rate_limit_dropdown("100 per minute")
async def get_categories_dropdown(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get subject categories for dropdown (id + name only). Rate limited to 100 requests per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'subject_categories', 'list')
    
    return await get_subject_categories_dropdown(db)

# Get Single Subject Category
@router.get("/categories/{category_id}", response_model=SubjectCategoryOut)
async def get_category(request: Request, category_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    """Get a single subject category by ID"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'subject_categories', 'read')
    
    return await get_subject_category_by_id(db, category_id)

# Update Subject Category
@router.put("/categories/{category_id}", response_model=SubjectCategoryOut)
async def update_category(request: Request, 
    category_id: UUID, 
    category_update: SubjectCategoryUpdate, 
    db: AsyncSession = Depends(get_tenant_db)
):
    """Update a subject category"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'subject_categories', 'update')
    
    return await update_subject_category(db, category_id, category_update)

# Delete Subject Category
@router.delete("/categories/{category_id}", status_code=status.HTTP_200_OK)
async def delete_category(request: Request,
    category_id: UUID,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Delete a subject category"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'subject_categories', 'delete')

    return await delete_subject_category(db, category_id)


# ============================================================================
# Alias endpoints for frontend compatibility (inline category creation)
# These map /api/v1/subject-categories to existing service functions
# ============================================================================

@subject_categories_alias_router.post("", response_model=SubjectCategoryOut, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create_category_alias(request: Request, data: SubjectCategoryCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Create a new subject category (alias endpoint for frontend inline creation)."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    await check_role_plan_permission_with_error(db, request, role, 'subject_categories', 'create')

    return await create_subject_category(db, data)


@subject_categories_alias_router.get("", response_model=PaginatedResponse[SubjectCategoryOut])
async def list_categories_alias(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get all subject categories with pagination (alias endpoint)."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    await check_role_plan_permission_with_error(db, request, role, 'subject_categories', 'list')

    return await get_all_subject_categories(db, skip=skip, limit=limit)
