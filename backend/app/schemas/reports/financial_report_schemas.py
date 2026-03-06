"""
Pydantic schemas for financial reports
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class ExpenditureReportFilter(BaseModel):
    """Filter for expenditure reports"""

    date_from: date | None = None
    date_to: date | None = None
    category_id: UUID | None = None
    type_id: UUID | None = None
    amount_min: Decimal | None = None
    amount_max: Decimal | None = None
    department: str | None = None
    month: int | None = None
    year: int | None = None
    page: int = 1
    page_size: int = 100
    sort_by: str | None = None
    sort_order: str = "asc"


class LedgerReportFilter(BaseModel):
    """Filter for ledger reports"""

    date_from: date | None = None
    date_to: date | None = None
    account_type: str | None = None
    transaction_type: str | None = None
    reference_type: str | None = None
    amount_min: Decimal | None = None
    amount_max: Decimal | None = None
    month: int | None = None
    year: int | None = None
    page: int = 1
    page_size: int = 100
    sort_by: str | None = None
    sort_order: str = "asc"


class FinancialSummaryFilter(BaseModel):
    """Filter for financial summary reports"""

    date_from: date | None = None
    date_to: date | None = None
    period_type: str = "monthly"  # monthly, quarterly, yearly
    include_fees: bool = True
    include_expenses: bool = True
    month: int | None = None
    year: int | None = None


class ExpenditureData(BaseModel):
    """Expenditure report data"""

    sl_no: int
    transaction_id: str
    date: date
    category_name: str
    type_name: str
    description: str
    amount: Decimal
    department: str | None = None
    approved_by: str | None = None
    approved_at: datetime | None = None
    receipt_number: str | None = None
    vendor_name: str | None = None
    created_at: datetime


class LedgerData(BaseModel):
    """Ledger report data"""

    sl_no: int
    transaction_id: str
    date: date
    account_type: str
    transaction_type: str  # Credit, Debit
    reference_type: str  # Fee Payment, Expense, Refund
    reference_id: str | None = None
    amount: Decimal
    balance: Decimal | None = None
    description: str
    created_at: datetime


class FinancialSummaryData(BaseModel):
    """Financial summary statistics"""

    period: str
    total_income: Decimal = Decimal("0.00")
    total_expenses: Decimal = Decimal("0.00")
    net_balance: Decimal = Decimal("0.00")
    fee_collections: Decimal = Decimal("0.00")
    fee_pending: Decimal = Decimal("0.00")
    expense_by_category: dict[str, Decimal] = {}
    expense_by_type: dict[str, Decimal] = {}
    monthly_trends: list[dict[str, Any]] = []


class FinancialSummary(BaseModel):
    """Financial summary response"""

    summary_data: FinancialSummaryData
    income_breakdown: list[dict[str, Any]] = []
    expense_breakdown: list[dict[str, Any]] = []
    budget_comparison: list[dict[str, Any]] = []
    cash_flow_trends: list[dict[str, Any]] = []


class FinancialComparisonFilter(BaseModel):
    """Filter for financial comparison reports"""

    compare_type: str = "monthly"  # monthly, yearly, category_wise
    period_from: date | None = None
    period_to: date | None = None
    categories: list[UUID] | None = None
    year: int | None = None


class FinancialComparisonData(BaseModel):
    """Financial comparison data"""

    period: str
    entity_name: str  # Category name, month name, etc.
    income_amount: Decimal
    expense_amount: Decimal
    net_amount: Decimal
    percentage_change: float | None = None
    comparison_data: dict[str, Any] = {}
