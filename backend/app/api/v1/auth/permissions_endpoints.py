from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from app.service.auth import create_permission, get_all_permissions
from app.schemas.auth import RoleMenuPermissionCreate, RoleMenuPermissionRead
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.tools.simple_permissions import check_role_permission, get_current_user_token

router = APIRouter()

@router.post("/permissions/", response_model=RoleMenuPermissionRead, status_code=status.HTTP_201_CREATED)
async def create_permission_endpoint(permission: RoleMenuPermissionCreate, request: Request, db: AsyncSession = Depends(get_db)):
    """Create permission - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'permission_management', 'create')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot create permission_management"
        )
    
    return await create_permission(db, permission)

@router.get("/permissions/", response_model=list[RoleMenuPermissionRead])
async def get_permissions_endpoint(request: Request, db: AsyncSession = Depends(get_db)):
    """List all permissions - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'permission_management', 'list')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot list permission_management"
        )
    
    return await get_all_permissions(db)
