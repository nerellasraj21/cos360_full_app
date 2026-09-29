from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.masters.transport import RouteStop
from app.schemas.masters.transport import RouteStopCreate, RouteStopUpdate


async def add_route_stop(data: RouteStopCreate, db: AsyncSession):
    existing = await db.execute(
        select(RouteStop).where(RouteStop.route_id == data.route_id, RouteStop.number == data.number)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, f"Stop number {data.number} already exists on this route")
    stop = RouteStop(**data.dict())
    db.add(stop)
    await db.commit()
    await db.refresh(stop, ["route"])

    # Create response dict with route_name
    stop_dict = {
        "id": stop.id,
        "route_id": stop.route_id,
        "name": stop.name,
        "number": stop.number,
        "reaching_time": stop.reaching_time,
        "pickup_time": stop.pickup_time,
        "drop_time": stop.drop_time,
        "fees": stop.fees,
        "is_active": stop.is_active,
        "route_name": stop.route.route_name if stop.route else None,
    }
    return stop_dict


async def get_route_stops(db: AsyncSession):
    result = await db.execute(select(RouteStop).options(selectinload(RouteStop.route)).where(RouteStop.is_active))
    stops = result.scalars().all()

    # Convert to dicts with route_name
    stops_list = []
    for stop in stops:
        stop_dict = {
            "id": stop.id,
            "route_id": stop.route_id,
            "name": stop.name,
            "number": stop.number,
            "reaching_time": stop.reaching_time,
            "pickup_time": stop.pickup_time,
            "drop_time": stop.drop_time,
            "fees": stop.fees,
            "is_active": stop.is_active,
            "route_name": stop.route.route_name if stop.route else None,
        }
        stops_list.append(stop_dict)

    return stops_list


async def get_each_route_stop_by_id(stop_id: UUID, db: AsyncSession):
    result = await db.execute(select(RouteStop).options(selectinload(RouteStop.route)).where(RouteStop.id == stop_id))
    stop = result.scalar_one_or_none()
    if not stop:
        raise HTTPException(404, detail="Route stop not found")

    # Create response dict with route_name
    stop_dict = {
        "id": stop.id,
        "route_id": stop.route_id,
        "name": stop.name,
        "number": stop.number,
        "reaching_time": stop.reaching_time,
        "pickup_time": stop.pickup_time,
        "drop_time": stop.drop_time,
        "fees": stop.fees,
        "is_active": stop.is_active,
        "route_name": stop.route.route_name if stop.route else None,
    }
    return stop_dict


async def update_all_details_route_stop(stop_id: UUID, data: RouteStopCreate, db: AsyncSession):
    result = await db.execute(select(RouteStop).options(selectinload(RouteStop.route)).where(RouteStop.id == stop_id))
    stop = result.scalar_one_or_none()
    if not stop:
        raise HTTPException(404, detail="Route stop not found")
    if data.number != stop.number or data.route_id != stop.route_id:
        dup = await db.execute(
            select(RouteStop).where(
                RouteStop.route_id == data.route_id,
                RouteStop.number == data.number,
                RouteStop.id != stop_id,
            )
        )
        if dup.scalar_one_or_none():
            raise HTTPException(400, f"Stop number {data.number} already exists on this route")
    for key, value in data.dict().items():
        setattr(stop, key, value)
    await db.commit()
    await db.refresh(stop, ["route"])

    # Create response dict with route_name
    stop_dict = {
        "id": stop.id,
        "route_id": stop.route_id,
        "name": stop.name,
        "number": stop.number,
        "reaching_time": stop.reaching_time,
        "pickup_time": stop.pickup_time,
        "drop_time": stop.drop_time,
        "fees": stop.fees,
        "is_active": stop.is_active,
        "route_name": stop.route.route_name if stop.route else None,
    }
    return stop_dict


async def update_partial_details_route_stop(stop_id: UUID, data: RouteStopUpdate, db: AsyncSession):
    result = await db.execute(select(RouteStop).options(selectinload(RouteStop.route)).where(RouteStop.id == stop_id))
    stop = result.scalar_one_or_none()
    if not stop:
        raise HTTPException(404, detail="Route stop not found")
    new_number = data.number if data.number is not None else stop.number
    new_route_id = data.route_id if data.route_id is not None else stop.route_id
    if new_number != stop.number or new_route_id != stop.route_id:
        dup = await db.execute(
            select(RouteStop).where(
                RouteStop.route_id == new_route_id,
                RouteStop.number == new_number,
                RouteStop.id != stop_id,
            )
        )
        if dup.scalar_one_or_none():
            raise HTTPException(400, f"Stop number {new_number} already exists on this route")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(stop, key, value)
    await db.commit()
    await db.refresh(stop, ["route"])

    # Create response dict with route_name
    stop_dict = {
        "id": stop.id,
        "route_id": stop.route_id,
        "name": stop.name,
        "number": stop.number,
        "reaching_time": stop.reaching_time,
        "pickup_time": stop.pickup_time,
        "drop_time": stop.drop_time,
        "fees": stop.fees,
        "is_active": stop.is_active,
        "route_name": stop.route.route_name if stop.route else None,
    }
    return stop_dict


async def deactivate_route_stop(stop_id: UUID, db: AsyncSession):
    result = await db.execute(select(RouteStop).where(RouteStop.id == stop_id))
    stop = result.scalar_one_or_none()
    if not stop:
        raise HTTPException(404, detail="Route stop not found")
    stop.is_active = False
    await db.commit()
    await db.refresh(stop)
    return stop
