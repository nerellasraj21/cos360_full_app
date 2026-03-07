from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_public_db, get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_api, rate_limit_create, rate_limit_dropdown
from app.middleware.tenant_middleware import get_client_name_from_request
from app.models.public.tenant_model import Tenant
from app.schemas.expense.expense_type_schema import (
    ExpenseTypeCreate,
    ExpenseTypeDropdown,
    ExpenseTypeRead,
    ExpenseTypeUpdate,
)
from app.service.expense.expense_type_service import ExpenseTypeService
from app.tools.simple_permissions import (
    check_role_plan_permission_with_error,
    get_current_user_token,
)

router = APIRouter(prefix="/expense/types", tags=["Expense/Expense Types"])


# Create Expense Type
@router.post("/", response_model=ExpenseTypeRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create_expense_type_endpoint(
    request: Request, expense_type_data: ExpenseTypeCreate, db: AsyncSession = Depends(get_tenant_db)
):
    """Create a new expense type. Rate limited to 30 creates per minute. Requires plan validation."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    user_id = UUID(current_user.get("sub"))
    username = current_user.get("username")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "expense_types", "create")

    # Get org_id from tenant
    client_name = get_client_name_from_request(request)
    async for public_db in get_public_db():
        result = await public_db.execute(select(Tenant.id).where(Tenant.client_name == client_name))
        tenant = result.scalar_one_or_none()
        if not tenant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
        org_id = tenant
        break

    service = ExpenseTypeService(db)
    return await service.create_type(expense_type_data, user_id, role, username, org_id)


# Get All Expense Types
@router.get("/", response_model=list[ExpenseTypeRead])
@rate_limit_api("100 per minute")
async def get_all_expense_types_endpoint(
    request: Request,
    category_id: UUID | None = Query(None, description="Filter by category ID"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    active_only: bool = Query(True, description="Filter active types only"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get all expense types with optional category filtering"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "expense_types", "list")

    service = ExpenseTypeService(db)
    return await service.get_types(category_id=category_id, skip=skip, limit=limit, active_only=active_only)


# Get Expense Types for Dropdown
@router.get("/dropdown", response_model=list[ExpenseTypeDropdown])
@rate_limit_dropdown("200 per minute")
async def get_expense_types_dropdown_endpoint(
    request: Request,
    category_id: UUID | None = Query(None, description="Filter by category ID"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get expense types for dropdown selection. Rate limited to 200 per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "expense_types", "read")

    service = ExpenseTypeService(db)
    return await service.get_types_dropdown(category_id=category_id)


# Get Single Expense Type
@router.get("/{type_id}", response_model=ExpenseTypeRead)
@rate_limit_api("100 per minute")
async def get_expense_type_endpoint(request: Request, type_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    """Get a specific expense type by ID"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "expense_types", "read")

    service = ExpenseTypeService(db)
    return await service.get_type(type_id)


# Update Expense Type
@router.put("/{type_id}", response_model=ExpenseTypeRead)
@rate_limit_api("50 per minute")
async def update_expense_type_endpoint(
    request: Request, type_id: UUID, expense_type_data: ExpenseTypeUpdate, db: AsyncSession = Depends(get_tenant_db)
):
    """Update an expense type. Rate limited to 50 updates per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    user_id = UUID(current_user.get("sub"))
    username = current_user.get("username")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "expense_types", "update")

    service = ExpenseTypeService(db)
    return await service.update_type(type_id, expense_type_data, user_id, role, username)


# Delete Expense Type
@router.delete("/{type_id}")
@rate_limit_api("20 per minute")
async def delete_expense_type_endpoint(request: Request, type_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    """Delete an expense type (soft delete). Rate limited to 20 deletes per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    user_id = UUID(current_user.get("sub"))
    username = current_user.get("username")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "expense_types", "delete")

    service = ExpenseTypeService(db)
    return await service.delete_type(type_id, user_id, role, username)
