from http.client import HTTPMessage
from fastapi import APIRouter, Depends, HTTPException, Response, status, Request
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.models.masters.academic_year_model import AcademicYear
from app.schemas.masters.academic_year_schema import AcademicYearCreate, AcademicYearRead, AcademicYearUpdate, AcademicYearDropdown
from app.service.masters import academic_year_service
from app.db.session import get_db
from app.middleware.rate_limit_middleware import rate_limit_dropdown, rate_limit_api, rate_limit_create
from sqlalchemy.ext.asyncio import AsyncSession

# Import the simplified permission system
from app.tools.simple_permissions import (
    RequireRead, RequireCreate, RequireUpdate, RequireDelete, RequireList,
    get_current_user, check_role_permission
)

router = APIRouter(prefix="/masters/academic_years", tags=["Masters/Academic Years"])

@router.post("/", response_model=AcademicYearRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create(
    request: Request, 
    academic_year: AcademicYearCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new academic year.
    
    Requires:
    - Authentication (valid JWT token)
    - Plan-level access to Academic Years menu
    - Role-level access to Academic Years menu with edit permission
    - Resource-level permission: academic_years:create
    
    Only Admin role has create permission.
    """
    # Check permissions manually using database
    role = current_user.get('role')
    has_perm = await check_role_permission(db, role, 'academic_years', 'create')
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot create academic_years"
        )
    
    return await academic_year_service.create_academic_year(db, academic_year)

@router.get("/", response_model=List[AcademicYearRead])
@rate_limit_dropdown("100 per minute")
async def list(
    request: Request, 
    skip: int = 0, 
    limit: int = 10, 
    active_only: bool = True, 
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all academic years with pagination.
    
    Requires:
    - Authentication (valid JWT token)
    - Plan-level access to Academic Years menu
    - Role-level access to Academic Years menu with view permission
    - Resource-level permission: academic_years:list
    
    Available to Admin, Teacher, Student, Parent, Staff roles.
    """
    # Check permissions manually using database
    role = current_user.get('role')
    has_perm = await check_role_permission(db, role, 'academic_years', 'list')
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot list academic_years"
        )
        
    return await academic_year_service.get_all_academic_years(db, skip, limit, active_only)

@router.get("/dropdown", response_model=List[AcademicYearDropdown])
@rate_limit_dropdown("100 per minute")
async def get_dropdown(
    request: Request, 
    active_only: bool = True, 
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get academic years for dropdown (id + title only).
    
    Requires:
    - Authentication (valid JWT token)
    - Plan-level access to Academic Years menu
    - Role-level access to Academic Years menu with view permission
    - Resource-level permission: academic_years:read
    
    Available to Admin, Teacher, Student, Parent, Staff roles.
    Rate limited to 100 requests per minute.
    """
    # Check permissions manually using database
    role = current_user.get('role')
    has_perm = await check_role_permission(db, role, 'academic_years', 'read')
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot read academic_years"
        )
        
    return await academic_year_service.get_academic_years_dropdown(db, active_only)

@router.get("/{academic_year_id}", response_model=AcademicYearRead)
async def read(
    academic_year_id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get a single academic year by ID.
    
    Requires:
    - Authentication (valid JWT token)
    - Plan-level access to Academic Years menu
    - Role-level access to Academic Years menu with view permission
    - Resource-level permission: academic_years:read
    
    Available to Admin, Teacher, Student, Parent, Staff roles.
    """
    # Check permissions manually using database
    role = current_user.get('role')
    has_perm = await check_role_permission(db, role, 'academic_years', 'read')
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot read academic_years"
        )
        
    academic_year = await academic_year_service.get_academic_year_by_id(db, academic_year_id)
    if not academic_year:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Academic Year not found")
    return academic_year

@router.put("/{academic_year_id}", response_model=AcademicYearRead)
async def update(
    academic_year_id: UUID, 
    academic_year_update: AcademicYearUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Update an academic year.
    
    Requires:
    - Authentication (valid JWT token)
    - Plan-level access to Academic Years menu
    - Role-level access to Academic Years menu with edit permission
    - Resource-level permission: academic_years:update
    
    Only Admin role has update permission.
    """
    # Check permissions manually using database
    role = current_user.get('role')
    has_perm = await check_role_permission(db, role, 'academic_years', 'update')
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot update academic_years"
        )
        
    updated_academic_year = await academic_year_service.update_academic_year(db, academic_year_id, academic_year_update)
    if not updated_academic_year:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Academic Year not found")
    return updated_academic_year

@router.delete("/{academic_year_id}", response_model=AcademicYearRead)
async def deactivate(
    academic_year_id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Deactivate/delete an academic year.
    
    Requires:
    - Authentication (valid JWT token)
    - Plan-level access to Academic Years menu
    - Role-level access to Academic Years menu with edit permission
    - Resource-level permission: academic_years:delete
    
    Only Admin role has delete permission.
    """
    # Check permissions manually using database
    role = current_user.get('role')
    has_perm = await check_role_permission(db, role, 'academic_years', 'delete')
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot delete academic_years"
        )
        
    academic_year = await academic_year_service.deactivate_academic_year(db, academic_year_id)
    if not academic_year:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Academic Year not found")
    return academic_year
