from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.expense import ExpenseCategory
from app.schemas.expense import (
    ExpenseCategoryCreate,
    ExpenseCategoryUpdate,
    ExpenseCategoryRead,
    ExpenseCategoryDropdown
)
from .base_expense_service import BaseExpenseService


class ExpenseCategoryService(BaseExpenseService):
    """Service for managing expense categories"""

    def __init__(self, db: AsyncSession):
        super().__init__(db)

    async def create_category(
        self,
        category_data: ExpenseCategoryCreate,
        user_id: UUID,
        user_role: str,
        user_username: str,
        org_id: UUID
    ) -> ExpenseCategoryRead:
        """Create a new expense category"""

        # Validate unique name
        is_unique = await self.validate_unique_constraint(
            ExpenseCategory,
            'name',
            category_data.name
        )

        if not is_unique:
            raise self.build_error_response(
                "DUPLICATE_CATEGORY_NAME",
                f"Category with name '{category_data.name}' already exists"
            )

        # Create the category with org_id
        db_category = ExpenseCategory(
            org_id=org_id,
            **category_data.model_dump()
        )
        self.db.add(db_category)
        await self.db.flush()

        # Get the created category with relationships
        result = await self.db.execute(
            select(ExpenseCategory).where(ExpenseCategory.id == db_category.id)
        )
        category_out = result.scalar_one()

        # TODO: Temporarily disabled audit log creation for debugging
        # await self.create_audit_log(
        #     transaction_id=db_category.id,
        #     action="create",
        #     action_category="category",
        #     actor_user_id=user_id,
        #     actor_role=user_role,
        #     actor_username=user_username,
        #     org_id=org_id,
        #     full_record_after=self.prepare_record_snapshot(category_out),
        #     action_reason="Expense category created"
        # )
        
        # Commit the main record
        await self.db.commit()
        
        return ExpenseCategoryRead.model_validate(category_out)

    async def get_category(self, category_id: UUID) -> ExpenseCategoryRead:
        """Get a specific expense category"""

        category = await self.check_record_exists(
            ExpenseCategory,
            category_id,
            "Expense category not found"
        )

        return ExpenseCategoryRead.model_validate(category)

    async def get_categories(
        self,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = True
    ) -> List[ExpenseCategoryRead]:
        """Get all expense categories with pagination"""

        query = select(ExpenseCategory)

        if active_only:
            query = query.where(ExpenseCategory.is_active == True)

        query = query.order_by(desc(ExpenseCategory.created_at))
        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        categories = result.scalars().all()

        return [ExpenseCategoryRead.model_validate(cat) for cat in categories]

    async def get_categories_dropdown(self) -> List[ExpenseCategoryDropdown]:
        """Get expense categories for dropdown selection"""

        query = select(ExpenseCategory.id, ExpenseCategory.name).where(
            ExpenseCategory.is_active == True
        ).order_by(ExpenseCategory.name)

        result = await self.db.execute(query)
        categories = result.all()

        return [
            ExpenseCategoryDropdown(id=cat.id, name=cat.name)
            for cat in categories
        ]

    async def update_category(
        self,
        category_id: UUID,
        category_data: ExpenseCategoryUpdate,
        user_id: UUID,
        user_role: str,
        user_username: str
    ) -> ExpenseCategoryRead:
        """Update an expense category"""

        # Get existing category
        category = await self.check_record_exists(
            ExpenseCategory,
            category_id,
            "Expense category not found"
        )

        # Store original state for audit
        original_state = self.prepare_record_snapshot(category)

        # Check name uniqueness if name is being changed
        if category_data.name and category_data.name != category.name:
            is_unique = await self.validate_unique_constraint(
                ExpenseCategory,
                'name',
                category_data.name,
                exclude_id=category_id
            )

            if not is_unique:
                raise self.build_error_response(
                    "DUPLICATE_CATEGORY_NAME",
                    f"Category with name '{category_data.name}' already exists"
                )

        # Update fields
        update_data = category_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(category, field, value)

        await self.db.flush()

        # Get the updated category with relationships
        result = await self.db.execute(
            select(ExpenseCategory).where(ExpenseCategory.id == category.id)
        )
        category_out = result.scalar_one()

        # Commit the main record
        await self.db.commit()
        
        # TODO: Temporarily disabled audit log creation for debugging
        # await self.create_audit_log(
        #     transaction_id=category.id,
        #     action="update",
        #     action_category="category",
        #     actor_user_id=user_id,
        #     actor_role=user_role,
        #     actor_username=user_username,
        #     org_id=category.org_id,
        #     full_record_before=original_state,
        #     full_record_after=self.prepare_record_snapshot(category_out),
        #     action_reason="Expense category updated"
        # )
        
        return ExpenseCategoryRead.model_validate(category_out)

    async def delete_category(
        self,
        category_id: UUID,
        user_id: UUID,
        user_role: str,
        user_username: str
    ) -> Dict[str, Any]:
        """Delete an expense category (soft delete by setting is_active=False)"""

        # Get existing category
        category = await self.check_record_exists(
            ExpenseCategory,
            category_id,
            "Expense category not found"
        )

        # TODO: Add dependency check later - temporarily disabled
        # Check if category has associated expense types
        # from app.models.expense import ExpenseType
        # query = select(func.count(ExpenseType.id)).where(
        #     ExpenseType.category_id == category_id,
        #     ExpenseType.is_active == True
        # )
        # result = await self.db.execute(query)
        # active_types_count = result.scalar()
        # if active_types_count > 0:
        #     raise self.build_error_response(...)

        # Soft delete by setting is_active=False
        category.is_active = False
        await self.db.flush()
        await self.db.commit()
        
        # TODO: Temporarily disabled audit log creation for debugging
        # await self.create_audit_log(
        #     transaction_id=category.id,
        #     action="delete",
        #     action_category="category",
        #     actor_user_id=user_id,
        #     actor_role=user_role,
        #     actor_username=user_username,
        #     org_id=category.org_id,
        #     full_record_before=self.prepare_record_snapshot(category),
        #     action_reason="Expense category deleted"
        # )

        return {
            "message": "Expense category deleted successfully",
            "category_id": category_id
        }