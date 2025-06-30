from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.masters.transport import Trip
from app.schemas.masters.transport import TripCreate, TripUpdate, TripOut
from app.db.session import get_db
from app.service.masters.transport import update_partial_details_trip, update_all_details_trip, get_individual_trip_by_id, delete_a_trip, get_trips, add_trip


router = APIRouter(prefix="/trips", tags=["Trips"])

@router.post("/", response_model=TripOut)
async def create_trip(data: TripCreate, db: AsyncSession = Depends(get_db)):
    return await add_trip(data,db)
@router.get("/", response_model=list[TripOut])
async def get_all_trips(db: AsyncSession = Depends(get_db)):
    return await get_trips(db)

@router.get("/{trip_id}", response_model=TripOut)
async def get_trip_by_id(trip_id: int, db: AsyncSession = Depends(get_db)):
    return await get_individual_trip_by_id(trip_id,db)

@router.put("/{trip_id}", response_model=TripOut)
async def update_trip(trip_id: int, data: TripCreate, db: AsyncSession = Depends(get_db)):
    return await update_all_details_trip(trip_id,data,db)

@router.patch("/{trip_id}", response_model=TripOut)
async def patch_trip(trip_id: int, data: TripUpdate, db: AsyncSession = Depends(get_db)):
    return await update_partial_details_trip(trip_id,data,db)
@router.delete("/{trip_id}")
async def delete_trip(trip_id: int, db: AsyncSession = Depends(get_db)):
    return await delete_a_trip(trip_id,db)