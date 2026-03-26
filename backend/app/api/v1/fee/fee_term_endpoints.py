from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.schemas.fee.fee_term_schema import FeeTermCreate, FeeTermDropdown, FeeTermRead, FeeTermUpdate
from app.service.fee.fee_term_service import (
    create_fee_term_with_dates,
    delete_fee_term_date,
    delete_fee_term_with_dates,
    get_all_fee_terms,
    get_fee_term_dates_only,
    get_fee_term_with_dates,
    get_fee_terms_dropdown,
    update_fee_term_with_dates,
)
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/fee/terms", tags=["Fee/Fee Terms & Dates"])


@router.get("/health", status_code=status.HTTP_200_OK)
async def term_health_check():
    """Health check for fee term endpoints"""
    return {"status": "healthy", "module": "fee_terms", "timestamp": datetime.now()}


# Create Fee Term with Dates
@router.post("/", response_model=FeeTermRead, status_code=status.HTTP_201_CREATED)
async def create_fee_term(request: Request, fee_term_data: FeeTermCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Create a new fee term with associated dates"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "fee_terms", "create")

    return await create_fee_term_with_dates(db, fee_term_data)


# Get All Fee Terms
@router.get("/", response_model=list[FeeTermRead])
async def get_all_fee_terms_endpoint(
    request: Request,
    limit: int = Query(50, ge=1, le=500, description="Number of records to return (1-500)"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get all fee terms with their associated dates and pagination"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "fee_terms", "list")

    return await get_all_fee_terms(db, limit, offset)


# Get Fee Terms Dropdown
@router.get("/dropdown", response_model=list[FeeTermDropdown])
async def get_fee_terms_dropdown_endpoint(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get fee terms dropdown (id, name, number of terms only)"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "fee_terms", "list")

    return await get_fee_terms_dropdown(db)


# Get Fee Term Dates Only
@router.get("/{fee_term_id}/dates")
async def get_fee_term_dates_endpoint(request: Request, fee_term_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    """Get only the dates for a specific fee term"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "fee_terms", "read")

    return await get_fee_term_dates_only(db, fee_term_id)


# Get Single Fee Term with Dates
@router.get("/{fee_term_id}", response_model=FeeTermRead)
async def get_fee_term_endpoint(request: Request, fee_term_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    """Get a specific fee term with its associated dates"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "fee_terms", "read")

    return await get_fee_term_with_dates(db, fee_term_id)


# Update Fee Term with Dates
@router.put("/{fee_term_id}", response_model=FeeTermRead)
async def update_fee_term_endpoint(
    request: Request, fee_term_id: UUID, fee_term_data: FeeTermUpdate, db: AsyncSession = Depends(get_tenant_db)
):
    """Update a fee term and its associated dates"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "fee_terms", "update")

    return await update_fee_term_with_dates(db, fee_term_id, fee_term_data)


# Delete Fee Term with Dates
@router.delete("/{fee_term_id}", response_model=FeeTermRead, status_code=status.HTTP_200_OK)
async def delete_fee_term_endpoint(request: Request, fee_term_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    """Delete a fee term and all its associated dates"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "fee_terms", "delete")

    return await delete_fee_term_with_dates(db, fee_term_id)


# Delete Fee Term Date
@router.delete("/dates/{fee_term_date_id}", status_code=status.HTTP_200_OK)
async def delete_fee_term_date_endpoint(
    request: Request, fee_term_date_id: UUID, db: AsyncSession = Depends(get_tenant_db)
):
    """Delete a specific fee term date"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "fee_terms", "delete")

    return await delete_fee_term_date(db, fee_term_date_id)
