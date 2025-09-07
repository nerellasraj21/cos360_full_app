from fastapi import HTTPException, status, APIRouter, Depends, Query, Request
from app.schemas.fee.fee_student_mapping_schema import (
    FeeStudentMappingCreate, 
    FeeStudentMappingRead, 
    FeeStudentMappingUpdate,
    FeeStudentMappingList,
    FeeStudentMappingBulkCreate,
    FeeStudentMappingBulkResponse
)
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.service.fee.fee_student_mapping_service import (
    create_fee_student_mapping,
    get_fee_student_mapping_by_id,
    get_all_fee_student_mappings,
    update_fee_student_mapping,
    delete_fee_student_mapping,
    create_bulk_fee_student_mappings
)
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error
from typing import List, Optional

router = APIRouter(prefix="/fee/student-mappings", tags=["Fee/Fee Student Mappings"])

# Create Fee Student Mapping
@router.post("/", response_model=FeeStudentMappingRead, status_code=status.HTTP_201_CREATED)
async def create_fee_student_mapping_endpoint(
    request: Request,
    mapping_data: FeeStudentMappingCreate, 
    db: AsyncSession = Depends(get_db)
):
    """Create a new fee student mapping with automatic term amount distribution"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_student_mappings', 'create')
    
    return await create_fee_student_mapping(db, mapping_data)

# Get All Fee Student Mappings with filters
@router.get("/", response_model=List[FeeStudentMappingList])
async def get_all_fee_student_mappings_endpoint(
    request: Request,
    student_id: Optional[int] = Query(None, description="Filter by student ID"),
    class_id: Optional[int] = Query(None, description="Filter by class ID"),
    section_id: Optional[int] = Query(None, description="Filter by section ID"),
    fee_type_id: Optional[str] = Query(None, description="Filter by fee type ID"),
    academic_year_id: Optional[int] = Query(None, description="Filter by academic year ID"),
    db: AsyncSession = Depends(get_db)
):
    """Get all fee student mappings with optional filters and full student details"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_student_mappings', 'list')
    
    return await get_all_fee_student_mappings(db, student_id, class_id, section_id, fee_type_id, academic_year_id)

# Get Single Fee Student Mapping
@router.get("/{mapping_id}", response_model=FeeStudentMappingRead)
async def get_fee_student_mapping_endpoint(
    request: Request,
    mapping_id: str, 
    db: AsyncSession = Depends(get_db)
):
    """Get a specific fee student mapping with all related information including student details and term amounts"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_student_mappings', 'read')
    
    return await get_fee_student_mapping_by_id(db, mapping_id)

# Update Fee Student Mapping
@router.put("/{mapping_id}", response_model=FeeStudentMappingRead)
async def update_fee_student_mapping_endpoint(
    request: Request,
    mapping_id: str, 
    mapping_data: FeeStudentMappingUpdate, 
    db: AsyncSession = Depends(get_db)
):
    """Update a fee student mapping and recalculate term amounts if total_fee is updated"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_student_mappings', 'update')
    
    return await update_fee_student_mapping(db, mapping_id, mapping_data)

# Delete Fee Student Mapping
@router.delete("/{mapping_id}")
async def delete_fee_student_mapping_endpoint(
    request: Request,
    mapping_id: str, 
    db: AsyncSession = Depends(get_db)
):
    """Delete a fee student mapping and all associated term amounts"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_student_mappings', 'delete')
    
    return await delete_fee_student_mapping(db, mapping_id)

# Create Bulk Fee Student Mappings
@router.post("/bulk", response_model=FeeStudentMappingBulkResponse, status_code=status.HTTP_201_CREATED)
async def create_bulk_fee_student_mappings_endpoint(
    request: Request,
    bulk_data: FeeStudentMappingBulkCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create fee mappings for multiple students from a class at once with comprehensive error handling"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation (same permissions as single create)
    await check_role_plan_permission_with_error(db, request, role, 'fee_student_mappings', 'create')
    
    return await create_bulk_fee_student_mappings(db, bulk_data)