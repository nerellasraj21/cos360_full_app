from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db, get_tenant_id_from_request
from app.middleware.rate_limit_middleware import rate_limit_api, rate_limit_create, rate_limit_dropdown
from app.schemas.expense.expense_category_schema import (
    ExpenseCategoryCreate,
    ExpenseCategoryDropdown,
    ExpenseCategoryRead,
    ExpenseCategoryUpdate,
)
from app.service.expense.expense_category_service import ExpenseCategoryService
from app.tools.simple_permissions import (
    check_role_plan_permission_with_error,
    get_current_user_token,
)

router = APIRouter(prefix="/expense/categories", tags=["Expense/Expense Categories"])


async def get_current_tenant_org_id(request: Request) -> UUID:
    """The current tenant id, stored as org_id on expense rows"""
    return UUID(get_tenant_id_from_request(request))


# Create Expense Category
@router.post("/", response_model=ExpenseCategoryRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create_expense_category_endpoint(
    request: Request, expense_category_data: ExpenseCategoryCreate, db: AsyncSession = Depends(get_tenant_db)
):
    """Create a new expense category. Rate limited to 30 creates per minute. Requires plan validation."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    user_id = UUID(current_user.get("sub"))
    username = current_user.get("username")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "expense_categories", "create")

    # Get the current tenant's org_id
    org_id = await get_current_tenant_org_id(request)

    service = ExpenseCategoryService(db)
    return await service.create_category(expense_category_data, user_id, role, username, org_id)


# Get All Expense Categories
@router.get("/", response_model=list[ExpenseCategoryRead])
@rate_limit_api("100 per minute")
async def get_all_expense_categories_endpoint(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    active_only: bool = Query(True, description="Filter active categories only"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get all expense categories with pagination"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "expense_categories", "list")

    service = ExpenseCategoryService(db)
    return await service.get_categories(skip=skip, limit=limit, active_only=active_only)


# Get Expense Categories for Dropdown
@router.get("/dropdown", response_model=list[ExpenseCategoryDropdown])
@rate_limit_dropdown("200 per minute")
async def get_expense_categories_dropdown_endpoint(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get expense categories for dropdown selection. Rate limited to 200 per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "expense_categories", "read")

    service = ExpenseCategoryService(db)
    return await service.get_categories_dropdown()


# Get Single Expense Category
@router.get("/{category_id}", response_model=ExpenseCategoryRead)
@rate_limit_api("100 per minute")
async def get_expense_category_endpoint(request: Request, category_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    """Get a specific expense category by ID"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "expense_categories", "read")

    service = ExpenseCategoryService(db)
    return await service.get_category(category_id)


# Update Expense Category
@router.put("/{category_id}", response_model=ExpenseCategoryRead)
@rate_limit_api("50 per minute")
async def update_expense_category_endpoint(
    request: Request,
    category_id: UUID,
    expense_category_data: ExpenseCategoryUpdate,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Update an expense category. Rate limited to 50 updates per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    user_id = UUID(current_user.get("sub"))
    username = current_user.get("username")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "expense_categories", "update")

    service = ExpenseCategoryService(db)
    return await service.update_category(category_id, expense_category_data, user_id, role, username)


# Delete Expense Category
@router.delete("/{category_id}", response_model=ExpenseCategoryRead, status_code=status.HTTP_200_OK)
@rate_limit_api("20 per minute")
async def delete_expense_category_endpoint(
    request: Request, category_id: UUID, db: AsyncSession = Depends(get_tenant_db)
):
    """Delete an expense category (soft delete). Rate limited to 20 deletes per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    user_id = UUID(current_user.get("sub"))
    username = current_user.get("username")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "expense_categories", "delete")

    service = ExpenseCategoryService(db)
    return await service.delete_category(category_id, user_id, role, username)
