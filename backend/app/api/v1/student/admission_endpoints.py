from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.student.admission_schema import StudentAdmissionCreate, StudentAdmissionUpdate, StudentAdmissionResponse
from app.schemas.student.student_schema import StudentOut, StudentDropdown, StudentSimpleDropdown
from app.schemas.common.pagination_schema import PaginatedResponse
from app.db.tenant_session import get_tenant_db
from typing import List
from app.service.student.admission_service import (
    add_admission, update_partial_details_admission, get_admission_by_id, get_student_by_admission_id,
    search_students, get_all_admissions, delete_admission,
    # Enhanced user-context aware functions
    get_all_admissions_with_context, get_admission_by_id_with_context, search_students_with_context
)
from app.service.student.student_service import get_students_dropdown, get_students_simple_dropdown
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error
from app.tools.enhanced_permissions import check_user_resource_access
from uuid import UUID
router = APIRouter(prefix="/students/admission", tags=["Student/Student Admission"])

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_admission(admission: StudentAdmissionCreate, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Create a new student admission - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_admissions', 'create')
    
    admission_response = await add_admission(admission, db, request)
    return admission_response

@router.get("/id/{student_id}")
async def get_admission(student_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get admission by student ID with user access validation - All authenticated users"""

    # Enhanced permission check with entity-specific validation
    user_context = await check_user_resource_access(
        db, request, 'student_admissions', 'read', target_entity_id=student_id
    )

    # Use user-context aware service method
    return await get_admission_by_id_with_context(student_id, db, user_context, request)

@router.patch("/{student_id}")
async def update_admission(student_id: UUID, data: StudentAdmissionUpdate, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Update student admission with user access validation"""

    # Enhanced permission check with entity-specific validation
    user_context = await check_user_resource_access(
        db, request, 'student_admissions', 'update', target_entity_id=student_id
    )

    # Use existing service method (could be enhanced later if needed)
    updated_data = await update_partial_details_admission(student_id, data, db, request)
    return updated_data

# Get student by admission ID 
@router.get("/by-admission/{admission_id}")
async def fetch_student_by_admission(admission_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get student by admission ID - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_admissions', 'read')
    
    return await get_student_by_admission_id(admission_id, db, request)

# Search (get while typing)
@router.get("/search")
async def search_student_by_text(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    query: str = Query(..., min_length=1)
):
    """Search students with user-specific filtering - All authenticated users"""

    # Enhanced permission check with user context resolution
    user_context = await check_user_resource_access(
        db, request, 'student_admissions', 'list'
    )

    # Use user-context aware service method
    return await search_students_with_context(query, db, user_context, request)

@router.get("/", response_model=PaginatedResponse[StudentAdmissionResponse], status_code=status.HTTP_200_OK)
async def list_admissions(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return")
):
    """List student admissions with user-specific filtering - All authenticated users"""

    # Enhanced permission check with user context resolution
    user_context = await check_user_resource_access(
        db, request, 'student_admissions', 'list'
    )

    # Use user-context aware service method
    return await get_all_admissions_with_context(db, user_context, skip, limit)

@router.delete("/{admission_id}", status_code=status.HTTP_200_OK)
async def delete_student_admission(admission_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Delete student admission and related data - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_admissions', 'delete')
    
    return await delete_admission(admission_id, db)

# Student Dropdown Endpoints
@router.get("/students/dropdown", response_model=List[StudentDropdown], status_code=status.HTTP_200_OK)
async def get_student_dropdown(
    request: Request, 
    db: AsyncSession = Depends(get_tenant_db),
    active_only: bool = Query(True, description="Filter only active students")
):
    """
    Get students dropdown data with display name including admission number.
    Returns students in format: "First Last (ADM001)"
    
    **Required Permission**: students:list
    """
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'students', 'list')
    
    return await get_students_dropdown(db, active_only)

@router.get("/students/dropdown/simple", response_model=List[StudentSimpleDropdown], status_code=status.HTTP_200_OK)
async def get_student_simple_dropdown(
    request: Request, 
    db: AsyncSession = Depends(get_tenant_db),
    active_only: bool = Query(True, description="Filter only active students")
):
    """
    Get simple students dropdown data with just ID and name.
    Returns students in format: "First Last"
    
    **Required Permission**: students:list
    """
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'students', 'list')
    
    return await get_students_simple_dropdown(db, active_only)

# User-Specific Self-Access Endpoints

@router.get("/my-admission")
async def get_my_admission(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get current user's own admission data - Student only endpoint"""

    # Enhanced permission check for student's own data
    user_context = await check_user_resource_access(
        db, request, 'student_admissions', 'read_own'
    )

    if not user_context.student_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only students can access this endpoint"
        )

    # Use user-context aware service method for student's own admission
    return await get_admission_by_id_with_context(
        user_context.student_id, db, user_context, request
    )

@router.get("/my-children-admissions")
async def get_my_children_admissions(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return")
):
    """Get current user's children's admission data - Parent only endpoint"""

    # Enhanced permission check for parent's children data
    user_context = await check_user_resource_access(
        db, request, 'student_admissions', 'read_related'
    )

    if not user_context.parent_id or not user_context.allowed_entity_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only parents with children can access this endpoint"
        )

    # Use user-context aware service method for parent's children admissions
    return await get_all_admissions_with_context(db, user_context, skip, limit)