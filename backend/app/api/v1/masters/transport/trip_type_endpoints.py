from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_create, rate_limit_dropdown
from app.schemas.masters.transport import TripTypeCreate, TripTypeDropdown, TripTypeOut, TripTypeUpdate
from app.service.masters.transport import (
    add_trip_type,
    deactivate_trip_type,
    get_all_trip_types,
    get_trip_type_by_id,
    get_trip_types_dropdown,
    update_all_details_trip_type,
    update_partial_details_trip_type,
)
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/masters/trip-types", tags=["Masters/Trip Types"])


@router.post("/", response_model=TripTypeOut)
@rate_limit_create("30 per minute")
async def create_trip_type(request: Request, data: TripTypeCreate, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "trip_types", "create")

    return await add_trip_type(data, db)


@router.get("/all", response_model=list[TripTypeOut])
async def get_trip_types(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "trip_types", "list")

    return await get_all_trip_types(db)


@router.get("/dropdown", response_model=list[TripTypeDropdown])
@rate_limit_dropdown("100 per minute")
async def get_trip_types_dropdown_endpoint(
    request: Request, active_only: bool = True, db: AsyncSession = Depends(get_tenant_db)
):
    """Get trip types for dropdown (id + type_name only). Rate limited to 100 requests per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "trip_types", "list")

    return await get_trip_types_dropdown(db, active_only)


@router.get("/{trip_type_id}", response_model=TripTypeOut)
async def get_trip_type_by_id_endpoint(request: Request, trip_type_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "trip_types", "read")

    return await get_trip_type_by_id(trip_type_id, db)


@router.put("/{trip_type_id}", response_model=TripTypeOut)
async def update_trip_type(
    request: Request, trip_type_id: UUID, data: TripTypeCreate, db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "trip_types", "update")

    return await update_all_details_trip_type(trip_type_id, data, db)


@router.patch("/{trip_type_id}", response_model=TripTypeOut)
async def patch_trip_type(
    request: Request, trip_type_id: UUID, data: TripTypeUpdate, db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "trip_types", "update")

    return await update_partial_details_trip_type(trip_type_id, data, db)


@router.delete("/{trip_type_id}")
async def delete_trip_type(request: Request, trip_type_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "trip_types", "delete")

    return await deactivate_trip_type(trip_type_id, db)
