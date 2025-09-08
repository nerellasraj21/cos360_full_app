from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.masters.transport import Vehicle
from app.schemas.masters.transport import VehicleCreate, VehicleUpdate, VehicleOut
from app.db.tenant_session import get_tenant_db
from app.service.masters.transport import update_partial_details_vehicle, update_all_details_vehicle, get_individual_vehicle_by_id, deactivate_vehicle, get_vehicles, add_vehicle
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error
from uuid import UUID

router = APIRouter(prefix="/masters/vehicles", tags=["Masters/Vehicles"])

@router.post("/", response_model=VehicleOut)
async def create_vehicle(request: Request, data: VehicleCreate, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'vehicles', 'create')
    
    return await add_vehicle(data,db)

@router.get("/", response_model=list[VehicleOut])
async def get_all_vehicles(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'vehicles', 'list')
    
    return await get_vehicles(db)

@router.get("/{vehicle_id}", response_model=VehicleOut)
async def get_vehicle_by_id(request: Request, vehicle_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'vehicles', 'read')
    
    return await get_individual_vehicle_by_id(vehicle_id,db)

@router.put("/{vehicle_id}", response_model=VehicleOut)
async def update_vehicle(request: Request, vehicle_id: UUID, data: VehicleCreate, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'vehicles', 'update')
    
    return await update_all_details_vehicle(vehicle_id,data,db)

@router.patch("/{vehicle_id}", response_model=VehicleOut)
async def patch_vehicle(request: Request, vehicle_id: UUID, data: VehicleUpdate, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'vehicles', 'update')
    
    return await update_partial_details_vehicle(vehicle_id,data,db)

@router.delete("/{vehicle_id}")
async def delete_vehicle(request: Request, vehicle_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'vehicles', 'delete')
    
    return await deactivate_vehicle(vehicle_id,db)
