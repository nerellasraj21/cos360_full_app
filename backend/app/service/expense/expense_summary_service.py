from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expense import ExpenseCategory, ExpenseTransaction, ExpenseType
from app.models.masters.academic_year_model import AcademicYear
from app.schemas.expense.expense_summary_schema import (
    ExpenseCategorySummary,
    ExpenseEntryRead,
    ExpenseHierarchicalSummary,
    ExpenseTypeSummary,
)

from .base_expense_service import BaseExpenseService


class ExpenseSummaryService(BaseExpenseService):
    """Service for generating hierarchical expense summaries."""

    def __init__(self, db: AsyncSession):
        super().__init__(db)

    async def get_hierarchical_summary(
        self,
        academic_year_id: UUID | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        status_filter: str | None = None,
    ) -> ExpenseHierarchicalSummary:
        """
        Return a full Category → Type → Entry hierarchy with subtotals.

        Filters (all optional):
        - academic_year_id: filter transactions by academic year
        - start_date / end_date: filter by transaction date range
        - status_filter: e.g. "approved", "paid" (default: all non-cancelled)
        """

        # Resolve academic year title if requested
        academic_year_title: str | None = None
        if academic_year_id:
            ay_result = await self.db.execute(
                select(AcademicYear.title).where(AcademicYear.id == academic_year_id)
            )
            academic_year_title = ay_result.scalar_one_or_none()

        # Load ALL active categories
        cat_result = await self.db.execute(
            select(ExpenseCategory)
            .where(ExpenseCategory.is_active.is_(True))
            .order_by(ExpenseCategory.name)
        )
        categories = cat_result.scalars().all()

        # Build the transaction filter conditions once
        def _tx_conditions(type_id: UUID):
            conditions = [ExpenseTransaction.expense_type_id == type_id]
            if academic_year_id:
                conditions.append(ExpenseTransaction.academic_year_id == academic_year_id)
            if start_date:
                conditions.append(ExpenseTransaction.transaction_date >= start_date)
            if end_date:
                conditions.append(ExpenseTransaction.transaction_date <= end_date)
            if status_filter:
                conditions.append(ExpenseTransaction.status == status_filter)
            else:
                # Exclude cancelled by default
                conditions.append(ExpenseTransaction.status != "cancelled")
            return conditions

        category_summaries: list[ExpenseCategorySummary] = []
        grand_total = Decimal("0")
        total_entries = 0

        for category in categories:
            # Load active types for this category
            type_result = await self.db.execute(
                select(ExpenseType)
                .where(
                    ExpenseType.category_id == category.id,
                    ExpenseType.is_active.is_(True),
                )
                .order_by(ExpenseType.name)
            )
            types = type_result.scalars().all()

            type_summaries: list[ExpenseTypeSummary] = []
            category_total = Decimal("0")
            category_entry_count = 0

            for exp_type in types:
                # Load transactions for this type
                tx_result = await self.db.execute(
                    select(ExpenseTransaction)
                    .where(*_tx_conditions(exp_type.id))
                    .order_by(ExpenseTransaction.transaction_date.desc())
                )
                transactions = tx_result.scalars().all()

                entries = [
                    ExpenseEntryRead(
                        id=tx.id,
                        amount=tx.amount,
                        description=tx.description,
                        transaction_date=tx.transaction_date,
                        payment_method=tx.payment_method,
                        vendor_name=tx.vendor_name,
                        status=tx.status,
                        reference_number=tx.reference_number,
                    )
                    for tx in transactions
                ]

                type_total = sum((e.amount for e in entries), Decimal("0"))
                type_summaries.append(
                    ExpenseTypeSummary(
                        type_id=exp_type.id,
                        type_name=exp_type.name,
                        type_description=exp_type.description,
                        entries=entries,
                        type_total=type_total,
                        entry_count=len(entries),
                    )
                )
                category_total += type_total
                category_entry_count += len(entries)

            category_summaries.append(
                ExpenseCategorySummary(
                    category_id=category.id,
                    category_name=category.name,
                    category_description=category.description,
                    types=type_summaries,
                    category_total=category_total,
                    entry_count=category_entry_count,
                )
            )
            grand_total += category_total
            total_entries += category_entry_count

        return ExpenseHierarchicalSummary(
            categories=category_summaries,
            grand_total=grand_total,
            total_entries=total_entries,
            academic_year_id=academic_year_id,
            academic_year_title=academic_year_title,
            start_date=start_date,
            end_date=end_date,
        )
