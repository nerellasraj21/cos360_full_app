from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.student.admission_schema import StudentAdmissionCreate, StudentAdmissionUpdate
from app.schemas.student.student_schema import StudentOut
from app.db.session import get_db
from typing import List
from app.service.student.admission_service import add_admission, update_partial_details_admission, get_admission_by_id,get_student_by_admission_id,search_students
from app.tools.simple_permissions import check_role_permission, get_current_user_token

router = APIRouter(prefix="/students/admission", tags=["Student/Student Admission"])

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_admission(admission: StudentAdmissionCreate, request: Request, db: AsyncSession = Depends(get_db)):
    """Create a new student admission - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'student_admissions', 'create')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot create student_admissions"
        )
    
    admission_respose = await add_admission(admission,db)
    return admission_respose

@router.get("/id/{student_id}")
async def get_admission(student_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Get admission by student ID - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'student_admissions', 'read')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot read student_admissions"
        )
    
    admission_details = await get_admission_by_id(student_id,db)
    return admission_details

@router.patch("/{student_id}")
async def update_admission(student_id: int, data: StudentAdmissionUpdate, request: Request, db: AsyncSession = Depends(get_db)):
    """Update student admission - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'student_admissions', 'update')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot update student_admissions"
        )
    
    updated_data = await update_partial_details_admission(student_id,data,db)
    return updated_data

# Get student by admission ID 
@router.get("/by-admission/{admission_id}")
async def fetch_student_by_admission(admission_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Get student by admission ID - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'student_admissions', 'read')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot read student_admissions"
        )
    
    return await get_student_by_admission_id(admission_id, db)

# Search (get while typing)
@router.get("/search")
async def search_student_by_text(request: Request, query: str = Query(..., min_length=1), db: AsyncSession = Depends(get_db)):
    """Search students - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'student_admissions', 'list')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot list student_admissions"
        )
    
    return await search_students(query, db)