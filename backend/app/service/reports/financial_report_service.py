"""
Service for generating financial-related reports
"""

from calendar import monthrange
from datetime import date
from decimal import Decimal
import logging
from typing import Any

from sqlalchemy import asc, desc, func, select

from app.models.expense.expense_category_model import ExpenseCategory
from app.models.expense.expense_transaction_model import ExpenseTransaction
from app.models.expense.expense_type_model import ExpenseType
from app.models.fee.fee_transaction_model import FeeTransaction
from app.models.masters.staff_model import Staff
from app.models.student.student_model import Student
from app.schemas.reports.financial_report_schemas import (
    ExpenditureReportFilter,
    FinancialSummary,
    FinancialSummaryData,
    FinancialSummaryFilter,
    LedgerReportFilter,
)
from app.service.reports.base_report_service import BaseReportService

logger = logging.getLogger(__name__)


class FinancialReportService(BaseReportService):
    """Service for generating financial-related reports"""

    async def get_expenditure_report(self, filters: ExpenditureReportFilter) -> tuple[list[dict[str, Any]], int]:
        """Get expenditure report data"""
        try:
            # Base query with joins
            query = (
                select(
                    ExpenseTransaction.id,
                    ExpenseTransaction.transaction_date,
                    ExpenseTransaction.amount,
                    ExpenseTransaction.description,
                    ExpenseTransaction.receipt_number,
                    ExpenseTransaction.vendor_name,
                    ExpenseTransaction.approved_by_staff_id,
                    ExpenseTransaction.approved_at,
                    ExpenseTransaction.created_at,
                    ExpenseCategory.name.label("category_name"),
                    ExpenseType.name.label("type_name"),
                    ExpenseTransaction.department,
                    func.concat(Staff.first_name, " ", Staff.last_name).label("approved_by_name"),
                )
                .join(ExpenseCategory, ExpenseTransaction.category_id == ExpenseCategory.id)
                .join(ExpenseType, ExpenseTransaction.type_id == ExpenseType.id)
                .outerjoin(Staff, ExpenseTransaction.approved_by_staff_id == Staff.id)
                .where(ExpenseTransaction.deleted_at.is_(None))
                .where(ExpenseCategory.deleted_at.is_(None))
                .where(ExpenseType.deleted_at.is_(None))
            )

            # Apply filters
            if filters.date_from:
                query = query.where(ExpenseTransaction.transaction_date >= filters.date_from)

            if filters.date_to:
                query = query.where(ExpenseTransaction.transaction_date <= filters.date_to)

            if filters.category_id:
                query = query.where(ExpenseCategory.id == filters.category_id)

            if filters.type_id:
                query = query.where(ExpenseType.id == filters.type_id)

            if filters.amount_min:
                query = query.where(ExpenseTransaction.amount >= filters.amount_min)

            if filters.amount_max:
                query = query.where(ExpenseTransaction.amount <= filters.amount_max)

            if filters.department:
                query = query.where(ExpenseTransaction.department.ilike(f"%{filters.department}%"))

            if filters.month and filters.year:
                query = query.where(
                    func.extract("month", ExpenseTransaction.transaction_date) == filters.month,
                    func.extract("year", ExpenseTransaction.transaction_date) == filters.year,
                )

            # Get total count
            count_query = select(func.count()).select_from(query.subquery())
            total_count = await self.db.scalar(count_query)

            # Apply sorting
            if filters.sort_by:
                sort_column = getattr(ExpenseTransaction, filters.sort_by, ExpenseTransaction.transaction_date)
                if filters.sort_order.lower() == "desc":
                    query = query.order_by(desc(sort_column))
                else:
                    query = query.order_by(asc(sort_column))
            else:
                query = query.order_by(desc(ExpenseTransaction.transaction_date))

            # Apply pagination
            if filters.page and filters.page_size:
                offset = (filters.page - 1) * filters.page_size
                query = query.offset(offset).limit(filters.page_size)

            # Execute query
            result = await self.db.execute(query)
            rows = result.fetchall()

            # Format data
            data = []
            for i, row in enumerate(rows, 1):
                data.append(
                    {
                        "sl_no": i + ((filters.page - 1) * filters.page_size),
                        "transaction_id": str(row.id),
                        "date": row.transaction_date.isoformat() if row.transaction_date else None,
                        "category_name": row.category_name,
                        "type_name": row.type_name,
                        "description": row.description,
                        "amount": float(row.amount) if row.amount else 0.0,
                        "department": row.department,
                        "approved_by": row.approved_by_name,
                        "approved_at": row.approved_at.isoformat() if row.approved_at else None,
                        "receipt_number": row.receipt_number,
                        "vendor_name": row.vendor_name,
                        "created_at": row.created_at.isoformat() if row.created_at else None,
                    }
                )

            return data, total_count or 0

        except Exception as e:
            logger.error(f"Error in get_expenditure_report: {str(e)}")
            raise

    async def get_ledger_report(self, filters: LedgerReportFilter) -> tuple[list[dict[str, Any]], int]:
        """Get ledger report data combining income and expenses"""
        try:
            # Create subquery for expenses (Debit entries)
            expense_query = select(
                ExpenseTransaction.id,
                ExpenseTransaction.transaction_date.label("date"),
                func.cast("Expense", func.text("VARCHAR")).label("account_type"),
                func.cast("Debit", func.text("VARCHAR")).label("transaction_type"),
                func.cast("Expense Payment", func.text("VARCHAR")).label("reference_type"),
                func.cast(ExpenseTransaction.id, func.text("VARCHAR")).label("reference_id"),
                ExpenseTransaction.amount,
                ExpenseTransaction.description,
                ExpenseTransaction.created_at,
            ).where(ExpenseTransaction.deleted_at.is_(None))

            # Create subquery for fee collections (Credit entries)
            fee_query = (
                select(
                    FeeTransaction.id,
                    FeeTransaction.transaction_date.label("date"),
                    func.cast("Income", func.text("VARCHAR")).label("account_type"),
                    func.cast("Credit", func.text("VARCHAR")).label("transaction_type"),
                    func.cast("Fee Payment", func.text("VARCHAR")).label("reference_type"),
                    func.cast(FeeTransaction.id, func.text("VARCHAR")).label("reference_id"),
                    FeeTransaction.amount_paid.label("amount"),
                    func.concat("Fee payment for ", Student.first_name, " ", Student.last_name).label("description"),
                    FeeTransaction.created_at,
                )
                .join(Student, FeeTransaction.student_id == Student.id)
                .where(FeeTransaction.deleted_at.is_(None))
                .where(Student.deleted_at.is_(None))
            )

            # Combine both queries using UNION ALL
            combined_query = expense_query.union_all(fee_query)

            # Apply filters to combined query
            if filters.date_from or filters.date_to or filters.account_type or filters.transaction_type:
                # We need to create a new query from the combined results
                subquery = combined_query.subquery()

                query = select(
                    subquery.c.id,
                    subquery.c.date,
                    subquery.c.account_type,
                    subquery.c.transaction_type,
                    subquery.c.reference_type,
                    subquery.c.reference_id,
                    subquery.c.amount,
                    subquery.c.description,
                    subquery.c.created_at,
                ).select_from(subquery)

                if filters.date_from:
                    query = query.where(subquery.c.date >= filters.date_from)
                if filters.date_to:
                    query = query.where(subquery.c.date <= filters.date_to)
                if filters.account_type:
                    query = query.where(subquery.c.account_type == filters.account_type)
                if filters.transaction_type:
                    query = query.where(subquery.c.transaction_type == filters.transaction_type)
                if filters.amount_min:
                    query = query.where(subquery.c.amount >= filters.amount_min)
                if filters.amount_max:
                    query = query.where(subquery.c.amount <= filters.amount_max)

                if filters.month and filters.year:
                    query = query.where(
                        func.extract("month", subquery.c.date) == filters.month,
                        func.extract("year", subquery.c.date) == filters.year,
                    )
            else:
                query = combined_query

            # Get total count
            count_query = select(func.count()).select_from(query.subquery())
            total_count = await self.db.scalar(count_query)

            # Apply sorting
            if filters.sort_by and hasattr(query.selected_columns, filters.sort_by):
                if filters.sort_order.lower() == "desc":
                    query = query.order_by(desc(getattr(query.selected_columns, filters.sort_by)))
                else:
                    query = query.order_by(asc(getattr(query.selected_columns, filters.sort_by)))
            else:
                # Default sort by date descending
                query = query.order_by(desc("date"))

            # Apply pagination
            if filters.page and filters.page_size:
                offset = (filters.page - 1) * filters.page_size
                query = query.offset(offset).limit(filters.page_size)

            # Execute query
            result = await self.db.execute(query)
            rows = result.fetchall()

            # Calculate running balance and format data
            data = []
            running_balance = Decimal("0.00")

            for i, row in enumerate(rows, 1):
                # Update running balance
                if row.transaction_type == "Credit":
                    running_balance += Decimal(str(row.amount))
                else:
                    running_balance -= Decimal(str(row.amount))

                data.append(
                    {
                        "sl_no": i + ((filters.page - 1) * filters.page_size),
                        "transaction_id": str(row.id),
                        "date": row.date.isoformat() if row.date else None,
                        "account_type": row.account_type,
                        "transaction_type": row.transaction_type,
                        "reference_type": row.reference_type,
                        "reference_id": row.reference_id,
                        "amount": float(row.amount) if row.amount else 0.0,
                        "balance": float(running_balance),
                        "description": row.description,
                        "created_at": row.created_at.isoformat() if row.created_at else None,
                    }
                )

            return data, total_count or 0

        except Exception as e:
            logger.error(f"Error in get_ledger_report: {str(e)}")
            raise

    async def get_financial_summary(self, filters: FinancialSummaryFilter) -> FinancialSummary:
        """Get financial summary statistics"""
        try:
            # Calculate date range
            if filters.date_from and filters.date_to:
                date_from = filters.date_from
                date_to = filters.date_to
            elif filters.month and filters.year:
                date_from = date(filters.year, filters.month, 1)
                _, last_day = monthrange(filters.year, filters.month)
                date_to = date(filters.year, filters.month, last_day)
            else:
                # Default to current month
                today = date.today()
                date_from = date(today.year, today.month, 1)
                _, last_day = monthrange(today.year, today.month)
                date_to = date(today.year, today.month, last_day)

            # Initialize totals
            total_income = Decimal("0.00")
            total_expenses = Decimal("0.00")
            fee_collections = Decimal("0.00")
            fee_pending = Decimal("0.00")

            # Get fee collections (income)
            if filters.include_fees:
                fee_income_query = (
                    select(func.sum(FeeTransaction.amount_paid))
                    .where(FeeTransaction.deleted_at.is_(None))
                    .where(FeeTransaction.transaction_date >= date_from)
                    .where(FeeTransaction.transaction_date <= date_to)
                )
                fee_collections = await self.db.scalar(fee_income_query) or Decimal("0.00")
                total_income += fee_collections

            # Get total expenses
            if filters.include_expenses:
                expense_query = (
                    select(func.sum(ExpenseTransaction.amount))
                    .where(ExpenseTransaction.deleted_at.is_(None))
                    .where(ExpenseTransaction.transaction_date >= date_from)
                    .where(ExpenseTransaction.transaction_date <= date_to)
                )
                total_expenses = await self.db.scalar(expense_query) or Decimal("0.00")

            # Get expense breakdown by category
            expense_by_category = {}
            if filters.include_expenses:
                category_query = (
                    select(ExpenseCategory.name, func.sum(ExpenseTransaction.amount))
                    .join(ExpenseTransaction, ExpenseCategory.id == ExpenseTransaction.category_id)
                    .where(ExpenseTransaction.deleted_at.is_(None))
                    .where(ExpenseTransaction.transaction_date >= date_from)
                    .where(ExpenseTransaction.transaction_date <= date_to)
                    .group_by(ExpenseCategory.name)
                )
                category_result = await self.db.execute(category_query)
                for row in category_result.fetchall():
                    expense_by_category[row[0]] = float(row[1]) if row[1] else 0.0

            # Get expense breakdown by type
            expense_by_type = {}
            if filters.include_expenses:
                type_query = (
                    select(ExpenseType.name, func.sum(ExpenseTransaction.amount))
                    .join(ExpenseTransaction, ExpenseType.id == ExpenseTransaction.type_id)
                    .where(ExpenseTransaction.deleted_at.is_(None))
                    .where(ExpenseTransaction.transaction_date >= date_from)
                    .where(ExpenseTransaction.transaction_date <= date_to)
                    .group_by(ExpenseType.name)
                )
                type_result = await self.db.execute(type_query)
                for row in type_result.fetchall():
                    expense_by_type[row[0]] = float(row[1]) if row[1] else 0.0

            # Calculate net balance
            net_balance = total_income - total_expenses

            # Create summary data
            summary_data = FinancialSummaryData(
                period=f"{date_from} to {date_to}",
                total_income=total_income,
                total_expenses=total_expenses,
                net_balance=net_balance,
                fee_collections=fee_collections,
                fee_pending=fee_pending,  # This would need additional query for pending fees
                expense_by_category=expense_by_category,
                expense_by_type=expense_by_type,
                monthly_trends=[],  # Can be implemented later
            )

            return FinancialSummary(
                summary_data=summary_data,
                income_breakdown=[],  # Can be implemented later
                expense_breakdown=[],  # Can be implemented later
                budget_comparison=[],  # Can be implemented later
                cash_flow_trends=[],  # Can be implemented later
            )

        except Exception as e:
            logger.error(f"Error in get_financial_summary: {str(e)}")
            raise
