from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.expense import ExpenseCategory, ExpenseType
from app.schemas.expense import ExpenseTypeCreate, ExpenseTypeDropdown, ExpenseTypeRead, ExpenseTypeUpdate

from .base_expense_service import BaseExpenseService


class ExpenseTypeService(BaseExpenseService):
    """Service for managing expense types"""

    def __init__(self, db: AsyncSession):
        super().__init__(db)

    async def create_type(
        self, type_data: ExpenseTypeCreate, user_id: UUID, user_role: str, user_username: str, org_id: UUID
    ) -> ExpenseTypeRead:
        """Create a new expense type"""

        # Validate category exists and is active
        category = await self.check_record_exists(ExpenseCategory, type_data.category_id, "Expense category not found")

        if not category.is_active:
            raise self.build_error_response("INACTIVE_CATEGORY", "Cannot create expense type for inactive category")

        # Validate unique name within category
        query = select(func.count(ExpenseType.id)).where(
            ExpenseType.name == type_data.name, ExpenseType.category_id == type_data.category_id
        )
        result = await self.db.execute(query)

        if result.scalar() > 0:
            raise self.build_error_response(
                "DUPLICATE_TYPE_NAME", f"Expense type '{type_data.name}' already exists in this category"
            )

        # Create the expense type
        type_dict = type_data.model_dump()
        type_dict["org_id"] = org_id
        db_type = ExpenseType(**type_dict)
        self.db.add(db_type)
        await self.db.flush()

        # Get the created type with relationships
        result = await self.db.execute(
            select(ExpenseType).options(selectinload(ExpenseType.category)).where(ExpenseType.id == db_type.id)
        )
        type_out = result.scalar_one()

        # Commit the main record
        await self.db.commit()

        # TODO: Temporarily disabled audit log creation for debugging
        # await self.create_audit_log(
        #     transaction_id=db_type.id,
        #     action="create",
        #     action_category="type",
        #     actor_user_id=user_id,
        #     actor_role=user_role,
        #     actor_username=user_username,
        #     org_id=org_id,
        #     full_record_after=self.prepare_record_snapshot(type_out),
        #     action_reason="Expense type created"
        # )

        return ExpenseTypeRead.model_validate(type_out)

    async def get_type(self, type_id: UUID) -> ExpenseTypeRead:
        """Get a specific expense type"""

        query = select(ExpenseType).options(selectinload(ExpenseType.category)).where(ExpenseType.id == type_id)

        result = await self.db.execute(query)
        expense_type = result.scalar_one_or_none()

        if not expense_type:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense type not found")

        return ExpenseTypeRead.model_validate(expense_type)

    async def get_types(
        self, category_id: UUID | None = None, skip: int = 0, limit: int = 100, active_only: bool = True
    ) -> list[ExpenseTypeRead]:
        """Get expense types with optional category filtering"""

        query = select(ExpenseType).options(selectinload(ExpenseType.category))

        if category_id:
            query = query.where(ExpenseType.category_id == category_id)

        if active_only:
            query = query.where(ExpenseType.is_active)

        query = query.order_by(desc(ExpenseType.created_at))
        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        types = result.scalars().all()

        return [ExpenseTypeRead.model_validate(typ) for typ in types]

    async def get_types_dropdown(self, category_id: UUID | None = None) -> list[ExpenseTypeDropdown]:
        """Get expense types for dropdown selection"""

        query = select(ExpenseType.id, ExpenseType.name, ExpenseType.category_id).where(ExpenseType.is_active)

        if category_id:
            query = query.where(ExpenseType.category_id == category_id)

        query = query.order_by(ExpenseType.name)

        result = await self.db.execute(query)
        types = result.all()

        return [ExpenseTypeDropdown(id=typ.id, name=typ.name, category_id=typ.category_id) for typ in types]

    async def update_type(
        self, type_id: UUID, type_data: ExpenseTypeUpdate, user_id: UUID, user_role: str, user_username: str
    ) -> ExpenseTypeRead:
        """Update an expense type"""

        # Get existing type
        expense_type = await self.check_record_exists(ExpenseType, type_id, "Expense type not found")

        # Store original state for audit
        self.prepare_record_snapshot(expense_type)

        # Validate category if being changed
        if type_data.category_id and type_data.category_id != expense_type.category_id:
            category = await self.check_record_exists(
                ExpenseCategory, type_data.category_id, "Expense category not found"
            )

            if not category.is_active:
                raise self.build_error_response("INACTIVE_CATEGORY", "Cannot move expense type to inactive category")

        # Check name uniqueness if name or category is being changed
        if type_data.name and (
            type_data.name != expense_type.name
            or (type_data.category_id and type_data.category_id != expense_type.category_id)
        ):
            category_id_to_check = type_data.category_id or expense_type.category_id
            query = select(func.count(ExpenseType.id)).where(
                ExpenseType.name == type_data.name,
                ExpenseType.category_id == category_id_to_check,
                ExpenseType.id != type_id,
            )
            result = await self.db.execute(query)

            if result.scalar() > 0:
                raise self.build_error_response(
                    "DUPLICATE_TYPE_NAME", f"Expense type '{type_data.name}' already exists in this category"
                )

        # Update fields
        update_data = type_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(expense_type, field, value)

        await self.db.flush()

        # Get the updated type with relationships
        result = await self.db.execute(
            select(ExpenseType).options(selectinload(ExpenseType.category)).where(ExpenseType.id == expense_type.id)
        )
        type_out = result.scalar_one()

        # Commit the main record
        await self.db.commit()

        # TODO: Temporarily disabled audit log creation for debugging
        # await self.create_audit_log(
        #     transaction_id=expense_type.id,
        #     action="update",
        #     action_category="type",
        #     actor_user_id=user_id,
        #     actor_role=user_role,
        #     actor_username=user_username,
        #     org_id=expense_type.org_id,
        #     full_record_before=original_state,
        #     full_record_after=self.prepare_record_snapshot(type_out),
        #     action_reason="Expense type updated"
        # )

        return ExpenseTypeRead.model_validate(type_out)

    async def delete_type(self, type_id: UUID, user_id: UUID, user_role: str, user_username: str) -> dict[str, Any]:
        """Delete an expense type (soft delete by setting is_active=False)"""

        # Get existing type
        expense_type = await self.check_record_exists(ExpenseType, type_id, "Expense type not found")

        # Check if type has associated transactions
        from app.models.expense import ExpenseTransaction

        query = select(func.count(ExpenseTransaction.id)).where(ExpenseTransaction.expense_type_id == type_id)
        result = await self.db.execute(query)
        transaction_count = result.scalar()

        if transaction_count > 0:
            raise self.build_error_response(
                "TYPE_HAS_TRANSACTIONS",
                f"Cannot delete expense type. It has {transaction_count} associated transactions.",
                details={"transaction_count": transaction_count},
            )

        # Soft delete by setting is_active=False
        expense_type.is_active = False
        await self.db.flush()
        await self.db.commit()
        await self.db.refresh(expense_type)

        return expense_type
