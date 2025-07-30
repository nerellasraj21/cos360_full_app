from fastapi import APIRouter, Depends, HTTPException,Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.models.masters.transport import Route
from app.schemas.masters.transport import RouteCreate, RouteUpdate, RouteOut
from app.schemas.masters.transport import RouteStopOut
from app.db.session import get_db
from sqlalchemy import update, delete
from app.service.masters.transport import add_route, get_all_routes, get_each_route_by_id, deactivate_route, update__all_details_route, update_partial_details_route
from app.service.masters.transport.routes_service import get_stops_by_route_name

router = APIRouter(prefix="/routes", tags=["Routes"])

@router.post("/", response_model=RouteOut)
async def create_route(data: RouteCreate, db: AsyncSession = Depends(get_db)):
    return await add_route(data,db)

@router.get("/all_routes", response_model=list[RouteOut])
async def get_routes(db: AsyncSession = Depends(get_db)):
    return await get_all_routes(db)

@router.get("/routeid/{route_id}", response_model=RouteOut)
async def get_route_by_id(route_id: int, db: AsyncSession = Depends(get_db)):
    return await get_each_route_by_id(route_id,db)

@router.put("/{route_id}", response_model=RouteOut)
async def update_route(route_id: int, data: RouteCreate, db: AsyncSession = Depends(get_db)):
    return await update__all_details_route(route_id,data,db)

@router.patch("/{route_id}", response_model=RouteOut)
async def patch_route(route_id: int, data: RouteUpdate, db: AsyncSession = Depends(get_db)):
    return await update_partial_details_route(route_id,data,db)

@router.delete("/{route_id}")
async def delete_route(route_id: int, db: AsyncSession = Depends(get_db)):
    return await deactivate_route(route_id,db)

@router.get("/stops-by-route", response_model=List[RouteStopOut])
async def fetch_stops_by_route_name(route_name: str = Query(...), db: AsyncSession = Depends(get_db)):
    return await get_stops_by_route_name(route_name, db)