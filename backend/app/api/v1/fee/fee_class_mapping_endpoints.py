from fastapi import HTTPException, status, APIRouter, Depends, Query, Request
from app.schemas.fee.fee_class_mapping_schema import (
    FeeClassMappingCreate, 
    FeeClassMappingRead, 
    FeeClassMappingUpdate,
    FeeClassMappingList,
    FeeClassMappingBulkCreate,
    FeeClassMappingBulkResponse
)
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.service.fee.fee_class_mapping_service import (
    create_fee_class_mapping,
    get_fee_class_mapping_by_id,
    get_all_fee_class_mappings,
    update_fee_class_mapping,
    delete_fee_class_mapping,
    create_bulk_fee_class_mappings
)
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error
from typing import List, Optional

router = APIRouter(prefix="/fee/class-mappings", tags=["Fee/Fee Class Mappings"])

# Create Fee Class Mapping
@router.post("/", response_model=FeeClassMappingRead, status_code=status.HTTP_201_CREATED)
async def create_fee_class_mapping_endpoint(
    request: Request,
    mapping_data: FeeClassMappingCreate, 
    db: AsyncSession = Depends(get_db)
):
    """Create a new fee class mapping"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_class_mappings', 'create')
    
    return await create_fee_class_mapping(db, mapping_data)

# Get All Fee Class Mappings with filters
@router.get("/", response_model=List[FeeClassMappingList])
async def get_all_fee_class_mappings_endpoint(
    request: Request,
    class_id: Optional[int] = Query(None, description="Filter by class ID"),
    fee_type_id: Optional[str] = Query(None, description="Filter by fee type ID"),
    all_by_default: Optional[bool] = Query(None, description="Filter by all_by_default flag"),
    db: AsyncSession = Depends(get_db)
):
    """Get all fee class mappings with optional filters"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_class_mappings', 'list')
    
    return await get_all_fee_class_mappings(db, class_id, fee_type_id, all_by_default)

# Get Single Fee Class Mapping
@router.get("/{mapping_id}", response_model=FeeClassMappingRead)
async def get_fee_class_mapping_endpoint(
    request: Request,
    mapping_id: str, 
    db: AsyncSession = Depends(get_db)
):
    """Get a specific fee class mapping with all related information"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_class_mappings', 'read')
    
    return await get_fee_class_mapping_by_id(db, mapping_id)

# Update Fee Class Mapping
@router.put("/{mapping_id}", response_model=FeeClassMappingRead)
async def update_fee_class_mapping_endpoint(
    request: Request,
    mapping_id: str, 
    mapping_data: FeeClassMappingUpdate, 
    db: AsyncSession = Depends(get_db)
):
    """Update a fee class mapping"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_class_mappings', 'update')
    
    return await update_fee_class_mapping(db, mapping_id, mapping_data)

# Delete Fee Class Mapping
@router.delete("/{mapping_id}")
async def delete_fee_class_mapping_endpoint(
    request: Request,
    mapping_id: str, 
    db: AsyncSession = Depends(get_db)
):
    """Delete a fee class mapping"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_class_mappings', 'delete')
    
    return await delete_fee_class_mapping(db, mapping_id)

# Create Bulk Fee Class Mappings
@router.post("/bulk", response_model=FeeClassMappingBulkResponse, status_code=status.HTTP_201_CREATED)
async def create_bulk_fee_class_mappings_endpoint(
    request: Request,
    bulk_data: FeeClassMappingBulkCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create fee mappings for multiple classes at once with comprehensive error handling"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation (same permissions as single create)
    await check_role_plan_permission_with_error(db, request, role, 'fee_class_mappings', 'create')
    
    return await create_bulk_fee_class_mappings(db, bulk_data)