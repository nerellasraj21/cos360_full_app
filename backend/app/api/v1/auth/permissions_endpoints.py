from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.schemas.auth import RoleMenuPermissionCreate, RoleMenuPermissionRead
from app.service.auth import create_permission, get_all_permissions
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/auth", tags=["Auth/Permissions"])


@router.post("/permissions/", response_model=RoleMenuPermissionRead, status_code=status.HTTP_201_CREATED)
async def create_permission_endpoint(
    permission: RoleMenuPermissionCreate, request: Request, db: AsyncSession = Depends(get_tenant_db)
):
    """Create permission - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "permission_management", "create")

    return await create_permission(db, permission)


@router.get("/permissions/", response_model=list[RoleMenuPermissionRead])
async def get_permissions_endpoint(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """List all permissions - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "permission_management", "list")

    return await get_all_permissions(db)
