from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ExpenseEntryRead(BaseModel):
    """A single expense transaction entry inside a type."""

    id: UUID
    amount: Decimal
    description: str
    transaction_date: date
    payment_method: str
    vendor_name: str | None = None
    status: str
    reference_number: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ExpenseTypeSummary(BaseModel):
    """An expense type (sub-section) with all its entries and subtotal."""

    type_id: UUID
    type_name: str
    type_description: str | None = None
    entries: list[ExpenseEntryRead] = Field(default_factory=list)
    type_total: Decimal = Decimal("0")
    entry_count: int = 0


class ExpenseCategorySummary(BaseModel):
    """An expense category with all its types and total."""

    category_id: UUID
    category_name: str
    category_description: str | None = None
    types: list[ExpenseTypeSummary] = Field(default_factory=list)
    category_total: Decimal = Decimal("0")
    entry_count: int = 0


class ExpenseHierarchicalSummary(BaseModel):
    """Full hierarchical breakdown: categories → types → entries → totals."""

    categories: list[ExpenseCategorySummary] = Field(default_factory=list)
    grand_total: Decimal = Decimal("0")
    total_entries: int = 0
    academic_year_id: UUID | None = None
    academic_year_title: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    generated_at: datetime = Field(default_factory=datetime.utcnow)
