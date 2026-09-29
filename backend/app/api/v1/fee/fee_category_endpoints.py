from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_create, rate_limit_dropdown
from app.schemas.fee.fee_category_schema import (
    FeeCategoryCreate,
    FeeCategoryDropdown,
    FeeCategoryRead,
    FeeCategoryUpdate,
)
from app.service.fee.fee_category_service import (
    create_fee_category,
    delete_fee_category,
    get_all_fee_categories,
    get_fee_categories_dropdown,
    get_fee_category_by_id,
    update_fee_category,
)
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/fee/categories", tags=["Fee/Fee Categories"])


@router.get("/health", status_code=status.HTTP_200_OK)
async def category_health_check():
    """Health check for fee category endpoints"""
    return {"status": "healthy", "module": "fee_categories", "timestamp": datetime.now()}


# Create Fee Category
@router.post("/", response_model=FeeCategoryRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create_fee_category_endpoint(
    request: Request, fee_category_data: FeeCategoryCreate, db: AsyncSession = Depends(get_tenant_db)
):
    """Create a new fee category. Rate limited to 30 creates per minute. Requires plan validation."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "fee_categories", "create")

    return await create_fee_category(db, fee_category_data)


# Get All Fee Categories
@router.get("/", response_model=list[FeeCategoryRead])
async def get_all_fee_categories_endpoint(
    request: Request,
    limit: int = Query(50, ge=1, le=500, description="Number of records to return (1-500)"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get all fee categories with their academic year titles and pagination"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "fee_categories", "list")

    return await get_all_fee_categories(db, limit, offset)


# Get Fee Categories for Dropdown
@router.get("/dropdown", response_model=list[FeeCategoryDropdown])
@rate_limit_dropdown("100 per minute")
async def get_fee_categories_dropdown_endpoint(
    request: Request,
    academic_year_id: UUID | None = Query(None, description="Filter by academic year ID"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get fee categories for dropdown (id + category_name only). Optionally filter by academic year. Rate limited to 100 requests per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "fee_categories", "list")

    return await get_fee_categories_dropdown(db, academic_year_id)


# Get Single Fee Category
@router.get("/{fee_category_id}", response_model=FeeCategoryRead)
async def get_fee_category_endpoint(request: Request, fee_category_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    """Get a specific fee category with its academic year title"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "fee_categories", "read")

    return await get_fee_category_by_id(db, fee_category_id)


# Update Fee Category
@router.put("/{fee_category_id}", response_model=FeeCategoryRead)
async def update_fee_category_endpoint(
    request: Request,
    fee_category_id: UUID,
    fee_category_data: FeeCategoryUpdate,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Update a fee category"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "fee_categories", "update")

    return await update_fee_category(db, fee_category_id, fee_category_data)


# Delete Fee Category
@router.delete("/{fee_category_id}", response_model=FeeCategoryRead, status_code=status.HTTP_200_OK)
async def delete_fee_category_endpoint(
    request: Request, fee_category_id: UUID, db: AsyncSession = Depends(get_tenant_db)
):
    """Delete a fee category"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "fee_categories", "delete")

    return await delete_fee_category(db, fee_category_id)
