from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.masters.transport import Vehicle
from app.schemas.masters.transport import VehicleCreate, VehicleUpdate, VehicleOut
from app.db.session import get_db
from app.service.masters.transport import update_partial_details_vehicle, update_all_details_vehicle, get_individual_vehicle_by_id, deactivate_vehicle, get_vehicles, add_vehicle
from app.tools.simple_permissions import check_role_permission, get_current_user_token


router = APIRouter(prefix="/masters/vehicles", tags=["Masters/Vehicles"])

@router.post("/", response_model=VehicleOut)
async def create_vehicle(request: Request, data: VehicleCreate, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'vehicles', 'create')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot create vehicles"
        )
    
    return await add_vehicle(data,db)

@router.get("/", response_model=list[VehicleOut])
async def get_all_vehicles(request: Request, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'vehicles', 'list')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot list vehicles"
        )
    
    return await get_vehicles(db)

@router.get("/{vehicle_id}", response_model=VehicleOut)
async def get_vehicle_by_id(request: Request, vehicle_id: int, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'vehicles', 'read')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot read vehicles"
        )
    
    return await get_individual_vehicle_by_id(vehicle_id,db)

@router.put("/{vehicle_id}", response_model=VehicleOut)
async def update_vehicle(request: Request, vehicle_id: int, data: VehicleCreate, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'vehicles', 'update')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot update vehicles"
        )
    
    return await update_all_details_vehicle(vehicle_id,data,db)

@router.patch("/{vehicle_id}", response_model=VehicleOut)
async def patch_vehicle(request: Request, vehicle_id: int, data: VehicleUpdate, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'vehicles', 'update')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot update vehicles"
        )
    
    return await update_partial_details_vehicle(vehicle_id,data,db)

@router.delete("/{vehicle_id}")
async def delete_vehicle(request: Request, vehicle_id: int, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'vehicles', 'delete')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot delete vehicles"
        )
    
    return await deactivate_vehicle(vehicle_id,db)
