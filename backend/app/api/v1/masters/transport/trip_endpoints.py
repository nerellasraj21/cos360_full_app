from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.masters.transport import Trip
from app.schemas.masters.transport import TripCreate, TripUpdate, TripOut
from app.db.tenant_session import get_tenant_db
from app.service.masters.transport import update_partial_details_trip, update_all_details_trip, get_individual_trip_by_id, delete_a_trip, get_trips, add_trip
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error
from uuid import UUID

router = APIRouter(prefix="/masters/trips", tags=["Masters/Trips"])

@router.post("/", response_model=TripOut, status_code=status.HTTP_201_CREATED)
async def create_trip(data: TripCreate, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Create trip - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'transport_trips', 'create')
    
    return await add_trip(data,db)
@router.get("/", response_model=list[TripOut])
async def get_all_trips(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """List all trips - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'transport_trips', 'list')
    
    return await get_trips(db)

@router.get("/{trip_id}", response_model=TripOut)
async def get_trip_by_id(trip_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get trip by ID - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'transport_trips', 'read')
    
    return await get_individual_trip_by_id(trip_id,db)

@router.put("/{trip_id}", response_model=TripOut)
async def update_trip(trip_id: UUID, data: TripCreate, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Update trip - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'transport_trips', 'update')
    
    return await update_all_details_trip(trip_id,data,db)

@router.patch("/{trip_id}", response_model=TripOut)
async def patch_trip(trip_id: UUID, data: TripUpdate, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Partial update trip - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'transport_trips', 'update')
    
    return await update_partial_details_trip(trip_id,data,db)
@router.delete("/{trip_id}")
async def delete_trip(trip_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Delete trip - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'transport_trips', 'delete')
    
    return await delete_a_trip(trip_id,db)