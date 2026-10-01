from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, field_validator, model_validator


class FeeTransactionItemBase(BaseModel):
    fee_type_id: UUID
    term_date_id: UUID  # Changed from fee_term_id to term_date_id
    amount_due: Decimal
    amount_paid: Decimal
    description: str | None = None

    @field_validator("amount_due", "amount_paid")
    @classmethod
    def validate_positive_amounts(cls, v):
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v

    @model_validator(mode="after")
    def validate_payment_amount(self):
        if self.amount_paid > self.amount_due:
            raise ValueError("Amount paid cannot exceed amount due")
        return self


class FeeTransactionItemCreate(FeeTransactionItemBase):
    pass


class FeeTransactionItemRead(BaseModel):
    id: UUID
    fee_transaction_id: UUID
    fee_type_id: UUID
    term_date_id: UUID
    amount_due: Decimal
    amount_paid: Decimal
    description: str | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class FeeTransactionBase(BaseModel):
    student_id: UUID
    student_admission_num: str
    academic_year_id: UUID
    total_amount: Decimal
    payment_method: Literal["cash", "upi", "cheque", "bank_transfer"]

    # Payment method specific fields
    upi_reference: str | None = None
    upi_app_name: str | None = None
    cheque_number: str | None = None
    cheque_date: datetime | None = None
    cheque_bank: str | None = None
    bank_reference: str | None = None
    bank_name: str | None = None

    remarks: str | None = None

    @field_validator("total_amount")
    @classmethod
    def validate_positive_amount(cls, v):
        if v <= 0:
            raise ValueError("Total amount must be positive")
        return v

    @model_validator(mode="after")
    def validate_payment_method_fields(self):
        if self.payment_method == "upi":
            if not self.upi_reference:
                raise ValueError("UPI reference is required for UPI payments")
        elif self.payment_method == "cheque":
            if not self.cheque_number or not self.cheque_date or not self.cheque_bank:
                raise ValueError("Cheque number, date, and bank are required for cheque payments")
        elif self.payment_method == "bank_transfer":
            if not self.bank_reference or not self.bank_name:
                raise ValueError("Bank reference and bank name are required for bank transfers")
        return self


class FeeTransactionCreate(FeeTransactionBase):
    transaction_items: list[FeeTransactionItemCreate]

    @field_validator("transaction_items")
    @classmethod
    def validate_transaction_items(cls, v):
        if not v:
            raise ValueError("At least one transaction item is required")
        return v

    @model_validator(mode="after")
    def validate_total_amount_matches_items(self):
        total_items_amount = sum(item.amount_paid for item in self.transaction_items)
        if abs(self.total_amount - total_items_amount) > 0.01:  # Allow for minor rounding differences
            raise ValueError(
                f"Total amount ({self.total_amount}) must match sum of transaction items ({total_items_amount})"
            )
        return self


class FeeTransactionUpdate(BaseModel):
    status: Literal["pending", "completed", "cancelled", "bounced"] | None = None
    cheque_status: Literal["pending", "cleared", "bounced"] | None = None
    approved_by_user_id: UUID | None = None
    remarks: str | None = None


class FeeTransactionRead(BaseModel):
    id: UUID
    transaction_number: str
    student_id: UUID
    student_admission_num: str
    academic_year_id: UUID
    total_amount: Decimal
    payment_method: str
    status: str

    upi_reference: str | None = None
    upi_app_name: str | None = None
    cheque_number: str | None = None
    cheque_date: datetime | None = None
    cheque_bank: str | None = None
    cheque_status: str | None = None
    bank_reference: str | None = None
    bank_name: str | None = None

    remarks: str | None = None
    collected_by_user_id: UUID
    approved_by_user_id: UUID | None = None
    receipt_generated: bool
    receipt_hash: str | None = None
    transaction_date: datetime
    created_at: datetime
    updated_at: datetime

    student_first_name: str | None = None
    student_last_name: str | None = None
    student_full_name: str | None = None

    receipt_number: str | None = None

    transaction_items: list[FeeTransactionItemRead] = []

    model_config = {"from_attributes": True}


class FeeTransactionSummary(BaseModel):
    """Lightweight transaction summary for list views"""

    id: UUID
    transaction_number: str
    student_id: UUID
    student_admission_num: str
    student_first_name: str | None = None
    student_last_name: str | None = None
    student_full_name: str | None = None
    total_amount: Decimal
    payment_method: str
    status: str
    transaction_date: datetime
    receipt_generated: bool

    model_config = {"from_attributes": True}


# Outstanding Fee Calculation Schemas
class OutstandingFeeItem(BaseModel):
    fee_type_id: UUID
    fee_type_name: str
    fee_term_id: UUID
    fee_term_name: str
    amount_due: Decimal
    amount_paid: Decimal
    outstanding_amount: Decimal


class OutstandingFeeSummary(BaseModel):
    student_id: UUID
    student_admission_num: str
    academic_year_id: UUID
    total_outstanding: Decimal
    outstanding_items: list[OutstandingFeeItem]


# Transaction History Schema
class TransactionHistoryItem(BaseModel):
    transaction_number: str
    transaction_date: datetime
    payment_method: str
    total_amount: Decimal
    status: str
    receipt_generated: bool
    fee_types_paid: list[str]  # List of fee type names


class StudentTransactionHistory(BaseModel):
    student_id: UUID
    student_admission_num: str
    academic_year_id: UUID
    transactions: list[TransactionHistoryItem]
