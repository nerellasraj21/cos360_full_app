from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from typing import List
from uuid import UUID
from app.service.masters.class_service import create_class_with_sections,get_all_classes_with_sections,update_class_with_sections,delete_class_with_sections,get_class_with_sections,get_class_section_list,get_all_classes_data,get_all_sections_data,get_sections_by_class_name,get_students_by_class_section,get_classes_dropdown,get_sections_by_class_id
from app.schemas.masters.class_schema import ClassCreate, ClassRead, ClassUpdate,ClassOut,ClassDropdown
from app.schemas.masters.sections_schema import ClassSectionInfo,SectionOut,SectionDropdown
from app.schemas.student.student_schema import StudentOut
from app.db.tenant_session import get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_dropdown, rate_limit_api, rate_limit_create
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/masters/class_sections", tags=["Masters/Class & Sections"])

# Create Class with Sections
@router.post("/", response_model=ClassRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create_class(request: Request, class_data: ClassCreate, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'classes', 'create')
    
    return await create_class_with_sections(db, class_data)

# Read Single Class with Sections
@router.get("/by_class_id/{class_id}", response_model=ClassRead)
async def get_class(request: Request, class_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'classes', 'read')
    
    db_class = await get_class_with_sections(db, class_id)
    if not db_class:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    return db_class

# Read All Classes with Sections
@router.get("/read_all", response_model=List[ClassRead])
async def get_classes_with_sections(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'classes', 'list')
    
    return await get_all_classes_with_sections(db)

# Update Class and Replace Sections
@router.put("/{class_id}", response_model=dict)
async def update_class(request: Request, class_id: UUID, class_data: ClassUpdate, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'classes', 'update')
    
    updated = await update_class_with_sections(db, class_id, class_data)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    return updated

# Delete Class
@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_class(request: Request, class_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'classes', 'delete')
    
    deleted = await delete_class_with_sections(db, class_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    return {"detail": "Class deleted successfully"}

@router.get("/class-section-list", response_model=list[ClassSectionInfo])
async def list_class_sections(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'classes', 'list')
    
    return await get_class_section_list(db)

@router.get("/class-list", response_model=List[ClassOut])
@rate_limit_dropdown("100 per minute")
async def get_all_classes(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'classes', 'list')
    
    return await get_all_classes_data(db)

@router.get("/section-list", response_model=List[SectionOut])
@rate_limit_dropdown("100 per minute")
async def get_all_sections(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'classes', 'list')
    
    return await get_all_sections_data(db)

@router.get("/sections-by-class-name", response_model=List[SectionOut])
@rate_limit_dropdown("100 per minute")
async def fetch_sections_by_class_name(request: Request, class_name: str = Query(..., description="Name of the class"), db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'classes', 'list')
    
    return await get_sections_by_class_name(db, class_name)

@router.get("/dropdown", response_model=List[ClassDropdown])
@rate_limit_dropdown("100 per minute")
async def get_classes_dropdown_endpoint(request: Request, active_only: bool = True, db: AsyncSession = Depends(get_tenant_db)):
    """Get classes for dropdown (id + name only). Rate limited to 100 requests per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'classes', 'list')
    
    return await get_classes_dropdown(db, active_only)

@router.get("/by_class_id/{class_id}/sections", response_model=List[SectionDropdown])
@rate_limit_dropdown("100 per minute")
async def get_sections_by_class_id_endpoint(request: Request, class_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    """Get sections by class ID for dropdown (id + name only). Rate limited to 100 requests per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'classes', 'list')
    
    return await get_sections_by_class_id(db, class_id)

@router.get("/by-class-section")
async def list_students_by_class_section(
    request: Request,
    class_name: str = Query(..., description="Class name (e.g., 'UKG')"),
    section_name: str = Query(..., description="Section name (e.g., 'A')"),
    db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'classes', 'list')
    
    return await get_students_by_class_section(class_name, section_name, db)