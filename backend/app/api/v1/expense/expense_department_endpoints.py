from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.expense.expense_category_endpoints import get_current_tenant_org_id
from app.db.tenant_session import get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_api, rate_limit_create, rate_limit_dropdown
from app.schemas.expense.expense_department_schema import (
    ExpenseDepartmentCreate,
    ExpenseDepartmentDropdown,
    ExpenseDepartmentRead,
    ExpenseDepartmentUpdate,
)
from app.service.expense.expense_department_service import ExpenseDepartmentService
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/expense/departments", tags=["Expense/Expense Departments"])


@router.post("/", response_model=ExpenseDepartmentRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create_expense_department_endpoint(
    request: Request, department_data: ExpenseDepartmentCreate, db: AsyncSession = Depends(get_tenant_db)
):
    """Create a new expense department"""
    current_user = await get_current_user_token(request)
    await check_role_plan_permission_with_error(db, request, current_user.get("role"), "expense_departments", "create")

    org_id = await get_current_tenant_org_id(request)
    return await ExpenseDepartmentService(db).create_department(department_data, org_id)


@router.get("/", response_model=list[ExpenseDepartmentRead])
@rate_limit_api("100 per minute")
async def get_expense_departments_endpoint(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    active_only: bool = Query(True, description="Filter active departments only"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """List expense departments"""
    current_user = await get_current_user_token(request)
    await check_role_plan_permission_with_error(db, request, current_user.get("role"), "expense_departments", "list")

    return await ExpenseDepartmentService(db).get_departments(skip=skip, limit=limit, active_only=active_only)


@router.get("/dropdown", response_model=list[ExpenseDepartmentDropdown])
@rate_limit_dropdown("200 per minute")
async def get_expense_departments_dropdown_endpoint(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Active expense departments for dropdown selection"""
    current_user = await get_current_user_token(request)
    await check_role_plan_permission_with_error(db, request, current_user.get("role"), "expense_departments", "read")

    return await ExpenseDepartmentService(db).get_departments_dropdown()


@router.get("/{department_id}", response_model=ExpenseDepartmentRead)
@rate_limit_api("100 per minute")
async def get_expense_department_endpoint(
    request: Request, department_id: UUID, db: AsyncSession = Depends(get_tenant_db)
):
    """Get an expense department by ID"""
    current_user = await get_current_user_token(request)
    await check_role_plan_permission_with_error(db, request, current_user.get("role"), "expense_departments", "read")

    return await ExpenseDepartmentService(db).get_department(department_id)


@router.put("/{department_id}", response_model=ExpenseDepartmentRead)
@rate_limit_api("50 per minute")
async def update_expense_department_endpoint(
    request: Request,
    department_id: UUID,
    department_data: ExpenseDepartmentUpdate,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Update an expense department"""
    current_user = await get_current_user_token(request)
    await check_role_plan_permission_with_error(db, request, current_user.get("role"), "expense_departments", "update")

    return await ExpenseDepartmentService(db).update_department(department_id, department_data)


@router.delete("/{department_id}", response_model=ExpenseDepartmentRead)
@rate_limit_api("20 per minute")
async def delete_expense_department_endpoint(
    request: Request, department_id: UUID, db: AsyncSession = Depends(get_tenant_db)
):
    """Deactivate an expense department (soft delete)"""
    current_user = await get_current_user_token(request)
    await check_role_plan_permission_with_error(db, request, current_user.get("role"), "expense_departments", "delete")

    return await ExpenseDepartmentService(db).delete_department(department_id)
