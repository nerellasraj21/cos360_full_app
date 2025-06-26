from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.service.auth import create_permission, get_all_permissions
from app.schemas.auth import RoleMenuPermissionCreate, RoleMenuPermissionRead
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

@router.post("/permissions/", response_model=RoleMenuPermissionRead)
async def create_permission_endpoint(permission: RoleMenuPermissionCreate, db: AsyncSession = Depends(get_db)):
    return await create_permission(db, permission)

@router.get("/permissions/", response_model=list[RoleMenuPermissionRead])
async def get_permissions_endpoint(db: AsyncSession = Depends(get_db)):
    return await get_all_permissions(db)
