import logging as log
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.masters.transport import TripType
from app.schemas.masters.transport import TripTypeCreate, TripTypeUpdate
from app.tools.cache_utils import cache_dropdown, invalidate_cache

log = log.getLogger("masters.transport.trip_type_service")


async def add_trip_type(data: TripTypeCreate, db: AsyncSession):
    # Check if trip type with same name already exists
    result = await db.execute(select(TripType).where(TripType.type_name == data.type_name))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(400, f"Trip type '{data.type_name}' already exists")

    trip_type = TripType(**data.dict())
    db.add(trip_type)
    await db.commit()
    await db.refresh(trip_type)

    # Invalidate cache after creating new trip type
    invalidate_cache("dropdown", "trip_types")

    return trip_type


async def get_all_trip_types(db: AsyncSession):
    result = await db.execute(select(TripType).where(TripType.is_active))
    return result.scalars().all()


async def get_trip_type_by_id(trip_type_id: UUID, db: AsyncSession):
    result = await db.execute(select(TripType).where(TripType.id == trip_type_id))
    trip_type = result.scalar_one_or_none()
    if not trip_type:
        raise HTTPException(404, "Trip type not found")
    return trip_type


async def update_all_details_trip_type(trip_type_id: UUID, data: TripTypeCreate, db: AsyncSession):
    result = await db.execute(select(TripType).where(TripType.id == trip_type_id))
    trip_type = result.scalar_one_or_none()
    if not trip_type:
        raise HTTPException(404, "Trip type not found")

    # Check if new name conflicts with existing trip type
    if data.type_name != trip_type.type_name:
        existing = await db.execute(select(TripType).where(TripType.type_name == data.type_name))
        if existing.scalar_one_or_none():
            raise HTTPException(400, f"Trip type '{data.type_name}' already exists")

    for key, value in data.dict().items():
        setattr(trip_type, key, value)
    await db.commit()
    await db.refresh(trip_type)

    # Invalidate cache after updating
    invalidate_cache("dropdown", "trip_types")

    return trip_type


async def update_partial_details_trip_type(trip_type_id: UUID, data: TripTypeUpdate, db: AsyncSession):
    result = await db.execute(select(TripType).where(TripType.id == trip_type_id))
    trip_type = result.scalar_one_or_none()
    if not trip_type:
        raise HTTPException(404, "Trip type not found")

    # Check if new name conflicts with existing trip type
    if data.type_name and data.type_name != trip_type.type_name:
        existing = await db.execute(select(TripType).where(TripType.type_name == data.type_name))
        if existing.scalar_one_or_none():
            raise HTTPException(400, f"Trip type '{data.type_name}' already exists")

    for key, value in data.dict(exclude_unset=True).items():
        setattr(trip_type, key, value)
    await db.commit()
    await db.refresh(trip_type)

    # Invalidate cache after updating
    invalidate_cache("dropdown", "trip_types")

    return trip_type


async def deactivate_trip_type(trip_type_id: UUID, db: AsyncSession):
    result = await db.execute(select(TripType).where(TripType.id == trip_type_id))
    trip_type = result.scalar_one_or_none()
    if not trip_type:
        raise HTTPException(404, "Trip type not found")
    trip_type.is_active = False
    await db.commit()

    # Invalidate cache after deactivating
    invalidate_cache("dropdown", "trip_types")

    return {"message": "Trip type soft deleted"}


@cache_dropdown(ttl=300)  # Cache for 5 minutes
async def get_trip_types_dropdown(db: AsyncSession, active_only: bool = True):
    """Get trip types for dropdown (id + type_name only) - Cached"""
    try:
        query = select(TripType.id, TripType.type_name)
        if active_only:
            query = query.where(TripType.is_active)
        result = await db.execute(query.order_by(TripType.type_name))
        trip_types = result.all()

        log.debug(f"Retrieved {len(trip_types)} trip types for dropdown from database")
        return [{"id": tt.id, "type_name": tt.type_name} for tt in trip_types]
    except Exception as e:
        log.error(f"Error fetching trip types dropdown: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Fetching trip types dropdown failed: {str(e)}")
