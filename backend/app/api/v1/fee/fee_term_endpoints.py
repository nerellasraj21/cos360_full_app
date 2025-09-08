from fastapi import HTTPException, status, APIRouter, Depends, Request
from app.schemas.fee.fee_term_schema import FeeTermCreate, FeeTermRead, FeeTermUpdate
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.service.fee.fee_term_service import (
    create_fee_term_with_dates, 
    get_fee_term_with_dates, 
    get_all_fee_terms, 
    update_fee_term_with_dates, 
    delete_fee_term_with_dates,
    delete_fee_term_date
)
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error
from typing import List
from uuid import UUID

router = APIRouter(prefix="/fee/terms", tags=["Fee/Fee Terms & Dates"])

# Create Fee Term with Dates
@router.post("/", response_model=FeeTermRead, status_code=status.HTTP_201_CREATED)
async def create_fee_term(request: Request, 

    fee_term_data: FeeTermCreate, 
    db: AsyncSession = Depends(get_db)
):
    """Create a new fee term with associated dates"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_terms', 'create')
    
    return await create_fee_term_with_dates(db, fee_term_data)

# Get All Fee Terms
@router.get("/", response_model=List[FeeTermRead])
async def get_all_fee_terms_endpoint(request: Request, 

    db: AsyncSession = Depends(get_db)
):
    """Get all fee terms with their associated dates"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_terms', 'list')
    
    return await get_all_fee_terms(db)

# Get Single Fee Term with Dates
@router.get("/{fee_term_id}", response_model=FeeTermRead)
async def get_fee_term_endpoint(request: Request, 

    fee_term_id: UUID, 
    db: AsyncSession = Depends(get_db)
):
    """Get a specific fee term with its associated dates"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_terms', 'read')
    
    return await get_fee_term_with_dates(db, fee_term_id)

# Update Fee Term with Dates
@router.put("/{fee_term_id}", response_model=FeeTermRead)
async def update_fee_term_endpoint(request: Request, 

    fee_term_id: UUID, 
    fee_term_data: FeeTermUpdate, 
    db: AsyncSession = Depends(get_db)
):
    """Update a fee term and its associated dates"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_terms', 'update')
    
    return await update_fee_term_with_dates(db, fee_term_id, fee_term_data)

# Delete Fee Term with Dates
@router.delete("/{fee_term_id}")
async def delete_fee_term_endpoint(request: Request, 

    fee_term_id: UUID, 
    db: AsyncSession = Depends(get_db)
):
    """Delete a fee term and all its associated dates"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_terms', 'delete')
    
    return await delete_fee_term_with_dates(db, fee_term_id)

# Delete Fee Term Date
@router.delete("/dates/{fee_term_date_id}")
async def delete_fee_term_date_endpoint(request: Request, 

    fee_term_date_id: UUID, 
    db: AsyncSession = Depends(get_db)
):
    """Delete a specific fee term date"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'fee_terms', 'delete')
    
    return await delete_fee_term_date(db, fee_term_date_id)