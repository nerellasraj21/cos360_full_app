from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import desc, func, literal_column, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.expense import ExpenseCategory, ExpenseTransaction, ExpenseType
from app.schemas.expense.expense_report_schema import (
    CategorySummary,
    ExpenseCategoryReport,
    ExpenseReportFilter,
    ExpenseReportSummary,
    ExpenseTrendReport,
    ExpenseTypeReport,
    MonthlyTrend,
    TypeSummary,
)

from .base_expense_service import BaseExpenseService


class ExpenseReportingService(BaseExpenseService):
    """Service for generating expense reports and analytics"""

    def __init__(self, db: AsyncSession):
        super().__init__(db)

    async def generate_category_report(
        self,
        filters: ExpenseReportFilter,
        user_department_id: UUID | None = None,
        user_role: str = "user",
        username: str = "system",
    ) -> ExpenseCategoryReport:
        """Generate category-based expense report"""

        # Build base query with filters
        self._build_base_query(filters, user_department_id, user_role)

        # Get category summary data
        category_query = (
            select(
                ExpenseCategory.id,
                ExpenseCategory.name,
                func.sum(ExpenseTransaction.amount).label("total_amount"),
                func.count(ExpenseTransaction.id).label("transaction_count"),
                func.avg(ExpenseTransaction.amount).label("average_amount"),
            )
            .select_from(ExpenseTransaction)
            .join(ExpenseType, ExpenseTransaction.expense_type_id == ExpenseType.id)
            .join(ExpenseCategory, ExpenseType.category_id == ExpenseCategory.id)
            .group_by(ExpenseCategory.id, ExpenseCategory.name)
            .order_by(desc("total_amount"))
        )

        # Apply same filters to category query
        category_query = self._apply_filters_to_query(category_query, filters, user_department_id, user_role)

        # Get total for percentage calculation
        total_query = select(func.sum(ExpenseTransaction.amount)).select_from(
            self._apply_filters_to_query(select(ExpenseTransaction), filters, user_department_id, user_role).subquery()
        )

        # Execute queries
        category_result = await self.db.execute(category_query)
        total_result = await self.db.execute(total_query)

        categories_data = category_result.all()
        total_amount = total_result.scalar() or Decimal("0")

        # Build category summaries
        categories = []
        for cat_data in categories_data:
            percentage = (cat_data.total_amount / total_amount * 100) if total_amount > 0 else Decimal("0")

            categories.append(
                CategorySummary(
                    category_id=cat_data.id,
                    category_name=cat_data.name,
                    total_amount=cat_data.total_amount,
                    transaction_count=cat_data.transaction_count,
                    average_amount=cat_data.average_amount,
                    percentage_of_total=percentage.quantize(Decimal("0.01")),
                )
            )

        # Generate report summary
        summary = await self._generate_report_summary(
            filters, total_amount, sum(c.transaction_count for c in categories)
        )

        return ExpenseCategoryReport(summary=summary, categories=categories, generated_by=username)

    async def generate_type_report(
        self,
        filters: ExpenseReportFilter,
        user_department_id: UUID | None = None,
        user_role: str = "user",
        username: str = "system",
    ) -> ExpenseTypeReport:
        """Generate type-based expense report"""

        # Build type summary query
        type_query = (
            select(
                ExpenseType.id,
                ExpenseType.name,
                ExpenseCategory.name.label("category_name"),
                func.sum(ExpenseTransaction.amount).label("total_amount"),
                func.count(ExpenseTransaction.id).label("transaction_count"),
                func.avg(ExpenseTransaction.amount).label("average_amount"),
            )
            .select_from(ExpenseTransaction)
            .join(ExpenseType, ExpenseTransaction.expense_type_id == ExpenseType.id)
            .join(ExpenseCategory, ExpenseType.category_id == ExpenseCategory.id)
            .group_by(ExpenseType.id, ExpenseType.name, ExpenseCategory.name)
            .order_by(desc("total_amount"))
        )

        # Apply filters
        type_query = self._apply_filters_to_query(type_query, filters, user_department_id, user_role)

        # Get total amount
        total_query = select(func.sum(ExpenseTransaction.amount)).select_from(
            self._apply_filters_to_query(select(ExpenseTransaction), filters, user_department_id, user_role).subquery()
        )

        # Execute queries
        type_result = await self.db.execute(type_query)
        total_result = await self.db.execute(total_query)

        types_data = type_result.all()
        total_amount = total_result.scalar() or Decimal("0")

        # Build type summaries
        types = []
        for type_data in types_data:
            types.append(
                TypeSummary(
                    type_id=type_data.id,
                    type_name=type_data.name,
                    category_name=type_data.category_name,
                    total_amount=type_data.total_amount,
                    transaction_count=type_data.transaction_count,
                    average_amount=type_data.average_amount,
                )
            )

        # Generate report summary
        summary = await self._generate_report_summary(filters, total_amount, sum(t.transaction_count for t in types))

        return ExpenseTypeReport(summary=summary, types=types, generated_by=username)

    async def generate_trend_report(
        self,
        filters: ExpenseReportFilter,
        user_department_id: UUID | None = None,
        user_role: str = "user",
        username: str = "system",
    ) -> ExpenseTrendReport:
        """Generate time-based trend report"""

        # Build monthly trend query
        month = func.date_trunc(literal_column("'month'"), ExpenseTransaction.transaction_date)
        trend_query = (
            select(
                month.label("month"),
                func.sum(ExpenseTransaction.amount).label("total_amount"),
                func.count(ExpenseTransaction.id).label("transaction_count"),
                func.avg(ExpenseTransaction.amount).label("average_per_transaction"),
            )
            .select_from(ExpenseTransaction)
            .join(ExpenseType, ExpenseTransaction.expense_type_id == ExpenseType.id)
            .group_by(month)
            .order_by(month)
        )

        # Apply filters
        trend_query = self._apply_filters_to_query(trend_query, filters, user_department_id, user_role)

        # Execute query
        trend_result = await self.db.execute(trend_query)
        trends_data = trend_result.all()

        # Build monthly trends
        monthly_trends = []
        total_amount = Decimal("0")
        total_transactions = 0

        for trend_data in trends_data:
            month_str = trend_data.month.strftime("%Y-%m")
            monthly_trends.append(
                MonthlyTrend(
                    month=month_str,
                    total_amount=trend_data.total_amount,
                    transaction_count=trend_data.transaction_count,
                    average_per_transaction=trend_data.average_per_transaction,
                )
            )
            total_amount += trend_data.total_amount
            total_transactions += trend_data.transaction_count

        # Generate report summary
        summary = await self._generate_report_summary(filters, total_amount, total_transactions)

        return ExpenseTrendReport(summary=summary, monthly_trends=monthly_trends, generated_by=username)

    def _build_base_query(
        self, filters: ExpenseReportFilter, user_department_id: UUID | None = None, user_role: str = "user"
    ):
        """Build base query with common joins"""

        query = select(ExpenseTransaction).options(
            joinedload(ExpenseTransaction.expense_type).joinedload(ExpenseType.category)
        )

        return query

    def _apply_filters_to_query(
        self, query, filters: ExpenseReportFilter, user_department_id: UUID | None = None, user_role: str = "user"
    ):
        """Apply filters to any query"""

        # Date filters
        if filters.start_date:
            query = query.where(ExpenseTransaction.transaction_date >= filters.start_date)
        if filters.end_date:
            query = query.where(ExpenseTransaction.transaction_date <= filters.end_date)

        # Category filters
        if filters.category_ids:
            query = query.where(ExpenseType.category_id.in_(filters.category_ids))

        # Type filters
        if filters.type_ids:
            query = query.where(ExpenseTransaction.expense_type_id.in_(filters.type_ids))

        # Status filter
        if filters.status_filter:
            query = query.where(ExpenseTransaction.status == filters.status_filter)

        # Amount filters
        if filters.min_amount:
            query = query.where(ExpenseTransaction.amount >= filters.min_amount)
        if filters.max_amount:
            query = query.where(ExpenseTransaction.amount <= filters.max_amount)

        # Creator filter
        if filters.created_by_user_id:
            query = query.where(ExpenseTransaction.created_by_user_id == filters.created_by_user_id)

        # Department scoping
        if filters.department_id:
            query = query.where(ExpenseTransaction.department_id == filters.department_id)
        elif user_role.lower() not in ["super_admin", "tenant_admin", "admin"]:
            # Apply department scoping for non-admin users
            if user_department_id:
                query = query.where(
                    or_(
                        ExpenseTransaction.department_id == user_department_id,
                        ExpenseTransaction.department_id.is_(None),
                    )
                )
            else:
                query = query.where(ExpenseTransaction.department_id.is_(None))

        return query

    async def _generate_report_summary(
        self, filters: ExpenseReportFilter, total_amount: Decimal, total_transactions: int
    ) -> ExpenseReportSummary:
        """Generate report summary information"""

        # Determine period
        period = "Custom"
        start_date = filters.start_date or date.today().replace(day=1)
        end_date = filters.end_date or date.today()

        if filters.start_date and filters.end_date:
            period = f"Custom ({filters.start_date} to {filters.end_date})"

        # Calculate averages
        avg_transaction = total_amount / total_transactions if total_transactions > 0 else Decimal("0")

        return ExpenseReportSummary(
            report_period=period,
            start_date=start_date,
            end_date=end_date,
            total_amount=total_amount,
            total_transactions=total_transactions,
            average_transaction=avg_transaction.quantize(Decimal("0.01")),
            categories_count=0,  # TODO: Calculate actual counts
            departments_count=0,  # TODO: Calculate actual counts
        )
