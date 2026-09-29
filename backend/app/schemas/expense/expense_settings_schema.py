from datetime import datetime
from decimal import Decimal
from typing import Any, Union
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, validator


class ExpenseSettingsBase(BaseModel):
    """Base schema for ExpenseSettings"""

    setting_key: str = Field(..., min_length=1, max_length=100, description="Setting key")
    setting_name: str = Field(..., min_length=1, max_length=200, description="Human-readable setting name")
    setting_description: str | None = Field(None, description="Setting description")
    setting_category: str = Field(..., max_length=50, description="Setting category")

    # Value storage (only one should be populated)
    string_value: str | None = Field(None, max_length=500, description="String value")
    numeric_value: Decimal | None = Field(None, decimal_places=2, description="Numeric value")
    integer_value: int | None = Field(None, description="Integer value")
    boolean_value: bool | None = Field(None, description="Boolean value")
    json_value: dict[str, Any] | None = Field(None, description="JSON value for complex data")

    # Department scoping
    department_id: UUID | None = Field(None, description="Department ID for scoping")
    applies_to_all_departments: bool = Field(True, description="Whether setting applies to all departments")


class ExpenseSettingsCreate(ExpenseSettingsBase):
    """Schema for creating ExpenseSettings"""

    # Default and validation
    default_value: str | None = Field(None, description="Default value as JSON string")
    is_system_setting: bool = Field(False, description="Whether this is a system setting")
    is_user_configurable: bool = Field(True, description="Whether users can modify this")

    # Validation rules
    validation_rules: dict[str, Any] | None = Field(None, description="Validation rules as JSON")
    allowed_values: list[Any] | None = Field(None, description="Allowed values for enum-type settings")

    # Approval settings
    requires_approval: bool = Field(False, description="Whether changes require approval")
    approval_threshold: Decimal | None = Field(None, decimal_places=2, description="Approval threshold")

    # Compliance and security
    is_audit_required: bool = Field(True, description="Whether changes should be audited")
    is_sensitive: bool = Field(False, description="Whether this is sensitive data")
    compliance_level: str = Field("standard", description="Compliance level: standard, high, critical")

    # Activation
    effective_from: datetime | None = Field(None, description="When setting becomes effective")
    effective_until: datetime | None = Field(None, description="When setting expires")

    @validator("setting_category")
    def validate_category(cls, v):
        allowed_categories = ["approval", "workflow", "security", "compliance", "notification", "integration"]
        if v not in allowed_categories:
            raise ValueError(f"Category must be one of: {allowed_categories}")
        return v

    @validator("compliance_level")
    def validate_compliance_level(cls, v):
        allowed_levels = ["standard", "high", "critical"]
        if v not in allowed_levels:
            raise ValueError(f"Compliance level must be one of: {allowed_levels}")
        return v


class ExpenseSettingsUpdate(BaseModel):
    """Schema for updating ExpenseSettings"""

    setting_name: str | None = Field(None, min_length=1, max_length=200, description="Setting name")
    setting_description: str | None = Field(None, description="Setting description")

    # Value updates
    string_value: str | None = Field(None, max_length=500, description="String value")
    numeric_value: Decimal | None = Field(None, decimal_places=2, description="Numeric value")
    integer_value: int | None = Field(None, description="Integer value")
    boolean_value: bool | None = Field(None, description="Boolean value")
    json_value: dict[str, Any] | None = Field(None, description="JSON value")

    # Configuration updates
    is_user_configurable: bool | None = Field(None, description="Whether users can modify this")
    validation_rules: dict[str, Any] | None = Field(None, description="Validation rules")
    allowed_values: list[Any] | None = Field(None, description="Allowed values")
    requires_approval: bool | None = Field(None, description="Whether changes require approval")
    approval_threshold: Decimal | None = Field(None, decimal_places=2, description="Approval threshold")

    # Department scoping
    department_id: UUID | None = Field(None, description="Department ID")
    applies_to_all_departments: bool | None = Field(None, description="Applies to all departments")

    # Status and timing
    is_active: bool | None = Field(None, description="Whether setting is active")
    effective_from: datetime | None = Field(None, description="Effective from timestamp")
    effective_until: datetime | None = Field(None, description="Effective until timestamp")


class ExpenseSettingsRead(ExpenseSettingsBase):
    """Schema for reading ExpenseSettings"""

    id: UUID = Field(..., description="Unique identifier")

    # Configuration details
    default_value: str | None = Field(None, description="Default value")
    is_system_setting: bool = Field(..., description="Whether this is a system setting")
    is_user_configurable: bool = Field(..., description="Whether users can modify this")

    # Validation
    validation_rules: dict[str, Any] | None = Field(None, description="Validation rules")
    allowed_values: list[Any] | None = Field(None, description="Allowed values")

    # Approval
    requires_approval: bool = Field(..., description="Whether changes require approval")
    approval_threshold: Decimal | None = Field(None, description="Approval threshold")

    # Compliance and security
    is_audit_required: bool = Field(..., description="Whether changes are audited")
    is_sensitive: bool = Field(..., description="Whether this is sensitive")
    compliance_level: str = Field(..., description="Compliance level")

    # Concurrency control
    version: int = Field(..., description="Version for optimistic locking")

    # Status and timing
    is_active: bool = Field(..., description="Whether setting is active")
    effective_from: datetime | None = Field(None, description="Effective from")
    effective_until: datetime | None = Field(None, description="Effective until")

    # Audit fields
    created_by_user_id: UUID = Field(..., description="Creator user ID")
    created_by_role: str = Field(..., description="Creator role")
    last_modified_by_user_id: UUID | None = Field(None, description="Last modifier user ID")
    last_modified_by_role: str | None = Field(None, description="Last modifier role")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)


class ExpenseSettingsValue(BaseModel):
    """Schema for getting/setting individual setting values"""

    setting_key: str = Field(..., description="Setting key")
    value: Union[str, int, float, bool, dict[str, Any]] = Field(..., description="Setting value")
    value_type: str = Field(..., description="Type of value: string, integer, numeric, boolean, json")

    model_config = ConfigDict(from_attributes=True)
