from fastapi import HTTPException, status, APIRouter, Depends, Query, Request
from app.schemas.fee.fee_category_schema import (
    FeeCategoryCreate, 
    FeeCategoryRead, 
    FeeCategoryUpdate,
    FeeCategoryDropdown
)
from app.db.tenant_session import get_tenant_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.service.fee.fee_category_service import (
    create_fee_category,
    get_fee_category_by_id,
    get_all_fee_categories,
    get_fee_categories_dropdown,
    update_fee_category,
    delete_fee_category
)
from app.middleware.rate_limit_middleware import rate_limit_dropdown, rate_limit_api, rate_limit_create
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error
from typing import List, Optional
from uuid import UUID

router = APIRouter(prefix="/fee/categories", tags=["Fee/Fee Categories"])

# Create Fee Category
@router.post("/", response_model=FeeCategoryRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create_fee_category_endpoint(request: Request, 

    fee_category_data: FeeCategoryCreate, 
    db: AsyncSession = Depends(get_tenant_db)
):
    """Create a new fee category. Rate limited to 30 creates per minute. Requires plan validation."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_categories', 'create')
    
    return await create_fee_category(db, fee_category_data)

# Get All Fee Categories
@router.get("/", response_model=List[FeeCategoryRead])
async def get_all_fee_categories_endpoint(request: Request, 

    db: AsyncSession = Depends(get_tenant_db)
):
    """Get all fee categories with their academic year titles"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_categories', 'list')
    
    return await get_all_fee_categories(db)

# Get Fee Categories for Dropdown
@router.get("/dropdown", response_model=List[FeeCategoryDropdown])
@rate_limit_dropdown("100 per minute")
async def get_fee_categories_dropdown_endpoint(request: Request, 

    academic_year_id: Optional[UUID] = Query(None, description="Filter by academic year ID"),
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get fee categories for dropdown (id + category_name only). Optionally filter by academic year. Rate limited to 100 requests per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_categories', 'list')
    
    return await get_fee_categories_dropdown(db, academic_year_id)

# Get Single Fee Category
@router.get("/{fee_category_id}", response_model=FeeCategoryRead)
async def get_fee_category_endpoint(request: Request, 

    fee_category_id: UUID, 
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get a specific fee category with its academic year title"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_categories', 'read')
    
    return await get_fee_category_by_id(db, fee_category_id)

# Update Fee Category
@router.put("/{fee_category_id}", response_model=FeeCategoryRead)
async def update_fee_category_endpoint(request: Request, 

    fee_category_id: UUID, 
    fee_category_data: FeeCategoryUpdate, 
    db: AsyncSession = Depends(get_tenant_db)
):
    """Update a fee category"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_categories', 'update')
    
    return await update_fee_category(db, fee_category_id, fee_category_data)

# Delete Fee Category
@router.delete("/{fee_category_id}")
async def delete_fee_category_endpoint(request: Request, 

    fee_category_id: UUID, 
    db: AsyncSession = Depends(get_tenant_db)
):
    """Delete a fee category"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_categories', 'delete')
    
    return await delete_fee_category(db, fee_category_id)