from fastapi import HTTPException, status, APIRouter, Depends, Query, Request
from app.schemas.expense.expense_audit_log_schema import ExpenseAuditLogRead
from app.db.tenant_session import get_tenant_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.service.expense.expense_audit_service import ExpenseAuditService
from app.middleware.rate_limit_middleware import rate_limit_api
from app.tools.simple_permissions import get_current_user_token, check_role_plan_permission_with_error
from typing import List
from uuid import UUID

router = APIRouter(prefix="/expense/audit", tags=["Expense/Audit Trail"])

# Get Transaction Audit Logs
@router.get("/transactions/{transaction_id}/logs", response_model=List[ExpenseAuditLogRead])
@rate_limit_api("100 per minute")
async def get_transaction_audit_logs_endpoint(
    request: Request,
    transaction_id: UUID,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=500, description="Number of records to return"),
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get audit trail for a specific expense transaction"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'expense_audit_logs', 'read')

    service = ExpenseAuditService(db)
    return await service.get_transaction_audit_logs(transaction_id, skip=skip, limit=limit)

# Get Audit Summary
@router.get("/transactions/{transaction_id}/summary")
@rate_limit_api("50 per minute")
async def get_audit_summary_endpoint(
    request: Request,
    transaction_id: UUID,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get audit trail summary for a transaction"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'expense_audit_logs', 'read')

    service = ExpenseAuditService(db)
    logs = await service.get_transaction_audit_logs(transaction_id, skip=0, limit=1000)

    # Build summary
    action_counts = {}
    for log in logs:
        action_counts[log.action] = action_counts.get(log.action, 0) + 1

    return {
        "transaction_id": transaction_id,
        "total_entries": len(logs),
        "action_breakdown": action_counts,
        "first_entry": logs[-1].created_at if logs else None,
        "last_entry": logs[0].created_at if logs else None,
        "unique_actors": len(set(log.actor_username for log in logs))
    }