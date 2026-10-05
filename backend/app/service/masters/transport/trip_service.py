from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.masters.transport import Trip
from app.schemas.masters.transport import TripCreate, TripUpdate


async def _ensure_vehicle_route_free(db: AsyncSession, vehicle_id: UUID, route_id: UUID, exclude_id: UUID | None = None):
    query = select(Trip.id).where(Trip.vehicle_id == vehicle_id, Trip.route_id == route_id)
    if exclude_id is not None:
        query = query.where(Trip.id != exclude_id)
    existing = await db.execute(query.limit(1))
    if existing.scalars().first():
        raise HTTPException(400, "This vehicle is already assigned to this route")


async def add_trip(data: TripCreate, db: AsyncSession):
    await _ensure_vehicle_route_free(db, data.vehicle_id, data.route_id)
    trip = Trip(**data.dict())
    db.add(trip)
    await db.commit()
    await db.refresh(trip)
    return trip


async def get_trips(db: AsyncSession):
    result = await db.execute(select(Trip))
    return result.scalars().all()


async def get_individual_trip_by_id(trip_id: UUID, db: AsyncSession):
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(404, detail="Trip not found")
    return trip


async def update_all_details_trip(trip_id: UUID, data: TripCreate, db: AsyncSession):
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(404, detail="Trip not found")
    if data.vehicle_id != trip.vehicle_id or data.route_id != trip.route_id:
        await _ensure_vehicle_route_free(db, data.vehicle_id, data.route_id, trip.id)
    for key, value in data.dict().items():
        setattr(trip, key, value)
    await db.commit()
    await db.refresh(trip)
    return trip


async def update_partial_details_trip(trip_id: UUID, data: TripUpdate, db: AsyncSession):
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(404, detail="Trip not found")
    changes = data.dict(exclude_unset=True)
    new_vehicle_id = changes.get("vehicle_id") or trip.vehicle_id
    new_route_id = changes.get("route_id") or trip.route_id
    if new_vehicle_id != trip.vehicle_id or new_route_id != trip.route_id:
        await _ensure_vehicle_route_free(db, new_vehicle_id, new_route_id, trip.id)
    for key, value in changes.items():
        setattr(trip, key, value)
    await db.commit()
    await db.refresh(trip)
    return trip


async def delete_a_trip(trip_id: UUID, db: AsyncSession):
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(404, detail="Trip not found")
    await db.delete(trip)
    await db.commit()
    return trip
