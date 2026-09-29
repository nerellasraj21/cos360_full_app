"""
Schemas for fee-related reports
"""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class FeeCollectionSummaryFilter(BaseModel):
    """Filters for Fee Collection Summary Report"""

    academic_year_id: UUID | None = None
    fee_category_id: UUID | None = None
    fee_type_id: UUID | None = None
    payment_method: str | None = None  # cash, upi, cheque, bank_transfer
    status: str | None = None  # pending, completed, cancelled, bounced
    date_from: datetime | None = None
    date_to: datetime | None = None
    class_id: UUID | None = None
    section_id: UUID | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=100, ge=1, le=1000)
    sort_by: str | None = None
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$")


class FeeCollectionSummaryData(BaseModel):
    """Fee Collection Summary Report data model"""

    sl_no: int
    transaction_number: str
    student_admission_no: str
    student_name: str
    class_section: str
    fee_category: str
    fee_type: str
    fee_term: str
    amount_due: Decimal
    amount_paid: Decimal
    payment_method: str
    payment_status: str
    transaction_date: datetime
    collected_by: str


class PendingFeesFilter(BaseModel):
    """Filters for Pending Fees Report"""

    academic_year_id: UUID | None = None
    fee_category_id: UUID | None = None
    fee_type_id: UUID | None = None
    fee_term_id: UUID | None = None
    class_id: UUID | None = None
    section_id: UUID | None = None
    days_overdue: int | None = None  # Filter by days overdue
    amount_min: Decimal | None = None
    amount_max: Decimal | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=100, ge=1, le=1000)
    sort_by: str | None = None
    sort_order: str = Field(default="asc", pattern="^(asc|desc)$")


class PendingFeesData(BaseModel):
    """Pending Fees Report data model"""

    sl_no: int
    student_admission_no: str
    student_name: str
    class_section: str
    fee_category: str
    fee_type: str
    fee_term: str
    amount_due: Decimal
    amount_paid: Decimal
    balance_amount: Decimal
    due_date: datetime | None
    days_overdue: int | None


class FeeStructureFilter(BaseModel):
    """Filters for Fee Structure Report"""

    academic_year_id: UUID | None = None
    fee_category_id: UUID | None = None
    fee_type_id: UUID | None = None
    class_id: UUID | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=100, ge=1, le=1000)
    sort_by: str | None = None
    sort_order: str = Field(default="asc", pattern="^(asc|desc)$")


class FeeStructureData(BaseModel):
    """Fee Structure Report data model"""

    sl_no: int
    fee_category: str
    fee_type: str
    fee_term: str
    class_name: str
    section_name: str | None
    fee_amount: Decimal
    academic_year: str
    status: str


class FeeCollectionSummary(BaseModel):
    """Fee collection summary statistics"""

    total_collected: Decimal
    total_due: Decimal
    collection_percentage: float
    payment_methods: dict[str, Decimal]  # payment_method -> amount
    fee_categories: dict[str, Decimal]  # category -> amount
    monthly_collection: dict[str, Decimal]  # month -> amount


class PendingFeesSummary(BaseModel):
    """Pending fees summary statistics"""

    total_pending_amount: Decimal
    total_overdue_amount: Decimal
    total_students_with_pending: int
    total_students_overdue: int
    average_overdue_days: float
    fee_categories_pending: dict[str, Decimal]  # category -> amount
    class_wise_pending: dict[str, Decimal]  # class -> amount


class FeeStructureSummary(BaseModel):
    """Fee structure summary statistics"""

    total_fee_types: int
    total_categories: int
    total_terms: int
    average_fee_amount: Decimal
    fee_range: dict[str, Decimal]  # min, max
    category_wise_breakdown: dict[str, int]  # category -> count
