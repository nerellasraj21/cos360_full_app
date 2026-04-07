import logging as log
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.masters.transport import Route
from app.schemas.masters.transport import RouteCreate, RouteUpdate
from app.tools.cache_utils import cache_dropdown, invalidate_cache

log = log.getLogger("masters.transport.routes_service")


async def add_route(data: RouteCreate, db: AsyncSession):
    route = Route(**data.dict())
    db.add(route)
    await db.commit()
    await db.refresh(route)

    # Invalidate cache after creating new route
    invalidate_cache("dropdown", "routes")

    return route


async def get_all_routes(db: AsyncSession):
    result = await db.execute(select(Route).where(Route.is_active))
    return result.scalars().all()


async def get_each_route_by_id(route_id: UUID, db: AsyncSession):
    result = await db.execute(select(Route).where(Route.id == route_id))
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(404, "Route not found")
    return route


async def update__all_details_route(route_id: UUID, data: RouteCreate, db: AsyncSession):
    result = await db.execute(select(Route).where(Route.id == route_id))
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(404, "Route not found")
    for key, value in data.dict().items():
        setattr(route, key, value)
    await db.commit()
    await db.refresh(route)
    return route


async def update_partial_details_route(route_id: UUID, data: RouteUpdate, db: AsyncSession):
    result = await db.execute(select(Route).where(Route.id == route_id))
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(404, "Route not found")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(route, key, value)
    await db.commit()
    await db.refresh(route)
    return route


async def deactivate_route(route_id: UUID, db: AsyncSession):
    result = await db.execute(select(Route).where(Route.id == route_id))
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(404, "Route not found")
    route.is_active = False
    await db.commit()
    await db.refresh(route)
    return route


async def get_stops_by_route_name(route_name: str, db):
    stmt = select(Route).where(Route.route_name == route_name).options(selectinload(Route.stops))
    result = await db.execute(stmt)
    route = result.scalars().first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    return route.stops


@cache_dropdown(ttl=300)  # Cache for 5 minutes
async def get_routes_dropdown(db: AsyncSession, active_only: bool = True):
    """Get routes for dropdown (id + route_name only) - Cached"""
    try:
        query = select(Route.id, Route.route_name)
        if active_only:
            query = query.where(Route.is_active)
        result = await db.execute(query.order_by(Route.route_name))
        routes = result.all()

        log.debug(f"Retrieved {len(routes)} routes for dropdown from database")
        return [{"id": route.id, "route_name": route.route_name} for route in routes]
    except Exception as e:
        log.error(f"Error fetching routes dropdown: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Fetching routes dropdown failed: {str(e)}")
