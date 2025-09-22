from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.student.admission_schema import StudentAdmissionCreate, StudentAdmissionUpdate, StudentAdmissionResponse
from app.schemas.student.student_schema import StudentOut, StudentDropdown, StudentSimpleDropdown
from app.schemas.common.pagination_schema import PaginatedResponse
from app.db.tenant_session import get_tenant_db
from typing import List
from app.service.student.admission_service import add_admission, update_partial_details_admission, get_admission_by_id,get_student_by_admission_id,search_students, get_all_admissions, delete_admission
from app.service.student.student_service import get_students_dropdown, get_students_simple_dropdown
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error
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
    """Get admission by student ID - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_admissions', 'read')
    
    admission_details = await get_admission_by_id(student_id, db, request)
    return admission_details

@router.patch("/{student_id}")
async def update_admission(student_id: UUID, data: StudentAdmissionUpdate, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Update student admission - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_admissions', 'update')
    
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
async def search_student_by_text(request: Request, db: AsyncSession = Depends(get_tenant_db), query: str = Query(..., min_length=1)):
    """Search students - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_admissions', 'list')
    
    return await search_students(query, db, request)

@router.get("/", response_model=PaginatedResponse[StudentAdmissionResponse], status_code=status.HTTP_200_OK)
async def list_admissions(
    request: Request, 
    db: AsyncSession = Depends(get_tenant_db),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return")
):
    """List all student admissions with pagination - Admin/Staff only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_admissions', 'list')
    
    return await get_all_admissions(db, skip, limit)

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