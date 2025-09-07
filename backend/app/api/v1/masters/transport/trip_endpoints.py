from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.masters.transport import Trip
from app.schemas.masters.transport import TripCreate, TripUpdate, TripOut
from app.db.session import get_db
from app.service.masters.transport import update_partial_details_trip, update_all_details_trip, get_individual_trip_by_id, delete_a_trip, get_trips, add_trip
from app.tools.simple_permissions import check_role_permission, get_current_user_token


router = APIRouter(prefix="/masters/trips", tags=["Masters/Trips"])

@router.post("/", response_model=TripOut, status_code=status.HTTP_201_CREATED)
async def create_trip(data: TripCreate, request: Request, db: AsyncSession = Depends(get_db)):
    """Create trip - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'transport_trips', 'create')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot create transport_trips"
        )
    
    return await add_trip(data,db)
@router.get("/", response_model=list[TripOut])
async def get_all_trips(request: Request, db: AsyncSession = Depends(get_db)):
    """List all trips - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'transport_trips', 'list')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot list transport_trips"
        )
    
    return await get_trips(db)

@router.get("/{trip_id}", response_model=TripOut)
async def get_trip_by_id(trip_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Get trip by ID - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'transport_trips', 'read')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot read transport_trips"
        )
    
    return await get_individual_trip_by_id(trip_id,db)

@router.put("/{trip_id}", response_model=TripOut)
async def update_trip(trip_id: int, data: TripCreate, request: Request, db: AsyncSession = Depends(get_db)):
    """Update trip - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'transport_trips', 'update')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot update transport_trips"
        )
    
    return await update_all_details_trip(trip_id,data,db)

@router.patch("/{trip_id}", response_model=TripOut)
async def patch_trip(trip_id: int, data: TripUpdate, request: Request, db: AsyncSession = Depends(get_db)):
    """Partial update trip - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'transport_trips', 'update')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot update transport_trips"
        )
    
    return await update_partial_details_trip(trip_id,data,db)
@router.delete("/{trip_id}")
async def delete_trip(trip_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Delete trip - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'transport_trips', 'delete')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot delete transport_trips"
        )
    
    return await delete_a_trip(trip_id,db)