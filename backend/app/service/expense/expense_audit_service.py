from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from fastapi import HTTPException, status

from app.models.expense import ExpenseAuditLog
from app.schemas.expense import ExpenseAuditLogRead
from .base_expense_service import BaseExpenseService


class ExpenseAuditService(BaseExpenseService):
    """Service for managing expense audit logs"""

    def __init__(self, db: AsyncSession):
        super().__init__(db)

    async def get_transaction_audit_logs(
        self,
        transaction_id: UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[ExpenseAuditLogRead]:
        """Get audit logs for a specific transaction"""

        query = select(ExpenseAuditLog).where(
            ExpenseAuditLog.transaction_id == transaction_id
        ).order_by(desc(ExpenseAuditLog.created_at))

        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        audit_logs = result.scalars().all()

        return [ExpenseAuditLogRead.model_validate(log) for log in audit_logs]