from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.student.admission_schema import StudentAdmissionCreate, StudentAdmissionUpdate
from app.schemas.student.student_schema import StudentOut
from app.db.session import get_db
from typing import List
from app.service.student.admission_service import add_admission, update_partial_details_admission, get_admission_by_id,get_student_by_admission_id,search_students
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error

router = APIRouter(prefix="/students/admission", tags=["Student/Student Admission"])

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_admission(admission: StudentAdmissionCreate, request: Request, db: AsyncSession = Depends(get_db)):
    """Create a new student admission - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_admissions', 'create')
    
    admission_respose = await add_admission(admission,db)
    return admission_respose

@router.get("/id/{student_id}")
async def get_admission(student_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Get admission by student ID - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_admissions', 'read')
    
    admission_details = await get_admission_by_id(student_id,db)
    return admission_details

@router.patch("/{student_id}")
async def update_admission(student_id: int, data: StudentAdmissionUpdate, request: Request, db: AsyncSession = Depends(get_db)):
    """Update student admission - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_admissions', 'update')
    
    updated_data = await update_partial_details_admission(student_id,data,db)
    return updated_data

# Get student by admission ID 
@router.get("/by-admission/{admission_id}")
async def fetch_student_by_admission(admission_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Get student by admission ID - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_admissions', 'read')
    
    return await get_student_by_admission_id(admission_id, db)

# Search (get while typing)
@router.get("/search")
async def search_student_by_text(request: Request, db: AsyncSession = Depends(get_db), query: str = Query(..., min_length=1)):
    """Search students - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_admissions', 'list')
    
    return await search_students(query, db)