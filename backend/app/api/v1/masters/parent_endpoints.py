from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID
from app.schemas.masters.parent_schema import ParentCreate, ParentUpdate, ParentOut
from app.service.masters.parent_service import (
    create_parent,
    get_parent_by_id,
    get_all_parents,
    update_parent,
    delete_parent,
)
from app.db.tenant_session import get_tenant_db
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error

router = APIRouter(prefix="/parents", tags=["Parents"])


@router.post("/", response_model=ParentOut, status_code=status.HTTP_201_CREATED)
async def create_parent_profile(
    parent_data: ParentCreate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Create parent profile - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'parent_management', 'create')
    
    return await create_parent(parent_data, db)


@router.get("/{parent_id}", response_model=ParentOut)
async def read_parent(
    parent_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get parent by ID - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'parent_management', 'read')
    
    parent = await get_parent_by_id(parent_id, db)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    return parent


@router.get("/", response_model=List[ParentOut])
async def list_all_parents(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """List all parents - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'parent_management', 'list')
    
    parents = await get_all_parents(db)
    return [ParentOut.from_orm_with_students(p) for p in parents]


@router.patch("/{parent_id}", response_model=ParentOut)
async def update_parent_profile(
    parent_id: UUID,
    parent_data: ParentUpdate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Update parent profile - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'parent_management', 'update')
    
    updated = await update_parent(parent_id, parent_data, db)
    if not updated:
        raise HTTPException(status_code=404, detail="Parent not found")
    return updated


@router.delete("/{parent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_parent_profile(
    parent_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Delete parent profile - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'parent_management', 'delete')
    
    deleted = await delete_parent(parent_id, db)
    if not deleted:
        raise HTTPException(status_code=404, detail="Parent not found")
