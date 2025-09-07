from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from app.service.auth import create_role, get_all_roles
from app.schemas.auth import RoleCreate, RoleRead
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.tools.simple_permissions import check_role_permission, get_current_user_token

router = APIRouter(prefix="/auth/roles", tags=["Auth/Roles"])

@router.post("/roles/", response_model=RoleRead, status_code=status.HTTP_201_CREATED)
async def create_role_endpoint(role: RoleCreate, request: Request, db: AsyncSession = Depends(get_db)):
    """Create role - Admin only"""
    current_user = await get_current_user_token(request)
    user_role = current_user.get('role')
    
    has_permission = await check_role_permission(db, user_role, 'role_management', 'create')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {user_role} cannot create role_management"
        )
    
    return await create_role(db, role)

@router.get("/roles/", response_model=list[RoleRead])
async def get_roles_endpoint(request: Request, db: AsyncSession = Depends(get_db)):
    """List all roles - Admin only"""
    current_user = await get_current_user_token(request)
    user_role = current_user.get('role')
    
    has_permission = await check_role_permission(db, user_role, 'role_management', 'list')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {user_role} cannot list role_management"
        )
    
    return await get_all_roles(db)
