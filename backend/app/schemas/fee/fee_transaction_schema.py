from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List, Literal
from datetime import datetime
from uuid import UUID
from decimal import Decimal

class FeeTransactionItemBase(BaseModel):
    fee_type_id: UUID
    term_date_id: UUID  # Changed from fee_term_id to term_date_id
    amount_due: Decimal
    amount_paid: Decimal
    description: Optional[str] = None
    
    @field_validator('amount_due', 'amount_paid')
    @classmethod
    def validate_positive_amounts(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v
    
    @model_validator(mode='after')
    def validate_payment_amount(self):
        if self.amount_paid > self.amount_due:
            raise ValueError('Amount paid cannot exceed amount due')
        return self

class FeeTransactionItemCreate(FeeTransactionItemBase):
    pass

class FeeTransactionItemRead(FeeTransactionItemBase):
    id: UUID
    fee_transaction_id: UUID
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
    upi_reference: Optional[str] = None
    upi_app_name: Optional[str] = None
    cheque_number: Optional[str] = None
    cheque_date: Optional[datetime] = None
    cheque_bank: Optional[str] = None
    bank_reference: Optional[str] = None
    bank_name: Optional[str] = None
    
    remarks: Optional[str] = None
    
    @field_validator('total_amount')
    @classmethod
    def validate_positive_amount(cls, v):
        if v <= 0:
            raise ValueError('Total amount must be positive')
        return v
    
    @model_validator(mode='after')
    def validate_payment_method_fields(self):
        if self.payment_method == 'upi':
            if not self.upi_reference:
                raise ValueError('UPI reference is required for UPI payments')
        elif self.payment_method == 'cheque':
            if not self.cheque_number or not self.cheque_date or not self.cheque_bank:
                raise ValueError('Cheque number, date, and bank are required for cheque payments')
        elif self.payment_method == 'bank_transfer':
            if not self.bank_reference or not self.bank_name:
                raise ValueError('Bank reference and bank name are required for bank transfers')
        return self

class FeeTransactionCreate(FeeTransactionBase):
    transaction_items: List[FeeTransactionItemCreate]
    
    @field_validator('transaction_items')
    @classmethod
    def validate_transaction_items(cls, v):
        if not v:
            raise ValueError('At least one transaction item is required')
        return v
    
    @model_validator(mode='after')
    def validate_total_amount_matches_items(self):
        total_items_amount = sum(item.amount_paid for item in self.transaction_items)
        if abs(self.total_amount - total_items_amount) > 0.01:  # Allow for minor rounding differences
            raise ValueError(f'Total amount ({self.total_amount}) must match sum of transaction items ({total_items_amount})')
        return self

class FeeTransactionUpdate(BaseModel):
    status: Optional[Literal["pending", "completed", "cancelled", "bounced"]] = None
    cheque_status: Optional[Literal["pending", "cleared", "bounced"]] = None
    approved_by_user_id: Optional[UUID] = None
    remarks: Optional[str] = None

class FeeTransactionRead(FeeTransactionBase):
    id: UUID
    transaction_number: str
    status: str
    cheque_status: Optional[str] = None
    collected_by_user_id: UUID
    approved_by_user_id: Optional[UUID] = None
    receipt_generated: bool
    receipt_hash: Optional[str] = None
    transaction_date: datetime
    created_at: datetime
    updated_at: datetime

    # Student information
    student_first_name: Optional[str] = None
    student_last_name: Optional[str] = None
    student_full_name: Optional[str] = None

    transaction_items: List[FeeTransactionItemRead] = []

    model_config = {"from_attributes": True}

class FeeTransactionSummary(BaseModel):
    """Lightweight transaction summary for list views"""
    id: UUID
    transaction_number: str
    student_id: UUID
    student_admission_num: str
    student_first_name: Optional[str] = None
    student_last_name: Optional[str] = None
    student_full_name: Optional[str] = None
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
    outstanding_items: List[OutstandingFeeItem]

# Transaction History Schema
class TransactionHistoryItem(BaseModel):
    transaction_number: str
    transaction_date: datetime
    payment_method: str
    total_amount: Decimal
    status: str
    receipt_generated: bool
    fee_types_paid: List[str]  # List of fee type names

class StudentTransactionHistory(BaseModel):
    student_id: UUID
    student_admission_num: str
    academic_year_id: UUID
    transactions: List[TransactionHistoryItem]