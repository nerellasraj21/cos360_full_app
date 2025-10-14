from datetime import datetime
from typing import Optional
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field, validator


class ExpenseTransactionItemBase(BaseModel):
    """Base schema for ExpenseTransactionItem"""
    item_name: str = Field(..., min_length=1, max_length=200, description="Item name")
    item_description: Optional[str] = Field(None, description="Item description")
    unit_price: Decimal = Field(..., ge=0, decimal_places=2, description="Unit price")
    quantity: Decimal = Field(..., ge=0, decimal_places=2, description="Quantity")
    item_category: Optional[str] = Field(None, max_length=100, description="Item category")

    # Tax and discount fields
    tax_rate: Optional[Decimal] = Field(0, ge=0, le=100, decimal_places=2, description="Tax rate percentage")
    discount_rate: Optional[Decimal] = Field(0, ge=0, le=100, decimal_places=2, description="Discount rate percentage")

    # Vendor details
    vendor_item_code: Optional[str] = Field(None, max_length=100, description="Vendor item code")
    vendor_item_reference: Optional[str] = Field(None, max_length=100, description="Vendor item reference")


class ExpenseTransactionItemCreate(ExpenseTransactionItemBase):
    """Schema for creating ExpenseTransactionItem"""
    transaction_id: UUID = Field(..., description="Transaction ID this item belongs to")

    @validator('tax_rate', 'discount_rate', pre=True)
    def validate_rates(cls, v):
        """Ensure rates are not None and within valid range"""
        if v is None:
            return Decimal('0')
        return v


class ExpenseTransactionItemUpdate(BaseModel):
    """Schema for updating ExpenseTransactionItem"""
    item_name: Optional[str] = Field(None, min_length=1, max_length=200, description="Item name")
    item_description: Optional[str] = Field(None, description="Item description")
    unit_price: Optional[Decimal] = Field(None, ge=0, decimal_places=2, description="Unit price")
    quantity: Optional[Decimal] = Field(None, ge=0, decimal_places=2, description="Quantity")
    item_category: Optional[str] = Field(None, max_length=100, description="Item category")
    tax_rate: Optional[Decimal] = Field(None, ge=0, le=100, decimal_places=2, description="Tax rate percentage")
    discount_rate: Optional[Decimal] = Field(None, ge=0, le=100, decimal_places=2, description="Discount rate percentage")
    vendor_item_code: Optional[str] = Field(None, max_length=100, description="Vendor item code")
    vendor_item_reference: Optional[str] = Field(None, max_length=100, description="Vendor item reference")


class ExpenseTransactionItemRead(ExpenseTransactionItemBase):
    """Schema for reading ExpenseTransactionItem"""
    id: UUID = Field(..., description="Unique identifier")
    transaction_id: UUID = Field(..., description="Transaction ID")

    # Calculated fields
    total_price: Decimal = Field(..., description="Unit price * quantity")
    tax_amount: Decimal = Field(..., description="Calculated tax amount")
    discount_amount: Decimal = Field(..., description="Calculated discount amount")
    final_amount: Decimal = Field(..., description="Final amount after tax and discount")

    # Audit fields
    created_by_user_id: UUID = Field(..., description="Creator user ID")
    created_by_role: str = Field(..., description="Creator role")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)