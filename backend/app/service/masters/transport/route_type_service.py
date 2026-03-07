import logging as log
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.masters.transport import RouteType
from app.schemas.masters.transport import RouteTypeCreate, RouteTypeUpdate
from app.tools.cache_utils import cache_dropdown, invalidate_cache

log = log.getLogger("masters.transport.route_type_service")


async def add_route_type(data: RouteTypeCreate, db: AsyncSession):
    # Check if route type with same name already exists
    result = await db.execute(select(RouteType).where(RouteType.type_name == data.type_name))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(400, f"Route type '{data.type_name}' already exists")

    route_type = RouteType(**data.dict())
    db.add(route_type)
    await db.commit()
    await db.refresh(route_type)

    # Invalidate cache after creating new route type
    invalidate_cache("dropdown", "route_types")

    return route_type


async def get_all_route_types(db: AsyncSession):
    result = await db.execute(select(RouteType).where(RouteType.is_active))
    return result.scalars().all()


async def get_route_type_by_id(route_type_id: UUID, db: AsyncSession):
    result = await db.execute(select(RouteType).where(RouteType.id == route_type_id))
    route_type = result.scalar_one_or_none()
    if not route_type:
        raise HTTPException(404, "Route type not found")
    return route_type


async def update_all_details_route_type(route_type_id: UUID, data: RouteTypeCreate, db: AsyncSession):
    result = await db.execute(select(RouteType).where(RouteType.id == route_type_id))
    route_type = result.scalar_one_or_none()
    if not route_type:
        raise HTTPException(404, "Route type not found")

    # Check if new name conflicts with existing route type
    if data.type_name != route_type.type_name:
        existing = await db.execute(select(RouteType).where(RouteType.type_name == data.type_name))
        if existing.scalar_one_or_none():
            raise HTTPException(400, f"Route type '{data.type_name}' already exists")

    for key, value in data.dict().items():
        setattr(route_type, key, value)
    await db.commit()
    await db.refresh(route_type)

    # Invalidate cache after updating
    invalidate_cache("dropdown", "route_types")

    return route_type


async def update_partial_details_route_type(route_type_id: UUID, data: RouteTypeUpdate, db: AsyncSession):
    result = await db.execute(select(RouteType).where(RouteType.id == route_type_id))
    route_type = result.scalar_one_or_none()
    if not route_type:
        raise HTTPException(404, "Route type not found")

    # Check if new name conflicts with existing route type
    if data.type_name and data.type_name != route_type.type_name:
        existing = await db.execute(select(RouteType).where(RouteType.type_name == data.type_name))
        if existing.scalar_one_or_none():
            raise HTTPException(400, f"Route type '{data.type_name}' already exists")

    for key, value in data.dict(exclude_unset=True).items():
        setattr(route_type, key, value)
    await db.commit()
    await db.refresh(route_type)

    # Invalidate cache after updating
    invalidate_cache("dropdown", "route_types")

    return route_type


async def deactivate_route_type(route_type_id: UUID, db: AsyncSession):
    result = await db.execute(select(RouteType).where(RouteType.id == route_type_id))
    route_type = result.scalar_one_or_none()
    if not route_type:
        raise HTTPException(404, "Route type not found")
    route_type.is_active = False
    await db.commit()

    # Invalidate cache after deactivating
    invalidate_cache("dropdown", "route_types")

    return {"message": "Route type soft deleted"}


@cache_dropdown(ttl=300)  # Cache for 5 minutes
async def get_route_types_dropdown(db: AsyncSession, active_only: bool = True):
    """Get route types for dropdown (id + type_name only) - Cached"""
    try:
        query = select(RouteType.id, RouteType.type_name)
        if active_only:
            query = query.where(RouteType.is_active)
        result = await db.execute(query.order_by(RouteType.type_name))
        route_types = result.all()

        log.debug(f"Retrieved {len(route_types)} route types for dropdown from database")
        return [{"id": rt.id, "type_name": rt.type_name} for rt in route_types]
    except Exception as e:
        log.error(f"Error fetching route types dropdown: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Fetching route types dropdown failed: {str(e)}")
