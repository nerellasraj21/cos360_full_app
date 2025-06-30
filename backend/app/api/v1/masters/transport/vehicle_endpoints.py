from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.masters.transport import Vehicle
from app.schemas.masters.transport import VehicleCreate, VehicleUpdate, VehicleOut
from app.db.session import get_db
from app.service.masters.transport import update_partial_details_vehicle, update_all_details_vehicle, get_individual_vehicle_by_id, deactivate_vehicle, get_vehicles, add_vehicle


router = APIRouter(prefix="/vehicles", tags=["Vehicles"])

@router.post("/", response_model=VehicleOut)
async def create_vehicle(data: VehicleCreate, db: AsyncSession = Depends(get_db)):
    return await add_vehicle(data,db)

@router.get("/", response_model=list[VehicleOut])
async def get_all_vehicles(db: AsyncSession = Depends(get_db)):
    return await get_vehicles(db)

@router.get("/{vehicle_id}", response_model=VehicleOut)
async def get_vehicle_by_id(vehicle_id: int, db: AsyncSession = Depends(get_db)):
    return await get_individual_vehicle_by_id(vehicle_id,db)

@router.put("/{vehicle_id}", response_model=VehicleOut)
async def update_vehicle(vehicle_id: int, data: VehicleCreate, db: AsyncSession = Depends(get_db)):
    return await update_all_details_vehicle(vehicle_id,data,db)

@router.patch("/{vehicle_id}", response_model=VehicleOut)
async def patch_vehicle(vehicle_id: int, data: VehicleUpdate, db: AsyncSession = Depends(get_db)):
    return await update_partial_details_vehicle(vehicle_id,data,db)

@router.delete("/{vehicle_id}")
async def delete_vehicle(vehicle_id: int, db: AsyncSession = Depends(get_db)):
    return await deactivate_vehicle(vehicle_id,db)
