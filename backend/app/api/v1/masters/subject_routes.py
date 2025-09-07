from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.tools.simple_permissions import check_role_permission, get_current_user_token
from app.schemas.masters.subject_schema import SubjectCreate, SubjectRead, SubjectUpdate, SubjectDropdown
from app.service.masters.subject_service import create_subject,get_subject_by_id,get_all_subjects,update_subject,deactivate_subject,get_subjects_by_category_id,get_subjects_by_category_id_dropdown,get_subjects_dropdown
from app.middleware.rate_limit_middleware import rate_limit_dropdown, rate_limit_create
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/masters/subjects", tags=["Masters/Subjects"])

@router.post("/", response_model=SubjectRead)
@rate_limit_create("30 per minute")
async def create(request: Request, subject: SubjectCreate, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'subjects', 'create')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot create subjects"
        )
    
    return await create_subject(db, subject)

@router.get("/", response_model=List[SubjectRead])
async def list(request: Request, skip: int = 0, limit: int = 100, active_only: bool = True, academic_year_id: int = None, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'subjects', 'list')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot list subjects"
        )
    
    return await get_all_subjects(db, skip, limit, active_only, academic_year_id)

@router.get("/dropdown", response_model=List[SubjectDropdown])
@rate_limit_dropdown("100 per minute")
async def get_subjects_dropdown_endpoint(request: Request, active_only: bool = True, db: AsyncSession = Depends(get_db)):
    """Get subjects for dropdown (id + name only). Rate limited to 100 requests per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'subjects', 'list')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot list subjects"
        )
    
    return await get_subjects_dropdown(db, active_only)

@router.get("/{subject_id}", response_model=SubjectRead)
async def read(request: Request, subject_id: int, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'subjects', 'read')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot read subjects"
        )
    
    subject = await get_subject_by_id(db, subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject

@router.put("/{subject_id}", response_model=SubjectRead)
async def update(request: Request, subject_id: int, subject_update: SubjectUpdate, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'subjects', 'update')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot update subjects"
        )
    
    return await update_subject(db, subject_id, subject_update)

@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate(request: Request, subject_id: int, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'subjects', 'delete')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot delete subjects"
        )
    
    await deactivate_subject(db, subject_id)

@router.get("/categories/{category_id}/subjects", response_model=List[SubjectRead])
async def get_subjects_by_category(category_id: int, db: AsyncSession = Depends(get_db)):
    return await get_subjects_by_category_id(category_id, db)

@router.get("/categories/{category_id}/subjects/dropdown", response_model=List[SubjectDropdown])
@rate_limit_dropdown("100 per minute")
async def get_subjects_by_category_dropdown(request: Request, category_id: int, db: AsyncSession = Depends(get_db)):
    """Get subjects by category ID for dropdown (id + name only). Rate limited to 100 requests per minute."""
    return await get_subjects_by_category_id_dropdown(category_id, db)
