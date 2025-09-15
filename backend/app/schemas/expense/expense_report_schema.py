from datetime import datetime, date
from typing import Optional, List, Dict, Any
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field
from enum import Enum


class ReportPeriod(str, Enum):
    """Report period options"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    CUSTOM = "custom"


class ExportFormat(str, Enum):
    """Export format options"""
    CSV = "csv"
    EXCEL = "excel"
    PDF = "pdf"
    JSON = "json"


class ExpenseReportFilter(BaseModel):
    """Base filter for expense reports"""
    start_date: Optional[date] = Field(None, description="Start date for report")
    end_date: Optional[date] = Field(None, description="End date for report")
    category_ids: Optional[List[UUID]] = Field(None, description="Filter by category IDs")
    type_ids: Optional[List[UUID]] = Field(None, description="Filter by expense type IDs")
    status_filter: Optional[str] = Field(None, description="Filter by transaction status")
    department_id: Optional[UUID] = Field(None, description="Filter by department ID")
    min_amount: Optional[Decimal] = Field(None, ge=0, description="Minimum amount filter")
    max_amount: Optional[Decimal] = Field(None, ge=0, description="Maximum amount filter")
    created_by_user_id: Optional[UUID] = Field(None, description="Filter by creator")


class CategorySummary(BaseModel):
    """Category-wise expense summary"""
    category_id: UUID = Field(..., description="Category ID")
    category_name: str = Field(..., description="Category name")
    total_amount: Decimal = Field(..., description="Total amount in category")
    transaction_count: int = Field(..., description="Number of transactions")
    average_amount: Decimal = Field(..., description="Average transaction amount")
    percentage_of_total: Decimal = Field(..., description="Percentage of total expenses")

    model_config = ConfigDict(from_attributes=True)


class TypeSummary(BaseModel):
    """Type-wise expense summary"""
    type_id: UUID = Field(..., description="Type ID")
    type_name: str = Field(..., description="Type name")
    category_name: str = Field(..., description="Category name")
    total_amount: Decimal = Field(..., description="Total amount for type")
    transaction_count: int = Field(..., description="Number of transactions")
    average_amount: Decimal = Field(..., description="Average transaction amount")

    model_config = ConfigDict(from_attributes=True)


class DepartmentSummary(BaseModel):
    """Department-wise expense summary"""
    department_id: Optional[UUID] = Field(None, description="Department ID")
    department_name: str = Field(..., description="Department name")
    total_amount: Decimal = Field(..., description="Total amount for department")
    transaction_count: int = Field(..., description="Number of transactions")
    percentage_of_total: Decimal = Field(..., description="Percentage of total expenses")

    model_config = ConfigDict(from_attributes=True)


class MonthlyTrend(BaseModel):
    """Monthly expense trend data"""
    month: str = Field(..., description="Month in YYYY-MM format")
    total_amount: Decimal = Field(..., description="Total expenses for month")
    transaction_count: int = Field(..., description="Number of transactions")
    average_per_transaction: Decimal = Field(..., description="Average per transaction")

    model_config = ConfigDict(from_attributes=True)


class ExpenseReportSummary(BaseModel):
    """Overall expense report summary"""
    report_period: str = Field(..., description="Report period")
    start_date: date = Field(..., description="Report start date")
    end_date: date = Field(..., description="Report end date")
    total_amount: Decimal = Field(..., description="Total expenses")
    total_transactions: int = Field(..., description="Total transaction count")
    average_transaction: Decimal = Field(..., description="Average transaction amount")
    categories_count: int = Field(..., description="Number of categories with expenses")
    departments_count: int = Field(..., description="Number of departments with expenses")

    model_config = ConfigDict(from_attributes=True)


class ExpenseCategoryReport(BaseModel):
    """Category-based expense report"""
    summary: ExpenseReportSummary = Field(..., description="Report summary")
    categories: List[CategorySummary] = Field(..., description="Category breakdown")
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="Report generation time")
    generated_by: str = Field(..., description="User who generated report")

    model_config = ConfigDict(from_attributes=True)


class ExpenseTypeReport(BaseModel):
    """Type-based expense report"""
    summary: ExpenseReportSummary = Field(..., description="Report summary")
    types: List[TypeSummary] = Field(..., description="Type breakdown")
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="Report generation time")
    generated_by: str = Field(..., description="User who generated report")

    model_config = ConfigDict(from_attributes=True)


class ExpenseDepartmentReport(BaseModel):
    """Department-based expense report"""
    summary: ExpenseReportSummary = Field(..., description="Report summary")
    departments: List[DepartmentSummary] = Field(..., description="Department breakdown")
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="Report generation time")
    generated_by: str = Field(..., description="User who generated report")

    model_config = ConfigDict(from_attributes=True)


class ExpenseTrendReport(BaseModel):
    """Time-based trend report"""
    summary: ExpenseReportSummary = Field(..., description="Report summary")
    monthly_trends: List[MonthlyTrend] = Field(..., description="Monthly trend data")
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="Report generation time")
    generated_by: str = Field(..., description="User who generated report")

    model_config = ConfigDict(from_attributes=True)


class ExpenseReportExport(BaseModel):
    """Export request for expense reports"""
    report_type: str = Field(..., description="Type of report: category, type, department, trend")
    export_format: ExportFormat = Field(..., description="Export format")
    filters: ExpenseReportFilter = Field(..., description="Report filters")
    include_details: bool = Field(False, description="Include transaction details")

    model_config = ConfigDict(from_attributes=True)


class ExpenseReportExportResponse(BaseModel):
    """Export response with download info"""
    export_id: UUID = Field(..., description="Export job ID")
    report_type: str = Field(..., description="Report type")
    export_format: str = Field(..., description="Export format")
    status: str = Field(..., description="Export status: pending, processing, completed, failed")
    file_url: Optional[str] = Field(None, description="Download URL when ready")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    expires_at: Optional[datetime] = Field(None, description="URL expiration time")
    generated_at: datetime = Field(..., description="Export generation time")

    model_config = ConfigDict(from_attributes=True)