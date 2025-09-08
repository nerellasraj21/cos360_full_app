from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.models.masters.transport import Route
from app.schemas.masters.transport import RouteCreate, RouteUpdate, RouteOut, RouteDropdown
from app.schemas.masters.transport import RouteStopOut
from app.db.session import get_db
from sqlalchemy import update, delete
from app.service.masters.transport import add_route, get_all_routes, get_each_route_by_id, deactivate_route, update__all_details_route, update_partial_details_route
from app.service.masters.transport.routes_service import get_stops_by_route_name, get_routes_dropdown
from app.middleware.rate_limit_middleware import rate_limit_dropdown, rate_limit_create
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error
from uuid import UUID

router = APIRouter(prefix="/masters/routes", tags=["Masters/Routes"])

@router.post("/", response_model=RouteOut)
@rate_limit_create("30 per minute")
async def create_route(request: Request, data: RouteCreate, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'routes', 'create')
    
    return await add_route(data,db)

@router.get("/all_routes", response_model=list[RouteOut])
async def get_routes(request: Request, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'routes', 'list')
    
    return await get_all_routes(db)

@router.get("/routeid/{route_id}", response_model=RouteOut)
async def get_route_by_id(request: Request, route_id: UUID, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'routes', 'read')
    
    return await get_each_route_by_id(route_id,db)

@router.put("/{route_id}", response_model=RouteOut)
async def update_route(request: Request, route_id: UUID, data: RouteCreate, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'routes', 'update')
    
    return await update__all_details_route(route_id,data,db)

@router.patch("/{route_id}", response_model=RouteOut)
async def patch_route(request: Request, route_id: UUID, data: RouteUpdate, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'routes', 'update')
    
    return await update_partial_details_route(route_id,data,db)

@router.delete("/{route_id}")
async def delete_route(request: Request, route_id: UUID, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'routes', 'delete')
    
    return await deactivate_route(route_id,db)

@router.get("/dropdown", response_model=List[RouteDropdown])
@rate_limit_dropdown("100 per minute")
async def get_routes_dropdown_endpoint(request: Request, active_only: bool = True, db: AsyncSession = Depends(get_db)):
    """Get routes for dropdown (id + route_name only). Rate limited to 100 requests per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'routes', 'list')
    
    return await get_routes_dropdown(db, active_only)

@router.get("/stops-by-route", response_model=List[RouteStopOut])
async def fetch_stops_by_route_name(request: Request, route_name: str = Query(...), db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'routes', 'read')
    
    return await get_stops_by_route_name(route_name, db)