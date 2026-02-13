from fastapi import HTTPException, status, APIRouter, Depends, Request, Query
from app.schemas.fee.fee_class_map_term_amount_schema import (
    FeeClassMappingTermAmountBulkCreate,
    FeeClassMappingTermAmountBulkUpdate,
    FeeClassMappingTermAmountBulkDelete,
    FeeClassMappingTermAmountRead
)
from app.db.tenant_session import get_tenant_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.service.fee.fee_class_map_term_amount_service import (
    create_fee_class_mapping_term_amounts,
    update_fee_class_mapping_term_amounts,
    delete_fee_class_mapping_term_amounts,
    get_term_amount_by_id,
    get_term_amounts_by_class_mapping,
    get_all_term_amounts
)
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error

router = APIRouter(prefix="/fee/class-mapping-term-amounts", tags=["Fee/Fee Class Mapping Term Amounts"])

@router.get("/health", status_code=status.HTTP_200_OK)
async def term_amount_health_check():
    """Health check for fee class mapping term amounts endpoints"""
    return {"status": "healthy", "module": "fee_class_map_term_amounts", "timestamp": datetime.now()}

# Get Term Amounts by Class Mapping (Most Specific Route First)
@router.get("/by-mapping/{class_mapping_id}", response_model=List[FeeClassMappingTermAmountRead])
async def get_term_amounts_by_mapping_endpoint(
    request: Request,
    class_mapping_id: UUID,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get all term amounts for a specific class-fee mapping"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    await check_role_plan_permission_with_error(db, request, role, 'fee_class_mapping_term_amounts', 'read')

    return await get_term_amounts_by_class_mapping(db, class_mapping_id)

# Get All Term Amounts with Filters
@router.get("/", response_model=List[FeeClassMappingTermAmountRead])
async def get_all_term_amounts_endpoint(
    request: Request,
    class_mapping_id: Optional[UUID] = Query(None, description="Filter by class mapping ID"),
    fee_term_id: Optional[UUID] = Query(None, description="Filter by fee term ID"),
    limit: int = Query(100, ge=1, le=500, description="Number of records to return (1-500)"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get all term amounts with optional filters and pagination"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    await check_role_plan_permission_with_error(db, request, role, 'fee_class_mapping_term_amounts', 'list')

    return await get_all_term_amounts(db, class_mapping_id, fee_term_id, limit, offset)

# Get Single Term Amount by ID
@router.get("/{term_amount_id}", response_model=FeeClassMappingTermAmountRead)
async def get_term_amount_endpoint(
    request: Request,
    term_amount_id: UUID,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get specific term amount by ID"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    await check_role_plan_permission_with_error(db, request, role, 'fee_class_mapping_term_amounts', 'read')

    return await get_term_amount_by_id(db, term_amount_id)

# Create Fee Class Mapping Term Amounts (Bulk)
@router.post("/", response_model=List[FeeClassMappingTermAmountRead], status_code=status.HTTP_201_CREATED)
async def create_fee_class_mapping_term_amounts_endpoint(
    request: Request,
    bulk_data: FeeClassMappingTermAmountBulkCreate,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Create multiple fee class mapping term amounts - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_class_mapping_term_amounts', 'create')
    
    return await create_fee_class_mapping_term_amounts(db, bulk_data)

# Update Fee Class Mapping Term Amounts (Bulk)
@router.put("/", response_model=List[FeeClassMappingTermAmountRead])
async def update_fee_class_mapping_term_amounts_endpoint(
    request: Request,
    bulk_data: FeeClassMappingTermAmountBulkUpdate,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Update multiple fee class mapping term amounts (supports partial updates) - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_class_mapping_term_amounts', 'update')
    
    return await update_fee_class_mapping_term_amounts(db, bulk_data)

# Delete Fee Class Mapping Term Amounts (Bulk)
@router.delete("/")
async def delete_fee_class_mapping_term_amounts_endpoint(
    request: Request,
    bulk_data: FeeClassMappingTermAmountBulkDelete,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Delete multiple fee class mapping term amounts - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_class_mapping_term_amounts', 'delete')
    
    return await delete_fee_class_mapping_term_amounts(db, bulk_data)