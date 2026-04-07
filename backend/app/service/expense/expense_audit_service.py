from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expense import ExpenseAuditLog
from app.schemas.expense import ExpenseAuditLogRead

from .base_expense_service import BaseExpenseService


class ExpenseAuditService(BaseExpenseService):
    """Service for managing expense audit logs"""

    def __init__(self, db: AsyncSession):
        super().__init__(db)

    async def get_audit_log(self, audit_log_id: UUID) -> ExpenseAuditLogRead:
        """Get a specific audit log by ID"""

        audit_log = await self.check_record_exists(ExpenseAuditLog, audit_log_id, "Audit log not found")

        return ExpenseAuditLogRead.model_validate(audit_log)

    async def get_audit_logs(
        self,
        skip: int = 0,
        limit: int = 100,
        transaction_id: UUID | None = None,
        action: str | None = None,
        action_category: str | None = None,
        actor_user_id: UUID | None = None,
    ) -> list[ExpenseAuditLogRead]:
        """Get all audit logs with optional filtering"""

        query = select(ExpenseAuditLog)

        # Apply filters
        if transaction_id:
            query = query.where(ExpenseAuditLog.transaction_id == transaction_id)

        if action:
            query = query.where(ExpenseAuditLog.action == action)

        if action_category:
            query = query.where(ExpenseAuditLog.action_category == action_category)

        if actor_user_id:
            query = query.where(ExpenseAuditLog.actor_user_id == actor_user_id)

        query = query.order_by(desc(ExpenseAuditLog.created_at))
        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        audit_logs = result.scalars().all()

        return [ExpenseAuditLogRead.model_validate(log) for log in audit_logs]

    async def get_transaction_audit_logs(
        self, transaction_id: UUID, skip: int = 0, limit: int = 100
    ) -> list[ExpenseAuditLogRead]:
        """Get audit logs for a specific transaction"""

        return await self.get_audit_logs(skip=skip, limit=limit, transaction_id=transaction_id)

    async def get_audit_logs_summary(self, transaction_id: UUID) -> dict[str, Any]:
        """Get audit logs summary for a specific transaction"""

        # Get total count
        count_query = select(func.count(ExpenseAuditLog.id)).where(ExpenseAuditLog.transaction_id == transaction_id)
        result = await self.db.execute(count_query)
        total_count = result.scalar()

        # Get action counts
        action_query = (
            select(ExpenseAuditLog.action, func.count(ExpenseAuditLog.id).label("count"))
            .where(ExpenseAuditLog.transaction_id == transaction_id)
            .group_by(ExpenseAuditLog.action)
        )

        result = await self.db.execute(action_query)
        action_counts = {row.action: row.count for row in result}

        # Get latest audit log
        latest_query = (
            select(ExpenseAuditLog)
            .where(ExpenseAuditLog.transaction_id == transaction_id)
            .order_by(desc(ExpenseAuditLog.created_at))
            .limit(1)
        )

        result = await self.db.execute(latest_query)
        latest_log = result.scalar_one_or_none()

        return {
            "transaction_id": transaction_id,
            "total_audit_logs": total_count,
            "action_counts": action_counts,
            "latest_audit_log": ExpenseAuditLogRead.model_validate(latest_log) if latest_log else None,
        }

    async def delete_audit_log(
        self, audit_log_id: UUID, user_id: UUID, user_role: str, user_username: str
    ) -> dict[str, Any]:
        """Delete an audit log (hard delete - only for super admin)"""

        # Only super admin can delete audit logs
        if user_role.lower() not in ["super_admin", "tenant_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can delete audit logs"
            )

        # Get existing audit log
        audit_log = await self.check_record_exists(ExpenseAuditLog, audit_log_id, "Audit log not found")

        # Hard delete the audit log
        await self.db.delete(audit_log)
        await self.db.commit()

        return audit_log
