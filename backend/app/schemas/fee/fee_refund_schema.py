from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, field_validator


class FeeRefundBase(BaseModel):
    fee_transaction_id: UUID
    refund_amount: Decimal
    refund_reason: Literal["fee_adjustment", "student_withdrawal", "excess_payment", "other"]
    detailed_reason: str | None = None

    @field_validator("refund_amount")
    @classmethod
    def validate_positive_amount(cls, v):
        if v <= 0:
            raise ValueError("Refund amount must be positive")
        return v


class FeeRefundCreate(FeeRefundBase):
    student_id: UUID
    student_admission_num: str
    academic_year_id: UUID
    requested_by_user_id: UUID


class FeeRefundUpdate(BaseModel):
    status: Literal["pending", "approved", "rejected", "processed"] | None = None
    approved_by_user_id: UUID | None = None
    processed_by_user_id: UUID | None = None
    refund_method: Literal["cash", "bank_transfer", "cheque"] | None = None
    refund_reference: str | None = None
    approval_remarks: str | None = None
    processing_remarks: str | None = None


class FeeRefundRead(FeeRefundBase):
    id: UUID
    refund_number: str
    student_id: UUID
    student_admission_num: str
    academic_year_id: UUID
    status: str
    requested_by_user_id: UUID
    approved_by_user_id: UUID | None = None
    processed_by_user_id: UUID | None = None
    refund_method: str | None = None
    refund_reference: str | None = None
    approval_remarks: str | None = None
    processing_remarks: str | None = None
    requested_date: datetime
    approved_date: datetime | None = None
    processed_date: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FeeRefundSummary(BaseModel):
    """Lightweight refund summary for list views"""

    id: UUID
    refund_number: str
    student_admission_num: str
    refund_amount: Decimal
    refund_reason: str
    status: str
    requested_date: datetime

    model_config = {"from_attributes": True}


class FeeRefundApproval(BaseModel):
    """Schema for refund approval/rejection"""

    refund_id: UUID
    action: Literal["approve", "reject"]
    approval_remarks: str
    approved_by_user_id: UUID


class FeeRefundProcessing(BaseModel):
    """Schema for refund processing"""

    refund_id: UUID
    refund_method: Literal["cash", "bank_transfer", "cheque"]
    refund_reference: str | None = None
    processing_remarks: str | None = None
    processed_by_user_id: UUID


class FeeRefundMonthly(BaseModel):
    month: str
    amount: float
    count: int


class FeeRefundStatistics(BaseModel):
    total_refund_amount: float
    total_pending_refunds: int
    total_approved_refunds: int
    total_processed_refunds: int
    total_rejected_refunds: int
    refunds_by_reason: dict[str, int]
    monthly_refunds: list[FeeRefundMonthly]
