"""
Schemas for Fee Concession module.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ─── Create / Update ─────────────────────────────────────────────────────────

class FeeConcessionItemCreate(BaseModel):
    fee_type_id: UUID
    concession_amount: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    reason: str = Field(min_length=5, max_length=500)
    approved_by: str = Field(
        description="One of: owner, principal, management, correspondent"
    )


class FeeConcessionBulkCreate(BaseModel):
    student_id: UUID
    academic_year_id: UUID
    concessions: list[FeeConcessionItemCreate] = Field(min_length=1)


class FeeConcessionUpdate(BaseModel):
    concession_amount: Optional[Decimal] = Field(None, gt=0, max_digits=10, decimal_places=2)
    reason: Optional[str] = Field(None, min_length=5, max_length=500)
    approved_by: Optional[str] = None


# ─── Read ────────────────────────────────────────────────────────────────────

class FeeConcessionRead(BaseModel):
    id: UUID
    student_id: UUID
    fee_type_id: UUID
    fee_type_name: Optional[str] = None
    assigned_fee: Decimal
    concession_amount: Decimal
    reason: str
    approved_by: str
    recorded_by_user_name: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Concession Summary ─────────────────────────────────────────────────────

class ConcessionSummaryItem(BaseModel):
    fee_type_id: UUID
    fee_type_name: str
    assigned_fee: Decimal
    current_due: Decimal
    concession_amount: Decimal
    reason: Optional[str] = None
    approved_by: Optional[str] = None

    model_config = {"from_attributes": True}


class ConcessionSummaryResponse(BaseModel):
    student_id: UUID
    student_name: str
    academic_year: str
    items: list[ConcessionSummaryItem]
    grand_total_assigned: Decimal
    grand_total_concession: Decimal
    grand_total_fee_after_concession: Decimal

    model_config = {"from_attributes": True}


# ─── Concession History ─────────────────────────────────────────────────────

class ConcessionHistoryItem(BaseModel):
    id: UUID
    date_applied: datetime
    fee_type_name: str
    amount: Decimal
    reason: str
    approver: str
    recorded_by_staff_name: Optional[str] = None

    model_config = {"from_attributes": True}
