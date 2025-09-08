from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.masters.transport import RouteStop
from app.schemas.masters.transport import RouteStopCreate, RouteStopUpdate, RouteStopOut
from app.db.tenant_session import get_tenant_db
from app.service.masters.transport import add_route_stop, update_partial_details_route_stop, update_all_details_route_stop, deactivate_route_stop, get_each_route_stop_by_id, get_route_stops
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error
from uuid import UUID
router = APIRouter(prefix="/masters/route-stops", tags=["Masters/Route Stops"])
 
@router.post("/", response_model=RouteStopOut)
async def create_route_stop(request: Request, data: RouteStopCreate, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'route_stops', 'create')
    
    return await add_route_stop(data,db)

@router.get("/", response_model=list[RouteStopOut])
async def get_all_route_stops(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'route_stops', 'list')
    
    return await get_route_stops(db)

@router.get("/{stop_id}", response_model=RouteStopOut)
async def get_route_stop_by_id(request: Request, stop_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'route_stops', 'read')
    
    return await get_each_route_stop_by_id(stop_id,db)

@router.put("/{stop_id}", response_model=RouteStopOut)
async def update_route_stop(request: Request, stop_id: UUID, data: RouteStopCreate, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'route_stops', 'update')
    
    return await update_all_details_route_stop(stop_id,data,db)

@router.patch("/{stop_id}", response_model=RouteStopOut)
async def patch_route_stop(request: Request, stop_id: UUID, data: RouteStopUpdate, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'route_stops', 'update')
    
    return await update_partial_details_route_stop(stop_id,data,db)

@router.delete("/{stop_id}")
async def delete_route_stop(request: Request, stop_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'route_stops', 'delete')
    
    return await deactivate_route_stop(stop_id,db)
