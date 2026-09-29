from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.schemas.auth import RoleCreate, RoleRead
from app.service.auth import create_role, get_all_roles
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/auth/roles", tags=["Auth/Roles"])


@router.post("/roles/", response_model=RoleRead, status_code=status.HTTP_201_CREATED)
async def create_role_endpoint(role: RoleCreate, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Create role - Admin only"""
    current_user = await get_current_user_token(request)
    user_role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, user_role, "role_management", "create")

    return await create_role(db, role)


@router.get("/roles/", response_model=list[RoleRead])
async def get_roles_endpoint(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """List all roles - Admin only"""
    current_user = await get_current_user_token(request)
    user_role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, user_role, "role_management", "list")

    return await get_all_roles(db)
