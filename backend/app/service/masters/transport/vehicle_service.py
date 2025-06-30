from sqlalchemy import select
from app.models.masters.transport import Vehicle
from app.schemas.masters.transport import VehicleCreate, VehicleUpdate
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

async def add_vehicle(data: VehicleCreate, db: AsyncSession):
    vehicle = Vehicle(**data.dict())
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle

async def get_vehicles(db: AsyncSession):
    result = await db.execute(select(Vehicle).where(Vehicle.is_active == True))
    return result.scalars().all()

async def get_individual_vehicle_by_id(vehicle_id: int, db: AsyncSession):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(404, detail="Vehicle not found")
    return vehicle

async def update_all_details_vehicle(vehicle_id: int, data: VehicleCreate, db: AsyncSession):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(404, detail="Vehicle not found")
    for key, value in data.dict().items():
        setattr(vehicle, key, value)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle

async def update_partial_details_vehicle(vehicle_id: int, data: VehicleUpdate, db: AsyncSession):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(404, detail="Vehicle not found")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(vehicle, key, value)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle

async def deactivate_vehicle(vehicle_id: int, db: AsyncSession):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(404, detail="Vehicle not found")
    vehicle.is_active = False
    await db.commit()
    return {"message": "Vehicle soft deleted"}
