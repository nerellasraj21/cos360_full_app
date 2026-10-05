"""
Schemas for Fee Collection module — Student Search, Fee Summary, Fee Payment.
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

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


# ─── Terms Due ───────────────────────────────────────────────────────────────

class TermDueItem(BaseModel):
    fee_type_id: UUID
    fee_type_name: str
    term_id: UUID
    term_name: str
    term_date_id: UUID
    due_date: date
    term_amount: Decimal
    paid_amount: Decimal
    pending_amount: Decimal

    model_config = {"from_attributes": True}


class TermsDueResponse(BaseModel):
    student_id: UUID
    student_name: str
    admission_number: str
    as_of_date: date
    selected_month: str
    current_month_terms: list[TermDueItem]
    overdue_terms: list[TermDueItem]
    total_current_month_pending: Decimal
    total_overdue_pending: Decimal
    grand_total_pending: Decimal

    model_config = {"from_attributes": True}


# ─── Fee Summary SMS ─────────────────────────────────────────────────────────

class FeeSummarySmsPreview(BaseModel):
    parent_name: str
    parent_phone: Optional[str]
    student_name: str
    admission_number: str
    academic_year: str
    due_amount: Decimal
    message: str
    can_send: bool  # False if no parent phone found

    model_config = {"from_attributes": True}


class FeeSummarySmsResponse(BaseModel):
    status: str  # "sent" | "skipped" | "failed"
    detail: str

    model_config = {"from_attributes": True}


# ─── Fee History ─────────────────────────────────────────────────────────────

class FeeHistoryTransactionItem(BaseModel):
    fee_type_id: UUID
    fee_type_name: str
    amount_paid: Decimal

    model_config = {"from_attributes": True}


class FeeHistoryItem(BaseModel):
    s_no: int
    transaction_id: UUID
    transaction_number: str
    receipt_id: Optional[UUID] = None
    receipt_number: Optional[str] = None
    transaction_date: datetime
    amount_paid: Decimal
    payment_method: str
    status: str
    fee_types_paid: list[FeeHistoryTransactionItem]

    model_config = {"from_attributes": True}


class FeeHistoryResponse(BaseModel):
    student_id: UUID
    student_name: str
    admission_number: str
    academic_year: str
    total_paid: Decimal
    items: list[FeeHistoryItem]

    model_config = {"from_attributes": True}


# ─── Fee Payment ─────────────────────────────────────────────────────────────

class FeePaymentItemRequest(BaseModel):
    """One explicit fee-type allocation entered by the collector."""

    fee_type_id: UUID
    amount: Decimal = Field(gt=0, max_digits=10, decimal_places=2)


class FeePaymentRequest(BaseModel):
    student_id: UUID
    academic_year_id: UUID
    amount_to_pay: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    # When supplied, the payment is allocated ONLY to these fee types.
    # When omitted, legacy top-down auto-distribution is used (unchanged).
    fee_items: Optional[List[FeePaymentItemRequest]] = None
    payment_method: PaymentMethod
    upi_reference: Optional[str] = Field(None, max_length=30)
    bank_reference: Optional[str] = Field(None, max_length=30)
    cheque_number: Optional[str] = Field(None, max_length=20)
    cheque_bank: Optional[str] = Field(None, max_length=100)
    cheque_date: Optional[date] = None
    send_sms: bool = True
    print_duplicate: bool = False
    remarks: Optional[str] = None
    idempotency_key: Optional[str] = Field(None, min_length=1, max_length=64)

    @model_validator(mode="after")
    def validate_fee_items(self):
        if self.fee_items is not None:
            if not self.fee_items:
                raise ValueError("fee_items cannot be an empty list; omit it to auto-distribute")

            seen: set = set()
            for it in self.fee_items:
                if it.fee_type_id in seen:
                    raise ValueError(f"Duplicate fee_type_id in fee_items: {it.fee_type_id}")
                seen.add(it.fee_type_id)

            items_total = sum((it.amount for it in self.fee_items), Decimal("0.00"))
            if items_total != self.amount_to_pay:
                raise ValueError(
                    f"Sum of fee_items ({items_total}) must equal amount_to_pay ({self.amount_to_pay})"
                )
        return self

    @model_validator(mode="after")
    def validate_conditional_fields(self):
        mode = self.payment_method

        # FR-307: UPI reference required when mode=upi
        if mode == PaymentMethod.UPI and not self.upi_reference:
            raise ValueError("upi_reference is required when payment_method is 'upi'")

        # FR-308: Bank reference required when mode=bank_transfer
        if mode == PaymentMethod.BANK_TRANSFER and not self.bank_reference:
            raise ValueError("bank_reference is required when payment_method is 'bank_transfer'")

        # FR-306: Cheque/DD fields required when mode=cheque or dd
        if mode in (PaymentMethod.CHEQUE, PaymentMethod.DD):
            if not self.cheque_number:
                raise ValueError("cheque_number is required when payment_method is 'cheque' or 'dd'")
            if not self.cheque_bank:
                raise ValueError("cheque_bank (bank name) is required when payment_method is 'cheque' or 'dd'")
            if not self.cheque_date:
                raise ValueError("cheque_date is required when payment_method is 'cheque' or 'dd'")

        # FR-315: Cheque/DD date must not be more than 90 days in the future
        if self.cheque_date:
            max_future = date.today() + timedelta(days=90)
            if self.cheque_date > max_future:
                raise ValueError("cheque_date cannot be more than 90 days in the future")

        return self


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
