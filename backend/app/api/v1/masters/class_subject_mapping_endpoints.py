from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.tenant_session import get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_dropdown, rate_limit_api, rate_limit_create
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error
from app.schemas.masters.class_subject_mapping_schema import (
    ClassSubjectMapCreate,
    ClassSubjectMapRead,
    ClassSubjectMapUpdate,
    ClassSubjectMapDropdown,
    ClassSubjectMapBulkCreate,
    ClassSubjectMapBulkResponse,
    SubjectMappingItem
)
from app.schemas.common.pagination_schema import PaginatedResponse
from app.service.masters.class_subject_mapping_service import (
    create_class_subject_mapping,
    bulk_create_or_update_class_subject_mappings,
    get_class_subject_mapping_by_id,
    get_class_subject_mappings_by_class,
    get_all_class_subject_mappings,
    update_class_subject_mapping,
    delete_class_subject_mapping,
    get_class_subject_mappings_dropdown
)

router = APIRouter(prefix="/masters/class-subject-mappings", tags=["Masters/Class Subject Mappings"])

@router.post("/", response_model=ClassSubjectMapRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create_mapping(
    request: Request,
    mapping_data: ClassSubjectMapCreate,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Create a single class-subject mapping"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'class_subject_mappings', 'create')
    
    return await create_class_subject_mapping(db, mapping_data)

@router.post("/bulk", response_model=dict, status_code=status.HTTP_201_CREATED)
@rate_limit_create("10 per minute")
async def bulk_create_or_update_mappings(
    request: Request,
    bulk_data: ClassSubjectMapBulkCreate,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Bulk create or update class-subject mappings.
    This will replace all existing mappings for the class with the new ones.
    
    Request body example:
    {
        "class_id": "uuid",
        "academic_year_id": "uuid",
        "subjects": [
            {
                "subject_id": "uuid",
                "exclude_marks": false,
                "order": 1,
                "is_active": true
            },
            {
                "subject_id": "uuid",
                "exclude_marks": true,
                "order": 2,
                "is_active": true
            }
        ]
    }
    """
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'class_subject_mappings', 'create')
    
    # Convert subjects list to dict format expected by service
    mappings_data = [
        {
            "subject_id": subject.subject_id,
            "exclude_marks": subject.exclude_marks,
            "order": subject.order,
            "is_active": subject.is_active
        }
        for subject in bulk_data.subjects
    ]
    
    result = await bulk_create_or_update_class_subject_mappings(
        db,
        bulk_data.class_id,
        bulk_data.academic_year_id,
        mappings_data
    )
    
    # Convert mappings to read schema
    mappings_read = []
    for mapping in result['mappings']:
        mapping_dict = {
            "id": mapping.id,
            "class_id": mapping.class_id,
            "subject_id": mapping.subject_id,
            "academic_year_id": mapping.academic_year_id,
            "exclude_marks": mapping.exclude_marks,
            "order": mapping.order,
            "is_active": mapping.is_active,
            "created_at": mapping.created_at,
            "updated_at": mapping.updated_at,
            "class_name": mapping.class_.name if hasattr(mapping, 'class_') and mapping.class_ else None,
            "subject_name": mapping.subject.name if hasattr(mapping, 'subject') and mapping.subject else None,
            "academic_year_name": mapping.academic_year.title if hasattr(mapping, 'academic_year') and mapping.academic_year else None
        }
        mappings_read.append(mapping_dict)
    
    return {
        "success": result['success'],
        "message": result['message'],
        "created_count": len(mappings_read),
        "mappings": mappings_read
    }

@router.get("/", response_model=PaginatedResponse[ClassSubjectMapRead])
async def get_all_mappings(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    academic_year_id: Optional[UUID] = None,
    active_only: bool = True,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get all class-subject mappings with pagination"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'class_subject_mappings', 'list')

    result = await get_all_class_subject_mappings(db, skip, limit, academic_year_id, active_only)

    # Convert items to read schema
    items = []
    for mapping in result["items"]:
        mapping_dict = {
            "id": mapping.id,
            "class_id": mapping.class_id,
            "subject_id": mapping.subject_id,
            "academic_year_id": mapping.academic_year_id,
            "exclude_marks": mapping.exclude_marks,
            "order": mapping.order,
            "is_active": mapping.is_active,
            "created_at": mapping.created_at,
            "updated_at": mapping.updated_at,
            "class_name": mapping.class_.name if mapping.class_ else None,
            "subject_name": mapping.subject.name if mapping.subject else None,
            "academic_year_name": mapping.academic_year.title if mapping.academic_year else None
        }
        items.append(ClassSubjectMapRead(**mapping_dict))

    return PaginatedResponse[ClassSubjectMapRead](
        items=items,
        total_count=result["total_count"],
        has_next=result["has_next"]
    )

@router.get("/by-class/{class_id}", response_model=List[ClassSubjectMapRead])
async def get_mappings_by_class(
    request: Request,
    class_id: UUID,
    academic_year_id: Optional[UUID] = None,
    active_only: bool = True,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get all subject mappings for a specific class"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'class_subject_mappings', 'read')
    
    mappings = await get_class_subject_mappings_by_class(db, class_id, academic_year_id, active_only)
    
    # Convert to read schema
    result = []
    for mapping in mappings:
        mapping_dict = {
            "id": mapping.id,
            "class_id": mapping.class_id,
            "subject_id": mapping.subject_id,
            "academic_year_id": mapping.academic_year_id,
            "exclude_marks": mapping.exclude_marks,
            "order": mapping.order,
            "is_active": mapping.is_active,
            "created_at": mapping.created_at,
            "updated_at": mapping.updated_at,
            "class_name": mapping.class_.name if mapping.class_ else None,
            "subject_name": mapping.subject.name if mapping.subject else None,
            "academic_year_name": mapping.academic_year.title if mapping.academic_year else None
        }
        result.append(ClassSubjectMapRead(**mapping_dict))
    
    return result

@router.get("/dropdown", response_model=List[ClassSubjectMapDropdown])
@rate_limit_dropdown("100 per minute")
async def get_mappings_dropdown(
    request: Request,
    class_id: Optional[UUID] = None,
    academic_year_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get class-subject mappings for dropdown"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'class_subject_mappings', 'list')
    
    return await get_class_subject_mappings_dropdown(db, class_id, academic_year_id)

@router.get("/{mapping_id}", response_model=ClassSubjectMapRead)
async def get_mapping(
    request: Request,
    mapping_id: UUID,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get a single class-subject mapping by ID"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'class_subject_mappings', 'read')
    
    mapping = await get_class_subject_mapping_by_id(db, mapping_id)
    
    return ClassSubjectMapRead(
        id=mapping.id,
        class_id=mapping.class_id,
        subject_id=mapping.subject_id,
        academic_year_id=mapping.academic_year_id,
        exclude_marks=mapping.exclude_marks,
        order=mapping.order,
        is_active=mapping.is_active,
        created_at=mapping.created_at,
        updated_at=mapping.updated_at,
        class_name=mapping.class_.name if mapping.class_ else None,
        subject_name=mapping.subject.name if mapping.subject else None,
        academic_year_name=mapping.academic_year.title if mapping.academic_year else None
    )

@router.put("/{mapping_id}", response_model=ClassSubjectMapRead)
async def update_mapping(
    request: Request,
    mapping_id: UUID,
    mapping_update: ClassSubjectMapUpdate,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Update a class-subject mapping"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'class_subject_mappings', 'update')
    
    mapping = await update_class_subject_mapping(db, mapping_id, mapping_update)

    return ClassSubjectMapRead(
        id=mapping.id,
        class_id=mapping.class_id,
        subject_id=mapping.subject_id,
        academic_year_id=mapping.academic_year_id,
        exclude_marks=mapping.exclude_marks,
        order=mapping.order,
        is_active=mapping.is_active,
        created_at=mapping.created_at,
        updated_at=mapping.updated_at,
        class_name=mapping.class_.name if mapping.class_ else None,
        subject_name=mapping.subject.name if mapping.subject else None,
        academic_year_name=mapping.academic_year.title if mapping.academic_year else None
    )

@router.delete("/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mapping(
    request: Request,
    mapping_id: UUID,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Delete a class-subject mapping"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'class_subject_mappings', 'delete')
    
    await delete_class_subject_mapping(db, mapping_id)
    return {"detail": "Class-subject mapping deleted successfully"}