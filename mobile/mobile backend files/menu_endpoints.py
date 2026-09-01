from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.schemas.auth import MenuCreate, MenuRead
from app.service.auth import create_menu, get_all_menus
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/auth", tags=["Auth/Menus"])


@router.post("/menus/", response_model=MenuRead, status_code=status.HTTP_201_CREATED)
async def create_menu_endpoint(menu: MenuCreate, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Create menu - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "menu_management", "create")

    return await create_menu(db, menu)


@router.get("/menus/", response_model=list[MenuRead])
async def get_menus_endpoint(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """List all menus - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "menu_management", "list")

    return await get_all_menus(db)
