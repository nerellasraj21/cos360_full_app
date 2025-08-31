from fastapi import HTTPException, status, APIRouter, Depends
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

router = APIRouter(prefix="/fee/class-mapping-term-amounts", tags=["Fee/Fee Class Mapping Term Amounts"])

# Create Fee Class Mapping Term Amounts (Bulk)
@router.post("/", response_model=List[FeeClassMappingTermAmountRead], status_code=status.HTTP_201_CREATED)
async def create_fee_class_mapping_term_amounts_endpoint(
    bulk_data: FeeClassMappingTermAmountBulkCreate, 
    db: AsyncSession = Depends(get_db)
):
    """Create multiple fee class mapping term amounts"""
    return await create_fee_class_mapping_term_amounts(db, bulk_data)

# Update Fee Class Mapping Term Amounts (Bulk)
@router.put("/", response_model=List[FeeClassMappingTermAmountRead])
async def update_fee_class_mapping_term_amounts_endpoint(
    bulk_data: FeeClassMappingTermAmountBulkUpdate, 
    db: AsyncSession = Depends(get_db)
):
    """Update multiple fee class mapping term amounts (supports partial updates)"""
    return await update_fee_class_mapping_term_amounts(db, bulk_data)

# Delete Fee Class Mapping Term Amounts (Bulk)
@router.delete("/")
async def delete_fee_class_mapping_term_amounts_endpoint(
    bulk_data: FeeClassMappingTermAmountBulkDelete, 
    db: AsyncSession = Depends(get_db)
):
    """Delete multiple fee class mapping term amounts"""
    return await delete_fee_class_mapping_term_amounts(db, bulk_data)