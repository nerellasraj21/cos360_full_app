from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.masters.transport import Route
from app.schemas.masters.transport import RouteCreate, RouteUpdate
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

async def add_route(data: RouteCreate, db: AsyncSession):
    route = Route(**data.dict())
    db.add(route)
    await db.commit()
    await db.refresh(route)
    return route

async def get_all_routes(db: AsyncSession):
    result = await db.execute(select(Route).where(Route.is_active == True))
    return result.scalars().all()

async def get_each_route_by_id(route_id: int, db: AsyncSession):
    result = await db.execute(select(Route).where(Route.id == route_id))
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(404, "Route not found")
    return route

async def update__all_details_route(route_id: int, data: RouteCreate, db: AsyncSession):
    result = await db.execute(select(Route).where(Route.id == route_id))
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(404, "Route not found")
    for key, value in data.dict().items():
        setattr(route, key, value)
    await db.commit()
    await db.refresh(route)
    return route

async def update_partial_details_route(route_id: int, data: RouteUpdate, db: AsyncSession):
    result = await db.execute(select(Route).where(Route.id == route_id))
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(404, "Route not found")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(route, key, value)
    await db.commit()
    await db.refresh(route)
    return route

async def deactivate_route(route_id: int, db: AsyncSession):
    result = await db.execute(select(Route).where(Route.id == route_id))
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(404, "Route not found")
    route.is_active = False 
    await db.commit()
    return {"message": "Route soft deleted"}

async def get_stops_by_route_name(route_name: str, db):
    stmt = (
        select(Route)
        .where(Route.route_name == route_name)
        .options(selectinload(Route.stops))
    )
    result = await db.execute(stmt)
    route = result.scalars().first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    return route.stops
