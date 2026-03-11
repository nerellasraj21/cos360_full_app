from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_api
from app.models.masters.transport.transport_pricing_model import BillingCycleEnum
from app.schemas.masters.transport.transport_pricing_schema import (
    TransportPricingCreate,
    TransportPricingDropdown,
    TransportPricingOut,
    TransportPricingUpdate,
)
from app.service.masters.transport.transport_pricing_service import (
    add_transport_pricing,
    deactivate_transport_pricing,
    get_all_transport_pricing,
    get_pricing_by_vehicle,
    get_transport_pricing_by_id,
    update_transport_pricing,
)
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/masters/transport-pricing", tags=["Masters/Transport Pricing"])


@router.post("/", response_model=TransportPricingOut, status_code=status.HTTP_201_CREATED)
@rate_limit_api()
async def create_transport_pricing(
    request: Request, data: TransportPricingCreate, db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "transport_pricing", "create")
    return await add_transport_pricing(data, db)


@router.get("/", response_model=list[TransportPricingOut])
async def list_transport_pricing(
    request: Request,
    vehicle_id: UUID | None = Query(None),
    billing_cycle: BillingCycleEnum | None = Query(None),
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "transport_pricing", "list")
    return await get_all_transport_pricing(db, vehicle_id=vehicle_id, billing_cycle=billing_cycle)


@router.get("/dropdown", response_model=list[TransportPricingDropdown])
@rate_limit_api()
async def transport_pricing_dropdown(
    request: Request,
    vehicle_id: UUID = Query(...),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get pricing options for a specific vehicle — used in student transport assignment form."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "transport_pricing", "list")
    return await get_pricing_by_vehicle(vehicle_id, db)


@router.get("/{pricing_id}", response_model=TransportPricingOut)
async def read_transport_pricing(
    request: Request, pricing_id: UUID, db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "transport_pricing", "read")
    return await get_transport_pricing_by_id(pricing_id, db)


@router.put("/{pricing_id}", response_model=TransportPricingOut)
async def full_update_transport_pricing(
    request: Request, pricing_id: UUID, data: TransportPricingCreate, db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "transport_pricing", "update")
    # Convert Create → Update (all fields set)
    update_data = TransportPricingUpdate(**data.dict())
    return await update_transport_pricing(pricing_id, update_data, db)


@router.patch("/{pricing_id}", response_model=TransportPricingOut)
async def partial_update_transport_pricing(
    request: Request, pricing_id: UUID, data: TransportPricingUpdate, db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "transport_pricing", "update")
    return await update_transport_pricing(pricing_id, data, db)


@router.delete("/{pricing_id}")
async def delete_transport_pricing(
    request: Request, pricing_id: UUID, db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "transport_pricing", "delete")
    return await deactivate_transport_pricing(pricing_id, db)
