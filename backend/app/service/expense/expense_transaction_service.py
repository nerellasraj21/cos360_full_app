from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.expense import (
    ExpenseTransaction,
    ExpenseType,
)
from app.schemas.expense import (
    ExpenseTransactionApproval,
    ExpenseTransactionCreate,
    ExpenseTransactionRead,
    ExpenseTransactionUpdate,
)

from .base_expense_service import BaseExpenseService


class ExpenseTransactionService(BaseExpenseService):
    """Service for managing expense transactions"""

    def __init__(self, db: AsyncSession):
        super().__init__(db)

    async def create_transaction(
        self,
        transaction_data: ExpenseTransactionCreate,
        user_id: UUID,
        user_role: str,
        user_username: str,
        org_id: UUID,
        user_department_id: UUID | None = None,
    ) -> ExpenseTransactionRead:
        """Create a new expense transaction"""

        # Validate expense type exists and is active
        expense_type = await self.check_record_exists(
            ExpenseType, transaction_data.expense_type_id, "Expense type not found"
        )

        if not expense_type.is_active:
            raise self.build_error_response(
                "INACTIVE_EXPENSE_TYPE", "Cannot create transaction for inactive expense type"
            )

        # Check for duplicate idempotency key
        existing_transaction = await self.db.execute(
            select(ExpenseTransaction).where(ExpenseTransaction.idempotency_key == transaction_data.idempotency_key)
        )
        if existing_transaction.scalar_one_or_none():
            raise self.build_error_response(
                "DUPLICATE_IDEMPOTENCY_KEY", "Transaction with this idempotency key already exists"
            )

        # Determine if approval is required
        requires_approval = (
            transaction_data.requires_approval_override
            or transaction_data.amount > Decimal("1000.00")
            or transaction_data.payment_method.lower() in ["check", "wire_transfer"]
        )

        # Create the transaction
        transaction_dict = transaction_data.model_dump(exclude={"requires_approval_override"})
        transaction_dict.update(
            {
                "org_id": org_id,
                "requires_approval": requires_approval,
                "requires_approval_override": transaction_data.requires_approval_override,
                "status": "pending",
                "created_by_user_id": user_id,
                "created_by_role": user_role,
            }
        )

        db_transaction = ExpenseTransaction(**transaction_dict)
        self.db.add(db_transaction)
        await self.db.flush()

        # Get the created transaction with relationships
        result = await self.db.execute(
            select(ExpenseTransaction)
            .options(
                selectinload(ExpenseTransaction.expense_type).selectinload(ExpenseType.category),
                selectinload(ExpenseTransaction.transaction_items),
                selectinload(ExpenseTransaction.attachments),
                selectinload(ExpenseTransaction.audit_logs),
            )
            .where(ExpenseTransaction.id == db_transaction.id)
        )
        transaction_out = result.scalar_one()

        # Commit the main record
        await self.db.commit()

        # TODO: Temporarily disabled audit log creation for debugging
        # await self.create_audit_log(
        #     transaction_id=db_transaction.id,
        #     action="create",
        #     action_category="transaction",
        #     actor_user_id=user_id,
        #     actor_role=user_role,
        #     actor_username=user_username,
        #     org_id=org_id,
        #     full_record_after=self.prepare_record_snapshot(transaction_out),
        #     action_reason="Transaction created"
        # )

        return ExpenseTransactionRead.model_validate(transaction_out)

    async def get_transaction(self, transaction_id: UUID) -> ExpenseTransactionRead:
        """Get a specific expense transaction"""

        query = (
            select(ExpenseTransaction)
            .options(
                selectinload(ExpenseTransaction.expense_type).selectinload(ExpenseType.category),
                selectinload(ExpenseTransaction.transaction_items),
                selectinload(ExpenseTransaction.attachments),
                selectinload(ExpenseTransaction.audit_logs),
            )
            .where(ExpenseTransaction.id == transaction_id)
        )

        result = await self.db.execute(query)
        transaction = result.scalar_one_or_none()

        if not transaction:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense transaction not found")

        return ExpenseTransactionRead.model_validate(transaction)

    async def get_transactions(
        self,
        skip: int = 0,
        limit: int = 100,
        status_filter: str | None = None,
        expense_type_id: UUID | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> list[ExpenseTransactionRead]:
        """Get expense transactions with filtering"""

        query = select(ExpenseTransaction)

        if status_filter:
            query = query.where(ExpenseTransaction.status == status_filter)

        if expense_type_id:
            query = query.where(ExpenseTransaction.expense_type_id == expense_type_id)

        if date_from:
            query = query.where(ExpenseTransaction.transaction_date >= date_from)

        if date_to:
            query = query.where(ExpenseTransaction.transaction_date <= date_to)

        query = query.order_by(desc(ExpenseTransaction.created_at))
        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        transactions = result.scalars().all()

        return [ExpenseTransactionRead.model_validate(txn) for txn in transactions]

    async def get_pending_approval_transactions(self) -> list[ExpenseTransactionRead]:
        """Get transactions pending approval"""

        query = (
            select(ExpenseTransaction)
            .where(and_(ExpenseTransaction.status == "pending", ExpenseTransaction.requires_approval))
            .order_by(ExpenseTransaction.created_at)
        )

        result = await self.db.execute(query)
        transactions = result.scalars().all()

        return [ExpenseTransactionRead.model_validate(txn) for txn in transactions]

    async def update_transaction(
        self,
        transaction_id: UUID,
        transaction_data: ExpenseTransactionUpdate,
        user_id: UUID,
        user_role: str,
        user_username: str,
    ) -> ExpenseTransactionRead:
        """Update an expense transaction"""

        # Get existing transaction
        db_transaction = await self.check_record_exists(
            ExpenseTransaction, transaction_id, "Expense transaction not found"
        )

        # Store original state for audit
        self.prepare_record_snapshot(db_transaction)

        # Check if transaction can be updated
        if db_transaction.status == "approved":
            raise self.build_error_response("TRANSACTION_ALREADY_APPROVED", "Cannot update approved transaction")

        # Update fields
        update_data = transaction_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_transaction, field, value)

        await self.db.flush()

        # Get the updated transaction with relationships
        result = await self.db.execute(
            select(ExpenseTransaction)
            .options(
                selectinload(ExpenseTransaction.expense_type).selectinload(ExpenseType.category),
                selectinload(ExpenseTransaction.transaction_items),
                selectinload(ExpenseTransaction.attachments),
                selectinload(ExpenseTransaction.audit_logs),
            )
            .where(ExpenseTransaction.id == db_transaction.id)
        )
        transaction_out = result.scalar_one()

        # Commit the main record
        await self.db.commit()

        # TODO: Temporarily disabled audit log creation for debugging
        # await self.create_audit_log(
        #     transaction_id=db_transaction.id,
        #     action="update",
        #     action_category="transaction",
        #     actor_user_id=user_id,
        #     actor_role=user_role,
        #     actor_username=user_username,
        #     org_id=db_transaction.org_id,
        #     full_record_before=original_state,
        #     full_record_after=self.prepare_record_snapshot(transaction_out),
        #     action_reason="Transaction updated"
        # )

        return ExpenseTransactionRead.model_validate(transaction_out)

    async def approve_transaction(
        self,
        transaction_id: UUID,
        approval_data: ExpenseTransactionApproval,
        user_id: UUID,
        user_role: str,
        user_username: str,
    ) -> ExpenseTransactionRead:
        """Approve or reject a transaction"""

        # Get existing transaction
        db_transaction = await self.check_record_exists(
            ExpenseTransaction, transaction_id, "Expense transaction not found"
        )

        # Store original state for audit
        self.prepare_record_snapshot(db_transaction)

        # Check if transaction can be approved
        if db_transaction.status != "pending":
            raise self.build_error_response(
                "TRANSACTION_NOT_PENDING", f"Transaction is already {db_transaction.status}"
            )

        if not db_transaction.requires_approval:
            raise self.build_error_response(
                "TRANSACTION_NO_APPROVAL_REQUIRED", "This transaction does not require approval"
            )

        # Update transaction status
        if approval_data.action == "approve":
            db_transaction.status = "approved"
            db_transaction.approved_by_user_id = user_id
            db_transaction.approved_by_role = user_role
            db_transaction.approved_at = func.now()
            db_transaction.approval_comment = approval_data.approval_comment
        elif approval_data.action == "reject":
            db_transaction.status = "rejected"
            db_transaction.approved_by_user_id = user_id
            db_transaction.approved_by_role = user_role
            db_transaction.approved_at = func.now()
            db_transaction.approval_comment = approval_data.approval_comment
        else:
            raise self.build_error_response("INVALID_APPROVAL_ACTION", "Action must be 'approve' or 'reject'")

        await self.db.flush()

        # Get the updated transaction with relationships
        result = await self.db.execute(
            select(ExpenseTransaction)
            .options(
                selectinload(ExpenseTransaction.expense_type).selectinload(ExpenseType.category),
                selectinload(ExpenseTransaction.transaction_items),
                selectinload(ExpenseTransaction.attachments),
                selectinload(ExpenseTransaction.audit_logs),
            )
            .where(ExpenseTransaction.id == db_transaction.id)
        )
        transaction_out = result.scalar_one()

        # Commit the main record
        await self.db.commit()

        # TODO: Temporarily disabled audit log creation for debugging
        # await self.create_audit_log(
        #     transaction_id=db_transaction.id,
        #     action="approve",
        #     action_category="transaction",
        #     actor_user_id=user_id,
        #     actor_role=user_role,
        #     actor_username=user_username,
        #     org_id=db_transaction.org_id,
        #     full_record_before=original_state,
        #     full_record_after=self.prepare_record_snapshot(transaction_out),
        #     action_reason=f"Transaction {approval_data.action}ed"
        # )

        return ExpenseTransactionRead.model_validate(transaction_out)

    async def delete_transaction(
        self, transaction_id: UUID, user_id: UUID, user_role: str, user_username: str
    ) -> dict[str, Any]:
        """Delete an expense transaction (soft delete)"""

        # Get existing transaction
        transaction = await self.check_record_exists(
            ExpenseTransaction, transaction_id, "Expense transaction not found"
        )

        # Check if transaction can be deleted
        if transaction.status == "approved":
            raise self.build_error_response("TRANSACTION_ALREADY_APPROVED", "Cannot delete approved transaction")

        # Soft delete by setting status to 'deleted'
        transaction.status = "deleted"
        await self.db.flush()
        await self.db.commit()

        return {"message": "Expense transaction deleted successfully", "transaction_id": transaction_id}
