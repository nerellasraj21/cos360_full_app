from fastapi import HTTPException, status, APIRouter, Depends, Query, Request
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
from app.middleware.rate_limit_middleware import rate_limit_dropdown, rate_limit_api, rate_limit_create
from typing import List, Optional

# Import the new permission system
from app.tools.permission_decorators import (
    RequireRead, RequireCreate, RequireUpdate, RequireDelete, RequireList,
    get_current_user, MultiplePermissions
)

router = APIRouter(prefix="/fee/categories", tags=["Fee/Fee Categories"])

# Create Fee Category - Protected with create permission
@router.post("/", response_model=FeeCategoryRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create_fee_category_endpoint(
    request: Request, 
    fee_category_data: FeeCategoryCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _permission_check: bool = Depends(RequireCreate("fee_categories"))
):
    """
    Create a new fee category. 
    
    Requires:
    - Authentication (valid JWT token)
    - Plan-level access to Fee Management menus
    - Role-level access to Fee Categories menu with edit permission
    - Resource-level permission: fee_categories:create
    
    Rate limited to 30 creates per minute.
    """
    return await create_fee_category(db, fee_category_data)

# Get All Fee Categories - Protected with list permission
@router.get("/", response_model=List[FeeCategoryRead])
async def get_all_fee_categories_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _permission_check: bool = Depends(RequireList("fee_categories"))
):
    """
    Get all fee categories with their academic year titles.
    
    Requires:
    - Authentication (valid JWT token)
    - Plan-level access to Fee Management menus
    - Role-level access to Fee Categories menu with view permission
    - Resource-level permission: fee_categories:list
    """
    return await get_all_fee_categories(db)

# Get Fee Categories for Dropdown - Protected with read permission
@router.get("/dropdown", response_model=List[FeeCategoryDropdown])
async def get_fee_categories_dropdown_endpoint(
    academic_year_id: Optional[int] = Query(None, description="Filter by academic year ID"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _permission_check: bool = Depends(RequireRead("fee_categories"))
):
    """
    Get fee categories for dropdown (id + category_name only). 
    Optionally filter by academic year.
    
    Requires:
    - Authentication (valid JWT token) 
    - Plan-level access to Fee Management menus
    - Role-level access to Fee Categories menu with view permission
    - Resource-level permission: fee_categories:read
    """
    return await get_fee_categories_dropdown(db, academic_year_id)

# Get Single Fee Category - Protected with read permission
@router.get("/{fee_category_id}", response_model=FeeCategoryRead)
async def get_fee_category_endpoint(
    fee_category_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _permission_check: bool = Depends(RequireRead("fee_categories"))
):
    """
    Get a single fee category by ID.
    
    Requires:
    - Authentication (valid JWT token)
    - Plan-level access to Fee Management menus  
    - Role-level access to Fee Categories menu with view permission
    - Resource-level permission: fee_categories:read
    """
    return await get_fee_category_by_id(db, fee_category_id)

# Update Fee Category - Protected with update permission
@router.put("/{fee_category_id}", response_model=FeeCategoryRead)
async def update_fee_category_endpoint(
    fee_category_id: str,
    fee_category_data: FeeCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _permission_check: bool = Depends(RequireUpdate("fee_categories"))
):
    """
    Update a fee category.
    
    Requires:
    - Authentication (valid JWT token)
    - Plan-level access to Fee Management menus
    - Role-level access to Fee Categories menu with edit permission
    - Resource-level permission: fee_categories:update
    """
    return await update_fee_category(db, fee_category_id, fee_category_data)

# Delete Fee Category - Protected with delete permission
@router.delete("/{fee_category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fee_category_endpoint(
    fee_category_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _permission_check: bool = Depends(RequireDelete("fee_categories"))
):
    """
    Delete a fee category.
    
    Requires:
    - Authentication (valid JWT token)
    - Plan-level access to Fee Management menus
    - Role-level access to Fee Categories menu with edit permission  
    - Resource-level permission: fee_categories:delete
    """
    await delete_fee_category(db, fee_category_id)

# Example of multiple permission check - Export endpoint
@router.get("/export/csv")
async def export_fee_categories_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _permission_check: bool = Depends(MultiplePermissions([
        ("fee_categories", "read"),
        ("fee_categories", "export")
    ]))
):
    """
    Export fee categories to CSV.
    
    Requires multiple permissions:
    - fee_categories:read (to access the data)
    - fee_categories:export (to export the data)
    
    Both permissions must be granted for access.
    """
    # Implementation would go here
    return {"message": "Export functionality - requires both read and export permissions"}

# Example of optional permission - Get statistics (if user has access)
@router.get("/statistics")
async def get_fee_category_statistics_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    has_stats_permission: bool = Depends(RequireRead("fee_statistics", optional=True))
):
    """
    Get fee category statistics.
    
    This endpoint demonstrates optional permissions:
    - If user has fee_statistics:read permission, return detailed stats
    - If user doesn't have permission, return basic info only
    """
    if has_stats_permission:
        # Return detailed statistics
        return {
            "total_categories": 25,
            "active_categories": 20,
            "total_revenue": 150000.0,
            "detailed_breakdown": {
                "tuition": 100000.0,
                "lab_fees": 30000.0,
                "sports": 20000.0
            }
        }
    else:
        # Return basic info only
        return {
            "message": "Basic statistics available. Contact administrator for detailed reports.",
            "total_categories": 25
        }