from fastapi import HTTPException, status, APIRouter, Depends, Query
from app.schemas.fee.fee_category_schema import (
    FeeCategoryCreate, 
    FeeCategoryRead, 
    FeeCategoryUpdate,
    FeeCategoryDropdown
)
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.service.fee.fee_category_service import (
    create_fee_category,
    get_fee_category_by_id,
    get_all_fee_categories,
    get_fee_categories_dropdown,
    update_fee_category,
    delete_fee_category
)
from typing import List, Optional

router = APIRouter(prefix="/fee/categories", tags=["Fee/Fee Categories"])

# Create Fee Category
@router.post("/", response_model=FeeCategoryRead, status_code=status.HTTP_201_CREATED)
async def create_fee_category_endpoint(fee_category_data: FeeCategoryCreate, db: AsyncSession = Depends(get_db)):
    """Create a new fee category"""
    return await create_fee_category(db, fee_category_data)

# Get All Fee Categories
@router.get("/", response_model=List[FeeCategoryRead])
async def get_all_fee_categories_endpoint(db: AsyncSession = Depends(get_db)):
    """Get all fee categories with their academic year titles"""
    return await get_all_fee_categories(db)

# Get Fee Categories for Dropdown
@router.get("/dropdown", response_model=List[FeeCategoryDropdown])
async def get_fee_categories_dropdown_endpoint(
    academic_year_id: Optional[int] = Query(None, description="Filter by academic year ID"),
    db: AsyncSession = Depends(get_db)
):
    """Get fee categories for dropdown (id + category_name only). Optionally filter by academic year."""
    return await get_fee_categories_dropdown(db, academic_year_id)

# Get Single Fee Category
@router.get("/{fee_category_id}", response_model=FeeCategoryRead)
async def get_fee_category_endpoint(fee_category_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific fee category with its academic year title"""
    return await get_fee_category_by_id(db, fee_category_id)

# Update Fee Category
@router.put("/{fee_category_id}", response_model=FeeCategoryRead)
async def update_fee_category_endpoint(
    fee_category_id: str, 
    fee_category_data: FeeCategoryUpdate, 
    db: AsyncSession = Depends(get_db)
):
    """Update a fee category"""
    return await update_fee_category(db, fee_category_id, fee_category_data)

# Delete Fee Category
@router.delete("/{fee_category_id}")
async def delete_fee_category_endpoint(fee_category_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a fee category"""
    return await delete_fee_category(db, fee_category_id)