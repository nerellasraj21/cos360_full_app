from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_create, rate_limit_dropdown
from app.schemas.masters.transport import RouteTypeCreate, RouteTypeDropdown, RouteTypeOut, RouteTypeUpdate
from app.service.masters.transport import (
    add_route_type,
    deactivate_route_type,
    get_all_route_types,
    get_route_type_by_id,
    get_route_types_dropdown,
    update_all_details_route_type,
    update_partial_details_route_type,
)
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/masters/route-types", tags=["Masters/Route Types"])


@router.post("/", response_model=RouteTypeOut)
@rate_limit_create("30 per minute")
async def create_route_type(request: Request, data: RouteTypeCreate, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "route_types", "create")

    return await add_route_type(data, db)


@router.get("/all", response_model=list[RouteTypeOut])
async def get_route_types(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "route_types", "list")

    return await get_all_route_types(db)


@router.get("/dropdown", response_model=list[RouteTypeDropdown])
@rate_limit_dropdown("100 per minute")
async def get_route_types_dropdown_endpoint(
    request: Request, active_only: bool = True, db: AsyncSession = Depends(get_tenant_db)
):
    """Get route types for dropdown (id + type_name only). Rate limited to 100 requests per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "route_types", "list")

    return await get_route_types_dropdown(db, active_only)


@router.get("/{route_type_id}", response_model=RouteTypeOut)
async def get_route_type_by_id_endpoint(
    request: Request, route_type_id: UUID, db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "route_types", "read")

    return await get_route_type_by_id(route_type_id, db)


@router.put("/{route_type_id}", response_model=RouteTypeOut)
async def update_route_type(
    request: Request, route_type_id: UUID, data: RouteTypeCreate, db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "route_types", "update")

    return await update_all_details_route_type(route_type_id, data, db)


@router.patch("/{route_type_id}", response_model=RouteTypeOut)
async def patch_route_type(
    request: Request, route_type_id: UUID, data: RouteTypeUpdate, db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "route_types", "update")

    return await update_partial_details_route_type(route_type_id, data, db)


@router.delete("/{route_type_id}")
async def delete_route_type(request: Request, route_type_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "route_types", "delete")

    return await deactivate_route_type(route_type_id, db)
