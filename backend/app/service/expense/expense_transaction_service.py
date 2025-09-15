from typing import List, Optional, Dict, Any
from uuid import UUID
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, and_, or_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from datetime import datetime

from app.models.expense import (
    ExpenseTransaction,
    ExpenseType,
    ExpenseTransactionItem
)
from app.schemas.expense import (
    ExpenseTransactionCreate,
    ExpenseTransactionUpdate,
    ExpenseTransactionRead,
    ExpenseTransactionApproval
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
        user_department_id: Optional[UUID] = None
    ) -> ExpenseTransactionRead:
        """Create a new expense transaction"""

        # Validate expense type exists and is active
        expense_type = await self.check_record_exists(
            ExpenseType,
            transaction_data.expense_type_id,
            "Expense type not found"
        )

        if not expense_type.is_active:
            raise self.build_error_response(
                "INACTIVE_EXPENSE_TYPE",
                "Cannot create transaction for inactive expense type"
            )

        # Check idempotency key uniqueness
        is_unique = await self.validate_unique_constraint(
            ExpenseTransaction,
            'idempotency_key',
            transaction_data.idempotency_key
        )

        if not is_unique:
            raise self.build_error_response(
                "DUPLICATE_IDEMPOTENCY_KEY",
                "Transaction with this idempotency key already exists"
            )

        # Validate department access
        if transaction_data.department_id:
            if not self.validate_department_access(
                user_department_id,
                transaction_data.department_id,
                user_role
            ):
                raise self.build_error_response(
                    "DEPARTMENT_ACCESS_DENIED",
                    "Access denied to specified department",
                    status_code=status.HTTP_403_FORBIDDEN
                )

        # Determine approval requirement
        # TODO: Implement approval rules based on settings
        requires_approval = await self._determine_approval_requirement(
            transaction_data.amount,
            transaction_data.expense_type_id,
            user_role
        )

        if transaction_data.requires_approval_override is not None:
            requires_approval = transaction_data.requires_approval_override

        # Create transaction
        transaction_dict = transaction_data.model_dump(exclude={'requires_approval_override'})
        transaction_dict.update({
            'requires_approval': requires_approval,
            'requires_approval_override': transaction_data.requires_approval_override,
            'status': 'pending',
            'created_by_user_id': user_id,
            'created_by_role': user_role
        })

        db_transaction = ExpenseTransaction(**transaction_dict)
        self.db.add(db_transaction)
        await self.db.flush()
        await self.db.refresh(db_transaction)

        # Create audit log
        await self.create_audit_log(
            transaction_id=db_transaction.id,
            action="create",
            action_category="transaction",
            actor_user_id=user_id,
            actor_role=user_role,
            actor_username=user_username,
            full_record_after=self.prepare_record_snapshot(db_transaction),
            action_reason="Transaction created",
            department_id=transaction_data.department_id
        )

        await self.db.commit()
        return await self.get_transaction(db_transaction.id)

    async def get_transaction(
        self,
        transaction_id: UUID,
        user_department_id: Optional[UUID] = None,
        user_role: str = "user"
    ) -> ExpenseTransactionRead:
        """Get a specific expense transaction"""

        query = select(ExpenseTransaction).options(
            selectinload(ExpenseTransaction.expense_type).selectinload(ExpenseType.category),
            selectinload(ExpenseTransaction.transaction_items),
            selectinload(ExpenseTransaction.attachments),
            selectinload(ExpenseTransaction.audit_logs)
        ).where(ExpenseTransaction.id == transaction_id)

        # Apply department scoping
        query = await self.get_department_scoped_query(
            query, user_department_id, user_role, ExpenseTransaction
        )

        result = await self.db.execute(query)
        transaction = result.scalar_one_or_none()

        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense transaction not found or access denied"
            )

        return ExpenseTransactionRead.model_validate(transaction)

    async def get_transactions(
        self,
        skip: int = 0,
        limit: int = 100,
        status_filter: Optional[str] = None,
        expense_type_id: Optional[UUID] = None,
        department_id: Optional[UUID] = None,
        user_department_id: Optional[UUID] = None,
        user_role: str = "user"
    ) -> List[ExpenseTransactionRead]:
        """Get expense transactions with filtering"""

        query = select(ExpenseTransaction).options(
            selectinload(ExpenseTransaction.expense_type).selectinload(ExpenseType.category)
        )

        # Apply filters
        if status_filter:
            query = query.where(ExpenseTransaction.status == status_filter)

        if expense_type_id:
            query = query.where(ExpenseTransaction.expense_type_id == expense_type_id)

        if department_id:
            query = query.where(ExpenseTransaction.department_id == department_id)

        # Apply department scoping
        query = await self.get_department_scoped_query(
            query, user_department_id, user_role, ExpenseTransaction
        )

        query = query.order_by(desc(ExpenseTransaction.created_at))
        query = query.offset(skip).limit(limit)

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
        user_department_id: Optional[UUID] = None
    ) -> ExpenseTransactionRead:
        """Update an expense transaction"""

        # Get existing transaction with department access check
        transaction = await self.get_transaction(
            transaction_id, user_department_id, user_role
        )

        # Convert back to model for updates
        query = select(ExpenseTransaction).where(ExpenseTransaction.id == transaction_id)
        result = await self.db.execute(query)
        db_transaction = result.scalar_one()

        # Check if transaction can be updated
        if db_transaction.status in ['approved', 'paid']:
            raise self.build_error_response(
                "TRANSACTION_IMMUTABLE",
                f"Cannot update transaction with status '{db_transaction.status}'"
            )

        # Store original state for audit
        original_state = self.prepare_record_snapshot(db_transaction)

        # Validate expense type if being changed
        if transaction_data.expense_type_id:
            expense_type = await self.check_record_exists(
                ExpenseType,
                transaction_data.expense_type_id,
                "Expense type not found"
            )

            if not expense_type.is_active:
                raise self.build_error_response(
                    "INACTIVE_EXPENSE_TYPE",
                    "Cannot update to inactive expense type"
                )

        # Validate department access if being changed
        if transaction_data.department_id:
            if not self.validate_department_access(
                user_department_id,
                transaction_data.department_id,
                user_role
            ):
                raise self.build_error_response(
                    "DEPARTMENT_ACCESS_DENIED",
                    "Access denied to specified department",
                    status_code=status.HTTP_403_FORBIDDEN
                )

        # Update fields
        update_data = transaction_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_transaction, field, value)

        # Increment version for optimistic locking
        db_transaction.version += 1

        await self.db.flush()
        await self.db.refresh(db_transaction)

        # Create audit log
        await self.create_audit_log(
            transaction_id=db_transaction.id,
            action="update",
            action_category="transaction",
            actor_user_id=user_id,
            actor_role=user_role,
            actor_username=user_username,
            full_record_before=original_state,
            full_record_after=self.prepare_record_snapshot(db_transaction),
            action_reason="Transaction updated",
            department_id=db_transaction.department_id
        )

        await self.db.commit()
        return await self.get_transaction(transaction_id, user_department_id, user_role)

    async def approve_transaction(
        self,
        transaction_id: UUID,
        approval_data: ExpenseTransactionApproval,
        user_id: UUID,
        user_role: str,
        user_username: str,
        user_department_id: Optional[UUID] = None
    ) -> ExpenseTransactionRead:
        """Approve or reject an expense transaction"""

        # Get existing transaction
        transaction = await self.get_transaction(
            transaction_id, user_department_id, user_role
        )

        query = select(ExpenseTransaction).where(ExpenseTransaction.id == transaction_id)
        result = await self.db.execute(query)
        db_transaction = result.scalar_one()

        # Validate transaction can be approved
        if db_transaction.status != 'pending':
            raise self.build_error_response(
                "INVALID_STATUS_FOR_APPROVAL",
                f"Cannot approve transaction with status '{db_transaction.status}'"
            )

        if not db_transaction.requires_approval:
            raise self.build_error_response(
                "APPROVAL_NOT_REQUIRED",
                "This transaction does not require approval"
            )

        # Store original state for audit
        original_state = self.prepare_record_snapshot(db_transaction)

        # Update approval fields
        if approval_data.action.lower() == 'approve':
            db_transaction.status = 'approved'
        elif approval_data.action.lower() == 'reject':
            db_transaction.status = 'cancelled'
        else:
            raise self.build_error_response(
                "INVALID_APPROVAL_ACTION",
                "Action must be 'approve' or 'reject'"
            )

        db_transaction.approved_by_user_id = user_id
        db_transaction.approved_by_role = user_role
        db_transaction.approved_at = datetime.utcnow()
        db_transaction.approval_comment = approval_data.approval_comment
        db_transaction.version += 1

        await self.db.flush()

        # Create audit log
        await self.create_audit_log(
            transaction_id=db_transaction.id,
            action=approval_data.action.lower(),
            action_category="approval",
            actor_user_id=user_id,
            actor_role=user_role,
            actor_username=user_username,
            full_record_before=original_state,
            full_record_after=self.prepare_record_snapshot(db_transaction),
            action_reason=approval_data.approval_comment,
            department_id=db_transaction.department_id
        )

        await self.db.commit()
        return await self.get_transaction(transaction_id, user_department_id, user_role)

    async def _determine_approval_requirement(
        self,
        amount: Decimal,
        expense_type_id: UUID,
        user_role: str
    ) -> bool:
        """Determine if transaction requires approval based on business rules"""

        # TODO: Implement approval rules based on settings
        # For now, simple rules:
        # - Amounts over 1000 require approval
        # - Admin roles don't require approval for their own transactions

        if user_role.lower() in ['admin', 'tenant_admin']:
            return False

        if amount > Decimal('1000.00'):
            return True

        return False