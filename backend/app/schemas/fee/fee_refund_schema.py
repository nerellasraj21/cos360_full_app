from pydantic import BaseModel, field_validator
from typing import Optional, Literal
from datetime import datetime
from uuid import UUID
from decimal import Decimal

class FeeRefundBase(BaseModel):
    fee_transaction_id: UUID
    refund_amount: Decimal
    refund_reason: Literal["fee_adjustment", "student_withdrawal", "excess_payment", "other"]
    detailed_reason: Optional[str] = None
    
    @field_validator('refund_amount')
    @classmethod
    def validate_positive_amount(cls, v):
        if v <= 0:
            raise ValueError('Refund amount must be positive')
        return v

class FeeRefundCreate(FeeRefundBase):
    student_id: UUID
    student_admission_num: str
    academic_year_id: UUID
    requested_by_user_id: UUID

class FeeRefundUpdate(BaseModel):
    status: Optional[Literal["pending", "approved", "rejected", "processed"]] = None
    approved_by_user_id: Optional[UUID] = None
    processed_by_user_id: Optional[UUID] = None
    refund_method: Optional[Literal["cash", "bank_transfer", "cheque"]] = None
    refund_reference: Optional[str] = None
    approval_remarks: Optional[str] = None
    processing_remarks: Optional[str] = None

class FeeRefundRead(FeeRefundBase):
    id: UUID
    refund_number: str
    student_id: UUID
    student_admission_num: str
    academic_year_id: UUID
    status: str
    requested_by_user_id: UUID
    approved_by_user_id: Optional[UUID] = None
    processed_by_user_id: Optional[UUID] = None
    refund_method: Optional[str] = None
    refund_reference: Optional[str] = None
    approval_remarks: Optional[str] = None
    processing_remarks: Optional[str] = None
    requested_date: datetime
    approved_date: Optional[datetime] = None
    processed_date: Optional[datetime] = None
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
    refund_reference: Optional[str] = None
    processing_remarks: Optional[str] = None
    processed_by_user_id: UUID