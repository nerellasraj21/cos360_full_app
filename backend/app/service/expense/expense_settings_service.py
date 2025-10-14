from typing import List, Optional, Dict, Any, Union
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from decimal import Decimal

from app.models.expense import ExpenseSettings
from app.schemas.expense import (
    ExpenseSettingsCreate,
    ExpenseSettingsUpdate,
    ExpenseSettingsRead,
    ExpenseSettingsValue
)
from .base_expense_service import BaseExpenseService


class ExpenseSettingsService(BaseExpenseService):
    """Service for managing expense settings"""

    def __init__(self, db: AsyncSession):
        super().__init__(db)

    async def create_setting(
        self,
        setting_data: ExpenseSettingsCreate,
        user_id: UUID,
        user_role: str,
        user_username: str,
        org_id: UUID
    ) -> ExpenseSettingsRead:
        """Create a new expense setting"""

        # Validate unique setting key
        is_unique = await self.validate_unique_constraint(
            ExpenseSettings,
            'setting_key',
            setting_data.setting_key
        )

        if not is_unique:
            raise self.build_error_response(
                "DUPLICATE_SETTING_KEY",
                f"Setting with key '{setting_data.setting_key}' already exists"
            )

        # Create setting
        setting_dict = setting_data.model_dump()
        setting_dict.update({
            'org_id': org_id,
            'created_by_user_id': user_id,
            'created_by_role': user_role
        })

        db_setting = ExpenseSettings(**setting_dict)
        self.db.add(db_setting)
        await self.db.flush()

        # Get the created setting with relationships
        result = await self.db.execute(
            select(ExpenseSettings).where(ExpenseSettings.id == db_setting.id)
        )
        setting_out = result.scalar_one()

        await self.db.commit()
        return ExpenseSettingsRead.model_validate(setting_out)

    async def get_setting(self, setting_id: UUID) -> ExpenseSettingsRead:
        """Get a specific expense setting"""

        setting = await self.check_record_exists(
            ExpenseSettings,
            setting_id,
            "Expense setting not found"
        )

        return ExpenseSettingsRead.model_validate(setting)

    async def get_setting_value(self, setting_key: str) -> Optional[ExpenseSettingsValue]:
        """Get a setting value by key"""

        query = select(ExpenseSettings).where(
            ExpenseSettings.setting_key == setting_key,
            ExpenseSettings.is_active == True
        )

        result = await self.db.execute(query)
        setting = result.scalar_one_or_none()

        if not setting:
            return None

        # Determine value and type
        if setting.string_value is not None:
            value = setting.string_value
            value_type = "string"
        elif setting.numeric_value is not None:
            value = float(setting.numeric_value)
            value_type = "numeric"
        elif setting.integer_value is not None:
            value = setting.integer_value
            value_type = "integer"
        elif setting.boolean_value is not None:
            value = setting.boolean_value
            value_type = "boolean"
        elif setting.json_value is not None:
            value = setting.json_value
            value_type = "json"
        else:
            return None

        return ExpenseSettingsValue(
            setting_key=setting_key,
            value=value,
            value_type=value_type
        )

    async def get_settings(
        self,
        category: Optional[str] = None,
        active_only: bool = True
    ) -> List[ExpenseSettingsRead]:
        """Get all expense settings with optional filtering"""

        query = select(ExpenseSettings)

        if active_only:
            query = query.where(ExpenseSettings.is_active == True)

        if category:
            query = query.where(ExpenseSettings.setting_category == category)

        query = query.order_by(ExpenseSettings.setting_category, ExpenseSettings.setting_key)

        result = await self.db.execute(query)
        settings = result.scalars().all()

        return [ExpenseSettingsRead.model_validate(setting) for setting in settings]

    async def update_setting(
        self,
        setting_id: UUID,
        setting_data: ExpenseSettingsUpdate,
        user_id: UUID,
        user_role: str,
        user_username: str
    ) -> ExpenseSettingsRead:
        """Update an expense setting"""

        # Get existing setting
        setting = await self.check_record_exists(
            ExpenseSettings,
            setting_id,
            "Expense setting not found"
        )

        # Update fields
        update_data = setting_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(setting, field, value)

        # Update audit fields
        setting.last_modified_by_user_id = user_id
        setting.last_modified_by_role = user_role

        await self.db.flush()

        # Get the updated setting with relationships
        result = await self.db.execute(
            select(ExpenseSettings).where(ExpenseSettings.id == setting.id)
        )
        setting_out = result.scalar_one()

        await self.db.commit()
        return ExpenseSettingsRead.model_validate(setting_out)

    async def delete_setting(
        self,
        setting_id: UUID,
        user_id: UUID,
        user_role: str,
        user_username: str
    ) -> Dict[str, Any]:
        """Delete an expense setting (soft delete)"""

        # Get existing setting
        setting = await self.check_record_exists(
            ExpenseSettings,
            setting_id,
            "Expense setting not found"
        )

        # Soft delete by setting is_active=False
        setting.is_active = False
        setting.last_modified_by_user_id = user_id
        setting.last_modified_by_role = user_role

        await self.db.flush()
        await self.db.commit()

        return {
            "message": "Expense setting deleted successfully",
            "setting_id": setting_id
        }