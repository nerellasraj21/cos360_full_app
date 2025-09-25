"""
Pydantic schemas for financial reports
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal


class ExpenditureReportFilter(BaseModel):
    """Filter for expenditure reports"""
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    category_id: Optional[UUID] = None
    type_id: Optional[UUID] = None
    amount_min: Optional[Decimal] = None
    amount_max: Optional[Decimal] = None
    department: Optional[str] = None
    month: Optional[int] = None
    year: Optional[int] = None
    page: int = 1
    page_size: int = 100
    sort_by: Optional[str] = None
    sort_order: str = "asc"


class LedgerReportFilter(BaseModel):
    """Filter for ledger reports"""
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    account_type: Optional[str] = None
    transaction_type: Optional[str] = None
    reference_type: Optional[str] = None
    amount_min: Optional[Decimal] = None
    amount_max: Optional[Decimal] = None
    month: Optional[int] = None
    year: Optional[int] = None
    page: int = 1
    page_size: int = 100
    sort_by: Optional[str] = None
    sort_order: str = "asc"


class FinancialSummaryFilter(BaseModel):
    """Filter for financial summary reports"""
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    period_type: str = "monthly"  # monthly, quarterly, yearly
    include_fees: bool = True
    include_expenses: bool = True
    month: Optional[int] = None
    year: Optional[int] = None


class ExpenditureData(BaseModel):
    """Expenditure report data"""
    sl_no: int
    transaction_id: str
    date: date
    category_name: str
    type_name: str
    description: str
    amount: Decimal
    department: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    receipt_number: Optional[str] = None
    vendor_name: Optional[str] = None
    created_at: datetime


class LedgerData(BaseModel):
    """Ledger report data"""
    sl_no: int
    transaction_id: str
    date: date
    account_type: str
    transaction_type: str  # Credit, Debit
    reference_type: str  # Fee Payment, Expense, Refund
    reference_id: Optional[str] = None
    amount: Decimal
    balance: Optional[Decimal] = None
    description: str
    created_at: datetime


class FinancialSummaryData(BaseModel):
    """Financial summary statistics"""
    period: str
    total_income: Decimal = Decimal('0.00')
    total_expenses: Decimal = Decimal('0.00')
    net_balance: Decimal = Decimal('0.00')
    fee_collections: Decimal = Decimal('0.00')
    fee_pending: Decimal = Decimal('0.00')
    expense_by_category: Dict[str, Decimal] = {}
    expense_by_type: Dict[str, Decimal] = {}
    monthly_trends: List[Dict[str, Any]] = []


class FinancialSummary(BaseModel):
    """Financial summary response"""
    summary_data: FinancialSummaryData
    income_breakdown: List[Dict[str, Any]] = []
    expense_breakdown: List[Dict[str, Any]] = []
    budget_comparison: List[Dict[str, Any]] = []
    cash_flow_trends: List[Dict[str, Any]] = []


class FinancialComparisonFilter(BaseModel):
    """Filter for financial comparison reports"""
    compare_type: str = "monthly"  # monthly, yearly, category_wise
    period_from: Optional[date] = None
    period_to: Optional[date] = None
    categories: Optional[List[UUID]] = None
    year: Optional[int] = None


class FinancialComparisonData(BaseModel):
    """Financial comparison data"""
    period: str
    entity_name: str  # Category name, month name, etc.
    income_amount: Decimal
    expense_amount: Decimal
    net_amount: Decimal
    percentage_change: Optional[float] = None
    comparison_data: Dict[str, Any] = {}