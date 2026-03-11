"""
Schemas for Fee Collection module — Student Search, Fee Summary, Fee Payment.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.fee.enums import PaymentMethod


# ─── Student Search ──────────────────────────────────────────────────────────

class StudentSearchResult(BaseModel):
    student_id: UUID
    admission_number: str
    first_name: str
    last_name: str
    class_id: UUID
    class_name: str
    section_id: Optional[UUID] = None
    section_name: Optional[str] = None
    parent_name: Optional[str] = None
    mobile_number: Optional[str] = None
    photo_url: Optional[str] = None

    model_config = {"from_attributes": True}


# ─── Fee Summary ─────────────────────────────────────────────────────────────

class FeeSummaryItem(BaseModel):
    s_no: int
    fee_type_id: UUID
    fee_type_name: str
    assigned_fee: Decimal
    fee_after_concession: Decimal
    paid_amount: Decimal
    due_amount: Decimal
    last_paid_date: Optional[datetime] = None
    last_receipt_number: Optional[str] = None
    remarks: Optional[str] = None

    model_config = {"from_attributes": True}


class FeeSummaryResponse(BaseModel):
    student_id: UUID
    student_name: str
    admission_number: str
    class_name: str
    section_name: str
    academic_year: str
    as_of_date: date
    items: list[FeeSummaryItem]
    grand_total_assigned: Decimal
    grand_total_fee: Decimal
    grand_total_paid: Decimal
    grand_total_due: Decimal
    old_fee_pending_amount: Decimal = Decimal("0.00")

    model_config = {"from_attributes": True}


# ─── Fee Payment ─────────────────────────────────────────────────────────────

class FeePaymentRequest(BaseModel):
    student_id: UUID
    academic_year_id: UUID
    amount_to_pay: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    payment_method: PaymentMethod
    upi_reference: Optional[str] = None
    bank_reference: Optional[str] = None
    cheque_number: Optional[str] = None
    cheque_bank: Optional[str] = None
    cheque_date: Optional[date] = None
    send_sms: bool = True
    print_duplicate: bool = False
    remarks: Optional[str] = None


class FeePaymentItemPaid(BaseModel):
    fee_type_id: UUID
    fee_type_name: str
    amount_paid: Decimal

    model_config = {"from_attributes": True}


class FeePaymentResponse(BaseModel):
    transaction_id: UUID
    transaction_number: str
    receipt_id: UUID
    receipt_number: str
    amount_paid: Decimal
    payment_method: str
    sms_status: str  # "sent" | "failed" | "skipped"
    items_paid: list[FeePaymentItemPaid]

    model_config = {"from_attributes": True}
