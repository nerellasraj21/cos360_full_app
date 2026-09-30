from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ExpenseDepartmentCreate(BaseModel):
    """Schema for creating ExpenseDepartment"""

    name: str = Field(..., min_length=1, max_length=100, description="Department name")
    description: str | None = Field(None, max_length=300, description="Department description")
    is_active: bool = Field(True, description="Whether department is active")


class ExpenseDepartmentUpdate(BaseModel):
    """Schema for updating ExpenseDepartment"""

    name: str | None = Field(None, min_length=1, max_length=100, description="Department name")
    description: str | None = Field(None, max_length=300, description="Department description")
    is_active: bool | None = Field(None, description="Whether department is active")


class ExpenseDepartmentRead(BaseModel):
    """Schema for reading ExpenseDepartment"""

    id: UUID
    name: str
    description: str | None = None
    is_active: bool | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExpenseDepartmentDropdown(BaseModel):
    """Schema for dropdown selection of ExpenseDepartment"""

    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)
