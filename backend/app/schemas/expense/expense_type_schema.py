from __future__ import annotations
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ExpenseTypeBase(BaseModel):
    """Base schema for ExpenseType"""
    name: str = Field(..., min_length=1, max_length=100, description="Type name")
    category_id: UUID = Field(..., description="Category ID this type belongs to")
    description: Optional[str] = Field(None, max_length=300, description="Type description")
    is_active: bool = Field(True, description="Whether type is active")


class ExpenseTypeCreate(ExpenseTypeBase):
    """Schema for creating ExpenseType"""
    pass


class ExpenseTypeUpdate(BaseModel):
    """Schema for updating ExpenseType"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Type name")
    category_id: Optional[UUID] = Field(None, description="Category ID this type belongs to")
    description: Optional[str] = Field(None, max_length=300, description="Type description")
    is_active: Optional[bool] = Field(None, description="Whether type is active")


class ExpenseTypeRead(ExpenseTypeBase):
    """Schema for reading ExpenseType"""
    id: UUID = Field(..., description="Unique identifier")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)


class ExpenseTypeDropdown(BaseModel):
    """Schema for dropdown selection of ExpenseType"""
    id: UUID = Field(..., description="Unique identifier")
    name: str = Field(..., description="Type name")
    category_id: UUID = Field(..., description="Category ID")

    model_config = ConfigDict(from_attributes=True)


# Note: Relationship schema temporarily removed to resolve circular imports
# In production, relationships can be loaded at the service layer when needed