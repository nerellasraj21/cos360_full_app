from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_api
from app.schemas.expense.expense_audit_log_schema import ExpenseAuditLogRead
from app.service.expense.expense_audit_service import ExpenseAuditService
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/expense/audit", tags=["Expense/Audit Trail"])


# Get Transaction Audit Logs
@router.get("/transactions/{transaction_id}/logs", response_model=list[ExpenseAuditLogRead])
@rate_limit_api("100 per minute")
async def get_transaction_audit_logs_endpoint(
    request: Request,
    transaction_id: UUID,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=500, description="Number of records to return"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get audit trail for a specific expense transaction"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, "expense_audit_logs", "read")

    service = ExpenseAuditService(db)
    return await service.get_transaction_audit_logs(transaction_id, skip=skip, limit=limit)


# Get Audit Summary
@router.get("/transactions/{transaction_id}/summary")
@rate_limit_api("50 per minute")
async def get_audit_summary_endpoint(request: Request, transaction_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    """Get audit trail summary for a transaction"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, "expense_audit_logs", "read")

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
        "unique_actors": len({log.actor_username for log in logs}),
    }


# Get All Audit Logs
@router.get("/logs", response_model=list[ExpenseAuditLogRead])
@rate_limit_api("100 per minute")
async def get_all_audit_logs_endpoint(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=500, description="Number of records to return"),
    transaction_id: UUID | None = Query(None, description="Filter by transaction ID"),
    action: str | None = Query(None, description="Filter by action"),
    action_category: str | None = Query(None, description="Filter by action category"),
    actor_user_id: UUID | None = Query(None, description="Filter by actor user ID"),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get all audit logs with optional filtering"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, "expense_audit_logs", "read")

    service = ExpenseAuditService(db)
    return await service.get_audit_logs(
        skip=skip,
        limit=limit,
        transaction_id=transaction_id,
        action=action,
        action_category=action_category,
        actor_user_id=actor_user_id,
    )


# Get Specific Audit Log
@router.get("/logs/{audit_log_id}", response_model=ExpenseAuditLogRead)
@rate_limit_api("100 per minute")
async def get_audit_log_endpoint(request: Request, audit_log_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    """Get a specific audit log by ID"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, "expense_audit_logs", "read")

    service = ExpenseAuditService(db)
    return await service.get_audit_log(audit_log_id)


# Get Audit Logs Summary (Enhanced)
@router.get("/transactions/{transaction_id}/summary")
@rate_limit_api("50 per minute")
async def get_audit_logs_summary_endpoint(
    request: Request, transaction_id: UUID, db: AsyncSession = Depends(get_tenant_db)
):
    """Get comprehensive audit logs summary for a transaction"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, "expense_audit_logs", "read")

    service = ExpenseAuditService(db)
    return await service.get_audit_logs_summary(transaction_id)


# Delete Audit Log
@router.delete("/logs/{audit_log_id}", response_model=ExpenseAuditLogRead, status_code=status.HTTP_200_OK)
@rate_limit_api("10 per minute")
async def delete_audit_log_endpoint(request: Request, audit_log_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    """Delete an audit log (hard delete - admin only)"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    user_id = UUID(current_user.get("sub"))
    username = current_user.get("username")

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, "expense_audit_logs", "delete")

    service = ExpenseAuditService(db)
    return await service.delete_audit_log(audit_log_id, user_id, role, username)
