from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expense import ExpenseDepartment
from app.schemas.expense import (
    ExpenseDepartmentCreate,
    ExpenseDepartmentDropdown,
    ExpenseDepartmentRead,
    ExpenseDepartmentUpdate,
)

from .base_expense_service import BaseExpenseService


class ExpenseDepartmentService(BaseExpenseService):
    """Service for managing expense departments"""

    def __init__(self, db: AsyncSession):
        super().__init__(db)

    async def _ensure_unique_active_name(self, name: str, exclude_id: UUID | None = None) -> None:
        query = select(func.count(ExpenseDepartment.id)).where(
            func.lower(ExpenseDepartment.name) == name.strip().lower(),
            ExpenseDepartment.is_active == True,  # noqa: E712
        )
        if exclude_id:
            query = query.where(ExpenseDepartment.id != exclude_id)
        if (await self.db.execute(query)).scalar() > 0:
            raise self.build_error_response(
                "DUPLICATE_DEPARTMENT_NAME", f"Department with name '{name}' already exists"
            )

    async def create_department(self, department_data: ExpenseDepartmentCreate, org_id: UUID) -> ExpenseDepartmentRead:
        """Create a new expense department"""
        await self._ensure_unique_active_name(department_data.name)

        db_department = ExpenseDepartment(org_id=org_id, **department_data.model_dump())
        self.db.add(db_department)
        await self.db.flush()

        result = await self.db.execute(select(ExpenseDepartment).where(ExpenseDepartment.id == db_department.id))
        department_out = result.scalar_one()
        await self.db.commit()

        return ExpenseDepartmentRead.model_validate(department_out)

    async def get_department(self, department_id: UUID) -> ExpenseDepartmentRead:
        """Get a specific expense department"""
        department = await self.check_record_exists(ExpenseDepartment, department_id, "Expense department not found")
        return ExpenseDepartmentRead.model_validate(department)

    async def get_departments(
        self, skip: int = 0, limit: int = 100, active_only: bool = True
    ) -> list[ExpenseDepartmentRead]:
        """Get expense departments with pagination"""
        query = select(ExpenseDepartment)
        if active_only:
            query = query.where(ExpenseDepartment.is_active)
        query = query.order_by(desc(ExpenseDepartment.created_at)).offset(skip).limit(limit)

        result = await self.db.execute(query)
        return [ExpenseDepartmentRead.model_validate(department) for department in result.scalars().all()]

    async def get_departments_dropdown(self) -> list[ExpenseDepartmentDropdown]:
        """Get active expense departments for dropdown selection"""
        query = (
            select(ExpenseDepartment.id, ExpenseDepartment.name)
            .where(ExpenseDepartment.is_active)
            .order_by(ExpenseDepartment.name)
        )
        result = await self.db.execute(query)
        return [ExpenseDepartmentDropdown(id=row.id, name=row.name) for row in result.all()]

    async def update_department(
        self, department_id: UUID, department_data: ExpenseDepartmentUpdate
    ) -> ExpenseDepartmentRead:
        """Update an expense department"""
        department = await self.check_record_exists(ExpenseDepartment, department_id, "Expense department not found")

        update_data = department_data.model_dump(exclude_unset=True)
        becomes_active = update_data.get("is_active", department.is_active)
        new_name = update_data.get("name", department.name)
        if becomes_active and (new_name != department.name or not department.is_active):
            await self._ensure_unique_active_name(new_name, exclude_id=department_id)

        for field, value in update_data.items():
            setattr(department, field, value)
        await self.db.flush()

        result = await self.db.execute(select(ExpenseDepartment).where(ExpenseDepartment.id == department_id))
        department_out = result.scalar_one()
        await self.db.commit()

        return ExpenseDepartmentRead.model_validate(department_out)

    async def delete_department(self, department_id: UUID) -> ExpenseDepartmentRead:
        """Soft delete an expense department by setting is_active=False"""
        department = await self.check_record_exists(ExpenseDepartment, department_id, "Expense department not found")

        department.is_active = False
        await self.db.flush()

        result = await self.db.execute(select(ExpenseDepartment).where(ExpenseDepartment.id == department_id))
        department_out = result.scalar_one()
        await self.db.commit()

        return ExpenseDepartmentRead.model_validate(department_out)
