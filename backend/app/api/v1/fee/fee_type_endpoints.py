from fastapi import HTTPException, status, APIRouter, Depends, Query, Request
from app.schemas.fee.fee_type_schema import (
    FeeTypeCreate, 
    FeeTypeRead, 
    FeeTypeUpdate,
    FeeTypeDropdown
)
from app.db.tenant_session import get_tenant_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.service.fee.fee_type_service import (
    create_fee_type,
    get_fee_type_by_id,
    get_all_fee_types,
    get_fee_types_dropdown,
    update_fee_type,
    delete_fee_type
)
from app.middleware.rate_limit_middleware import rate_limit_dropdown, rate_limit_api, rate_limit_create
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error
from typing import List, Optional
from uuid import UUID

router = APIRouter(prefix="/fee/types", tags=["Fee/Fee Types"])

# Create Fee Type
@router.post("/", response_model=FeeTypeRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create_fee_type_endpoint(request: Request, 

    fee_type_data: FeeTypeCreate, 
    db: AsyncSession = Depends(get_tenant_db)
):
    """Create a new fee type. Rate limited to 30 creates per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_types', 'create')

    return await create_fee_type(db, fee_type_data)

# Get All Fee Types
@router.get("/", response_model=List[FeeTypeRead])
async def get_all_fee_types_endpoint(request: Request, 

    db: AsyncSession = Depends(get_tenant_db)
):
    """Get all fee types with their related information"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_types', 'list')
    
    return await get_all_fee_types(db)

# Get Fee Types for Dropdown
@router.get("/dropdown", response_model=List[FeeTypeDropdown])
@rate_limit_dropdown("100 per minute")
async def get_fee_types_dropdown_endpoint(request: Request, 

    fee_category_id: Optional[UUID] = Query(None, description="Filter by fee category ID"),
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get fee types for dropdown (id + type_name only). Optionally filter by fee category. Rate limited to 100 requests per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_types', 'list')
    
    return await get_fee_types_dropdown(db, fee_category_id)

# Get Single Fee Type
@router.get("/{fee_type_id}", response_model=FeeTypeRead)
async def get_fee_type_endpoint(request: Request, 

    fee_type_id: UUID, 
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get a specific fee type with all related information"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_types', 'read')
    
    return await get_fee_type_by_id(db, fee_type_id)

# Update Fee Type
@router.put("/{fee_type_id}", response_model=FeeTypeRead)
async def update_fee_type_endpoint(request: Request, 

    fee_type_id: UUID, 
    fee_type_data: FeeTypeUpdate, 
    db: AsyncSession = Depends(get_tenant_db)
):
    """Update a fee type"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_types', 'update')
    
    return await update_fee_type(db, fee_type_id, fee_type_data)

# Delete Fee Type
@router.delete("/{fee_type_id}")
async def delete_fee_type_endpoint(request: Request, 

    fee_type_id: UUID, 
    db: AsyncSession = Depends(get_tenant_db)
):
    """Delete a fee type"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_types', 'delete')
    
    return await delete_fee_type(db, fee_type_id)