from fastapi import HTTPException, status, APIRouter, Depends, Request
from app.schemas.fee.fee_class_map_term_amount_schema import (
    FeeClassMappingTermAmountBulkCreate,
    FeeClassMappingTermAmountBulkUpdate,
    FeeClassMappingTermAmountBulkDelete,
    FeeClassMappingTermAmountRead
)
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.service.fee.fee_class_map_term_amount_service import (
    create_fee_class_mapping_term_amounts,
    update_fee_class_mapping_term_amounts,
    delete_fee_class_mapping_term_amounts
)
from typing import List
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error

router = APIRouter(prefix="/fee/class-mapping-term-amounts", tags=["Fee/Fee Class Mapping Term Amounts"])

# Create Fee Class Mapping Term Amounts (Bulk)
@router.post("/", response_model=List[FeeClassMappingTermAmountRead], status_code=status.HTTP_201_CREATED)
async def create_fee_class_mapping_term_amounts_endpoint(
    bulk_data: FeeClassMappingTermAmountBulkCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Create multiple fee class mapping term amounts - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_term_amounts', 'create')
    
    return await create_fee_class_mapping_term_amounts(db, bulk_data)

# Update Fee Class Mapping Term Amounts (Bulk)
@router.put("/", response_model=List[FeeClassMappingTermAmountRead])
async def update_fee_class_mapping_term_amounts_endpoint(
    bulk_data: FeeClassMappingTermAmountBulkUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Update multiple fee class mapping term amounts (supports partial updates) - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_term_amounts', 'update')
    
    return await update_fee_class_mapping_term_amounts(db, bulk_data)

# Delete Fee Class Mapping Term Amounts (Bulk)
@router.delete("/")
async def delete_fee_class_mapping_term_amounts_endpoint(
    bulk_data: FeeClassMappingTermAmountBulkDelete,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Delete multiple fee class mapping term amounts - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_term_amounts', 'delete')
    
    return await delete_fee_class_mapping_term_amounts(db, bulk_data)