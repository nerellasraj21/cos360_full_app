import logging
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.masters.transport.route_model import Route
from app.models.masters.transport.transport_pricing_model import TransportPricing
from app.models.masters.transport.vehicle_model import Vehicle
from app.schemas.masters.transport.transport_pricing_schema import (
    TransportPricingCreate,
    TransportPricingUpdate,
)

logger = logging.getLogger(__name__)


def _pricing_to_dict(p: TransportPricing) -> dict:
    """Convert a TransportPricing ORM object to a response dict with display names."""
    return {
        "id": p.id,
        "vehicle_id": p.vehicle_id,
        "route_id": p.route_id,
        "billing_cycle": p.billing_cycle,
        "cycle_name": p.cycle_name,
        "amount": p.amount,
        "start_date": p.start_date,
        "end_date": p.end_date,
        "is_active": p.is_active,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
        "vehicle_name": p.vehicle.name if p.vehicle else None,
        "route_name": p.route.route_name if p.route else None,
    }


def _eager_options():
    return [
        selectinload(TransportPricing.vehicle),
        selectinload(TransportPricing.route),
    ]


async def _check_overlap(
    db: AsyncSession,
    vehicle_id: UUID,
    route_id: UUID | None,
    billing_cycle: str,
    start_date,
    end_date,
    exclude_id: UUID | None = None,
):
    """Check for overlapping date range on the same vehicle+route+billing_cycle."""
    conditions = [
        TransportPricing.vehicle_id == vehicle_id,
        TransportPricing.billing_cycle == billing_cycle,
        TransportPricing.is_active == True,  # noqa: E712
        TransportPricing.start_date < end_date,
        TransportPricing.end_date > start_date,
    ]
    if route_id is not None:
        conditions.append(TransportPricing.route_id == route_id)
    else:
        conditions.append(TransportPricing.route_id.is_(None))

    if exclude_id:
        conditions.append(TransportPricing.id != exclude_id)

    result = await db.execute(select(TransportPricing).where(and_(*conditions)))
    return result.scalar_one_or_none()


async def add_transport_pricing(data: TransportPricingCreate, db: AsyncSession):
    # Validate vehicle exists
    v = await db.execute(select(Vehicle).where(Vehicle.id == data.vehicle_id))
    if not v.scalar_one_or_none():
        raise HTTPException(404, "Vehicle not found")

    # Validate route exists (if provided)
    if data.route_id:
        r = await db.execute(select(Route).where(Route.id == data.route_id))
        if not r.scalar_one_or_none():
            raise HTTPException(404, "Route not found")

    # Check overlapping date range
    overlap = await _check_overlap(
        db, data.vehicle_id, data.route_id, data.billing_cycle.value, data.start_date, data.end_date
    )
    if overlap:
        raise HTTPException(
            400,
            f"Overlapping pricing exists for this vehicle/route/billing_cycle (id={overlap.id})",
        )

    pricing = TransportPricing(**data.dict())
    db.add(pricing)
    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(TransportPricing).options(*_eager_options()).where(TransportPricing.id == pricing.id)
    )
    return _pricing_to_dict(result.scalar_one())


async def get_all_transport_pricing(
    db: AsyncSession,
    vehicle_id: UUID | None = None,
    billing_cycle: str | None = None,
):
    query = select(TransportPricing).options(*_eager_options()).where(TransportPricing.is_active == True)  # noqa: E712
    if vehicle_id:
        query = query.where(TransportPricing.vehicle_id == vehicle_id)
    if billing_cycle:
        query = query.where(TransportPricing.billing_cycle == billing_cycle)
    query = query.order_by(TransportPricing.start_date.desc())

    result = await db.execute(query)
    return [_pricing_to_dict(p) for p in result.scalars().all()]


async def get_transport_pricing_by_id(pricing_id: UUID, db: AsyncSession):
    result = await db.execute(
        select(TransportPricing).options(*_eager_options()).where(TransportPricing.id == pricing_id)
    )
    pricing = result.scalar_one_or_none()
    if not pricing:
        raise HTTPException(404, "Transport pricing not found")
    return _pricing_to_dict(pricing)


async def update_transport_pricing(pricing_id: UUID, data: TransportPricingUpdate, db: AsyncSession):
    result = await db.execute(
        select(TransportPricing).options(*_eager_options()).where(TransportPricing.id == pricing_id)
    )
    pricing = result.scalar_one_or_none()
    if not pricing:
        raise HTTPException(404, "Transport pricing not found")

    update_data = data.dict(exclude_unset=True)

    # If dates or cycle changed, check overlap
    new_vehicle = update_data.get("vehicle_id", pricing.vehicle_id)
    new_route = update_data.get("route_id", pricing.route_id)
    new_cycle = update_data.get("billing_cycle", pricing.billing_cycle)
    new_start = update_data.get("start_date", pricing.start_date)
    new_end = update_data.get("end_date", pricing.end_date)

    if new_end <= new_start:
        raise HTTPException(400, "end_date must be after start_date")

    # Validate vehicle if changed
    if "vehicle_id" in update_data:
        v = await db.execute(select(Vehicle).where(Vehicle.id == new_vehicle))
        if not v.scalar_one_or_none():
            raise HTTPException(404, "Vehicle not found")

    # Validate route if changed
    if "route_id" in update_data and new_route:
        r = await db.execute(select(Route).where(Route.id == new_route))
        if not r.scalar_one_or_none():
            raise HTTPException(404, "Route not found")

    cycle_val = new_cycle.value if hasattr(new_cycle, "value") else new_cycle
    overlap = await _check_overlap(db, new_vehicle, new_route, cycle_val, new_start, new_end, exclude_id=pricing_id)
    if overlap:
        raise HTTPException(
            400,
            f"Overlapping pricing exists for this vehicle/route/billing_cycle (id={overlap.id})",
        )

    for key, value in update_data.items():
        setattr(pricing, key, value)

    await db.commit()

    # Reload
    result = await db.execute(
        select(TransportPricing).options(*_eager_options()).where(TransportPricing.id == pricing_id)
    )
    return _pricing_to_dict(result.scalar_one())


async def deactivate_transport_pricing(pricing_id: UUID, db: AsyncSession):
    result = await db.execute(select(TransportPricing).where(TransportPricing.id == pricing_id))
    pricing = result.scalar_one_or_none()
    if not pricing:
        raise HTTPException(404, "Transport pricing not found")
    pricing.is_active = False
    await db.commit()
    return {"message": "Transport pricing deactivated"}


async def get_pricing_by_vehicle(vehicle_id: UUID, db: AsyncSession, active_only: bool = True):
    """Return pricing for a specific vehicle — used for dropdown in student assignment form."""
    query = select(TransportPricing).where(TransportPricing.vehicle_id == vehicle_id)
    if active_only:
        query = query.where(TransportPricing.is_active == True)  # noqa: E712
    query = query.order_by(TransportPricing.cycle_name)

    result = await db.execute(query)
    return [
        {
            "id": p.id,
            "cycle_name": p.cycle_name,
            "billing_cycle": p.billing_cycle,
            "amount": p.amount,
        }
        for p in result.scalars().all()
    ]
