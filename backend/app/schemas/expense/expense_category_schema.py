from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ExpenseCategoryBase(BaseModel):
    """Base schema for ExpenseCategory"""

    name: str = Field(..., min_length=1, max_length=100, description="Category name")
    description: str | None = Field(None, max_length=300, description="Category description")
    is_active: bool = Field(True, description="Whether category is active")


class ExpenseCategoryCreate(ExpenseCategoryBase):
    """Schema for creating ExpenseCategory"""

    pass


class ExpenseCategoryUpdate(BaseModel):
    """Schema for updating ExpenseCategory"""

    name: str | None = Field(None, min_length=1, max_length=100, description="Category name")
    description: str | None = Field(None, max_length=300, description="Category description")
    is_active: bool | None = Field(None, description="Whether category is active")


class ExpenseCategoryRead(ExpenseCategoryBase):
    """Schema for reading ExpenseCategory"""

    id: UUID = Field(..., description="Unique identifier")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)


class ExpenseCategoryDropdown(BaseModel):
    """Schema for dropdown selection of ExpenseCategory"""

    id: UUID = Field(..., description="Unique identifier")
    name: str = Field(..., description="Category name")

    model_config = ConfigDict(from_attributes=True)
