from fastapi import HTTPException, status, APIRouter, Depends, Query, Request
from app.schemas.expense.expense_transaction_schema import (
    ExpenseTransactionCreate,
    ExpenseTransactionRead,
    ExpenseTransactionUpdate,
    ExpenseTransactionApproval
)
from app.db.tenant_session import get_tenant_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.service.expense.expense_transaction_service import ExpenseTransactionService
from app.middleware.rate_limit_middleware import rate_limit_dropdown, rate_limit_api, rate_limit_create
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error
from app.middleware.tenant_middleware import get_client_name_from_request
from app.db.tenant_session import get_public_db
from app.models.public.tenant_model import Tenant
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID

router = APIRouter(prefix="/expense/transactions", tags=["Expense/Expense Transactions"])

# Create Expense Transaction
@router.post("/", response_model=ExpenseTransactionRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("50 per minute")
async def create_expense_transaction_endpoint(
    request: Request,
    transaction_data: ExpenseTransactionCreate,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Create a new expense transaction. Rate limited to 50 creates per minute. Requires plan validation."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    user_id = UUID(current_user.get('sub'))
    username = current_user.get('username')
    user_department_id = current_user.get('department_id')  # Get user's department if available

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'expense_transactions', 'create')

    # Get org_id from tenant
    client_name = get_client_name_from_request(request)
    async for public_db in get_public_db():
        result = await public_db.execute(
            select(Tenant.id).where(Tenant.client_name == client_name)
        )
        tenant = result.scalar_one_or_none()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        org_id = tenant
        break

    service = ExpenseTransactionService(db)
    return await service.create_transaction(
        transaction_data, user_id, role, username, org_id,
        user_department_id=UUID(user_department_id) if user_department_id else None
    )

# Get All Expense Transactions
@router.get("/", response_model=List[ExpenseTransactionRead])
@rate_limit_api("100 per minute")
async def get_all_expense_transactions_endpoint(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    status_filter: Optional[str] = Query(None, description="Filter by transaction status"),
    expense_type_id: Optional[UUID] = Query(None, description="Filter by expense type ID"),
    department_id: Optional[UUID] = Query(None, description="Filter by department ID"),
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get all expense transactions with filtering and pagination"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    user_department_id = current_user.get('department_id')

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'expense_transactions', 'list')

    service = ExpenseTransactionService(db)
    return await service.get_transactions(
        skip=skip,
        limit=limit,
        status_filter=status_filter,
        expense_type_id=expense_type_id
    )

# Get Single Expense Transaction
@router.get("/{transaction_id}", response_model=ExpenseTransactionRead)
@rate_limit_api("200 per minute")
async def get_expense_transaction_endpoint(
    request: Request,
    transaction_id: UUID,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get a specific expense transaction by ID with full details"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    user_department_id = current_user.get('department_id')

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'expense_transactions', 'read')

    service = ExpenseTransactionService(db)
    return await service.get_transaction(transaction_id)

# Update Expense Transaction
@router.put("/{transaction_id}", response_model=ExpenseTransactionRead)
@rate_limit_api("30 per minute")
async def update_expense_transaction_endpoint(
    request: Request,
    transaction_id: UUID,
    transaction_data: ExpenseTransactionUpdate,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Update an expense transaction. Rate limited to 30 updates per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    user_id = UUID(current_user.get('sub'))
    username = current_user.get('username')
    user_department_id = current_user.get('department_id')

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'expense_transactions', 'update')

    service = ExpenseTransactionService(db)
    return await service.update_transaction(
        transaction_id, transaction_data, user_id, role, username
    )

# Approve/Reject Expense Transaction
@router.post("/{transaction_id}/approval", response_model=ExpenseTransactionRead)
@rate_limit_api("20 per minute")
async def approve_expense_transaction_endpoint(
    request: Request,
    transaction_id: UUID,
    approval_data: ExpenseTransactionApproval,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Approve or reject an expense transaction. Rate limited to 20 approvals per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    user_id = UUID(current_user.get('sub'))
    username = current_user.get('username')
    user_department_id = current_user.get('department_id')

    # Multi-layer permission check: Role + Plan validation for approval action
    await check_role_plan_permission_with_error(db, request, role, 'expense_transactions', 'approve')

    service = ExpenseTransactionService(db)
    return await service.approve_transaction(
        transaction_id, approval_data, user_id, role, username
    )

# Get Transactions Pending Approval
@router.get("/pending/approval", response_model=List[ExpenseTransactionRead])
@rate_limit_api("50 per minute")
async def get_pending_approval_transactions_endpoint(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=500, description="Number of records to return"),
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get transactions pending approval. Rate limited to 50 requests per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    user_department_id = current_user.get('department_id')

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'expense_transactions', 'list')

    service = ExpenseTransactionService(db)
    return await service.get_pending_approval_transactions()