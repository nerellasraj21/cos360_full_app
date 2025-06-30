from sqlalchemy import select
from app.models.masters.transport import RouteStop
from app.schemas.masters.transport import RouteStopCreate, RouteStopUpdate
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

async def add_route_stop(data: RouteStopCreate, db: AsyncSession):
    stop = RouteStop(**data.dict())
    db.add(stop)
    await db.commit()
    await db.refresh(stop)
    return stop

async def get_route_stops(db: AsyncSession):
    result = await db.execute(select(RouteStop).where(RouteStop.is_active == True))
    return result.scalars().all()

async def get_each_route_stop_by_id(stop_id: int, db: AsyncSession):
    result = await db.execute(select(RouteStop).where(RouteStop.id == stop_id))
    stop = result.scalar_one_or_none()
    if not stop:
        raise HTTPException(404, detail="Route stop not found")
    return stop

async def update_all_details_route_stop(stop_id: int, data: RouteStopCreate, db: AsyncSession):
    result = await db.execute(select(RouteStop).where(RouteStop.id == stop_id))
    stop = result.scalar_one_or_none()
    if not stop:
        raise HTTPException(404, detail="Route stop not found")
    for key, value in data.dict().items():
        setattr(stop, key, value)
    await db.commit()
    await db.refresh(stop)
    return stop

async def update_partial_details_route_stop(stop_id: int, data: RouteStopUpdate, db: AsyncSession):
    result = await db.execute(select(RouteStop).where(RouteStop.id == stop_id))
    stop = result.scalar_one_or_none()
    if not stop:
        raise HTTPException(404, detail="Route stop not found")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(stop, key, value)
    await db.commit()
    await db.refresh(stop)
    return stop

async def deactivate_route_stop(stop_id: int, db: AsyncSession):
    result = await db.execute(select(RouteStop).where(RouteStop.id == stop_id))
    stop = result.scalar_one_or_none()
    if not stop:
        raise HTTPException(404, detail="Route stop not found")
    stop.is_active = False
    await db.commit()
    return {"message": "Route stop soft deleted"}
