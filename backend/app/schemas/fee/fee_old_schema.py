"""
Schemas for Old Fee module.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


# ─── Create / Update ─────────────────────────────────────────────────────────

class FeeOldManualCreate(BaseModel):
    student_id: UUID
    academic_year_label: str = Field(max_length=20, description="e.g. '2024-25'")
    fee_type_name: str = Field(max_length=100)
    original_amount: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    paid_amount: Decimal = Field(ge=0, max_digits=10, decimal_places=2, default=Decimal("0.00"))
    receipt_manual: Optional[str] = Field(None, max_length=100)
    remarks: Optional[str] = Field(None, max_length=500)

    @model_validator(mode="after")
    def validate_paid_not_exceeds_original(self):
        if self.paid_amount > self.original_amount:
            raise ValueError("paid_amount cannot exceed original_amount")
        return self


class FeeOldCarryForwardRequest(BaseModel):
    student_id: UUID
    source_academic_year_id: UUID
    target_academic_year_id: UUID


class FeeOldUpdate(BaseModel):
    paid_amount: Optional[Decimal] = Field(None, ge=0, max_digits=10, decimal_places=2)
    paid_date: Optional[date] = None
    receipt_manual: Optional[str] = Field(None, max_length=100)
    remarks: Optional[str] = Field(None, max_length=500)


# ─── Read ────────────────────────────────────────────────────────────────────

class FeeOldRead(BaseModel):
    id: UUID
    student_id: UUID
    academic_year_label: str
    fee_type_name: str
    source: str
    original_amount: Decimal
    paid_amount: Decimal
    outstanding: Decimal
    paid_date: Optional[date] = None
    receipt_manual: Optional[str] = None
    receipt_system: Optional[str] = None
    is_settled: bool
    remarks: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class FeeOldSummaryResponse(BaseModel):
    student_id: UUID
    student_name: str
    items: list[FeeOldRead]
    grand_total_original: Decimal
    grand_total_paid: Decimal
    grand_total_outstanding: Decimal

    model_config = {"from_attributes": True}
