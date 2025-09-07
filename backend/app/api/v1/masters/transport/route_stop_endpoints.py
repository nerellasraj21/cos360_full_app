from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.masters.transport import RouteStop
from app.schemas.masters.transport import RouteStopCreate, RouteStopUpdate, RouteStopOut
from app.db.session import get_db
from app.service.masters.transport import add_route_stop, update_partial_details_route_stop, update_all_details_route_stop, deactivate_route_stop, get_each_route_stop_by_id, get_route_stops
from app.tools.simple_permissions import check_role_permission, get_current_user_token

router = APIRouter(prefix="/masters/route-stops", tags=["Masters/Route Stops"])
 
@router.post("/", response_model=RouteStopOut)
async def create_route_stop(request: Request, data: RouteStopCreate, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'route_stops', 'create')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot create route_stops"
        )
    
    return await add_route_stop(data,db)

@router.get("/", response_model=list[RouteStopOut])
async def get_all_route_stops(request: Request, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'route_stops', 'list')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot list route_stops"
        )
    
    return await get_route_stops(db)

@router.get("/{stop_id}", response_model=RouteStopOut)
async def get_route_stop_by_id(request: Request, stop_id: int, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'route_stops', 'read')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot read route_stops"
        )
    
    return await get_each_route_stop_by_id(stop_id,db)

@router.put("/{stop_id}", response_model=RouteStopOut)
async def update_route_stop(request: Request, stop_id: int, data: RouteStopCreate, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'route_stops', 'update')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot update route_stops"
        )
    
    return await update_all_details_route_stop(stop_id,data,db)

@router.patch("/{stop_id}", response_model=RouteStopOut)
async def patch_route_stop(request: Request, stop_id: int, data: RouteStopUpdate, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'route_stops', 'update')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot update route_stops"
        )
    
    return await update_partial_details_route_stop(stop_id,data,db)

@router.delete("/{stop_id}")
async def delete_route_stop(request: Request, stop_id: int, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'route_stops', 'delete')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot delete route_stops"
        )
    
    return await deactivate_route_stop(stop_id,db)
