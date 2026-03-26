from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ExpenseTransactionBase(BaseModel):
    """Base schema for ExpenseTransaction"""

    expense_type_id: UUID = Field(..., description="Expense type ID")
    amount: Decimal = Field(..., ge=0, decimal_places=2, description="Transaction amount")
    transaction_date: date = Field(..., description="Date of transaction")
    description: str = Field(..., min_length=1, max_length=500, description="Transaction description")
    reference_number: str | None = Field(None, max_length=100, description="Reference number")
    payment_method: str = Field(..., description="Payment method: cash, cheque, bank_transfer, upi")
    vendor_name: str | None = Field(None, max_length=200, description="Vendor name")
    department_id: UUID | None = Field(None, description="Department ID for scoping")
    academic_year_id: UUID | None = Field(None, description="Academic year for year-wise tracking")


class ExpenseTransactionCreate(ExpenseTransactionBase):
    """Schema for creating ExpenseTransaction"""

    idempotency_key: str = Field(..., min_length=1, max_length=100, description="Idempotency key to prevent duplicates")
    requires_approval_override: bool | None = Field(None, description="Override approval requirement")


class ExpenseTransactionUpdate(BaseModel):
    """Schema for updating ExpenseTransaction"""

    expense_type_id: UUID | None = Field(None, description="Expense type ID")
    amount: Decimal | None = Field(None, ge=0, decimal_places=2, description="Transaction amount")
    transaction_date: date | None = Field(None, description="Date of transaction")
    description: str | None = Field(None, min_length=1, max_length=500, description="Transaction description")
    reference_number: str | None = Field(None, max_length=100, description="Reference number")
    payment_method: str | None = Field(None, description="Payment method")
    vendor_name: str | None = Field(None, max_length=200, description="Vendor name")
    department_id: UUID | None = Field(None, description="Department ID for scoping")
    academic_year_id: UUID | None = Field(None, description="Academic year for year-wise tracking")


class ExpenseTransactionApproval(BaseModel):
    """Schema for approving/rejecting ExpenseTransaction"""

    action: str = Field(..., description="Action: approve or reject")
    approval_comment: str = Field(..., min_length=1, max_length=500, description="Approval comment")


class ExpenseTransactionRead(ExpenseTransactionBase):
    """Schema for reading ExpenseTransaction"""

    id: UUID = Field(..., description="Unique identifier")
    org_id: UUID = Field(..., description="Organization identifier")
    idempotency_key: str = Field(..., description="Idempotency key")
    status: str = Field(..., description="Transaction status")
    requires_approval: bool | None = Field(None, description="Whether transaction requires approval")
    requires_approval_override: bool | None = Field(None, description="Approval requirement override")

    # Approval fields
    approved_by_user_id: UUID | None = Field(None, description="ID of user who approved")
    approved_by_role: str | None = Field(None, description="Role of approver")
    approved_at: datetime | None = Field(None, description="Approval timestamp")
    approval_comment: str | None = Field(None, description="Approval comment")

    # Audit fields
    version: int = Field(..., description="Version for optimistic locking")
    created_by_user_id: UUID = Field(..., description="Creator user ID")
    created_by_role: str = Field(..., description="Creator role")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    # Note: Relationship fields temporarily removed to resolve circular imports
    # In production, relationships can be loaded at the service layer when needed

    model_config = ConfigDict(from_attributes=True)
