from sqlalchemy import select
from app.models.masters.transport import Trip
from app.schemas.masters.transport import TripCreate, TripUpdate
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

async def add_trip(data: TripCreate, db: AsyncSession):
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
    for key, value in data.dict(exclude_unset=True).items():
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
    return {"message": "Trip deleted"}
