from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.masters.transport import RouteStop
from app.schemas.masters.transport import RouteStopCreate, RouteStopUpdate, RouteStopOut
from app.db.session import get_db
from app.service.masters.transport import add_route_stop, update_partial_details_route_stop, update_all_details_route_stop, deactivate_route_stop, get_each_route_stop_by_id, get_route_stops

router = APIRouter(prefix="/masters/route-stops", tags=["Masters/Route Stops"])
 
@router.post("/", response_model=RouteStopOut)
async def create_route_stop(data: RouteStopCreate, db: AsyncSession = Depends(get_db)):
    return await add_route_stop(data,db)

@router.get("/", response_model=list[RouteStopOut])
async def get_all_route_stops(db: AsyncSession = Depends(get_db)):
    return await get_route_stops(db)

@router.get("/{stop_id}", response_model=RouteStopOut)
async def get_route_stop_by_id(stop_id: int, db: AsyncSession = Depends(get_db)):
    return await get_each_route_stop_by_id(stop_id,db)

@router.put("/{stop_id}", response_model=RouteStopOut)
async def update_route_stop(stop_id: int, data: RouteStopCreate, db: AsyncSession = Depends(get_db)):
    return await update_all_details_route_stop(stop_id,data,db)

@router.patch("/{stop_id}", response_model=RouteStopOut)
async def patch_route_stop(stop_id: int, data: RouteStopUpdate, db: AsyncSession = Depends(get_db)):
    return await update_partial_details_route_stop(stop_id,data,db)

@router.delete("/{stop_id}")
async def delete_route_stop(stop_id: int, db: AsyncSession = Depends(get_db)):
    return await deactivate_route_stop(stop_id,db)
