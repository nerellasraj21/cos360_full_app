from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, field_validator


# Forward reference to avoid circular imports
class FeeClassMappingTermAmountRead(BaseModel):
    id: UUID
    term_id: UUID
    term_amount: Decimal
    term_name: str | None = None
    model_config = {"from_attributes": True}


class FeeClassMappingBase(BaseModel):
    class_id: UUID
    fee_type_id: UUID
    total_fee: Decimal
    academic_year_id: UUID
    all_by_default: bool = False

    @field_validator("total_fee")
    def validate_total_fee(cls, v):
        if v < 0:
            raise ValueError("total_fee must be non-negative")
        return v


class FeeClassMappingCreate(FeeClassMappingBase):
    pass


class FeeClassMappingUpdate(BaseModel):
    class_id: UUID | None = None
    fee_type_id: UUID | None = None
    total_fee: Decimal | None = None
    academic_year_id: UUID | None = None
    all_by_default: bool | None = None

    @field_validator("total_fee")
    def validate_total_fee(cls, v):
        if v is not None and v < 0:
            raise ValueError("total_fee must be non-negative")
        return v


class FeeClassMappingRead(FeeClassMappingBase):
    id: UUID
    class_name: str | None = None
    fee_type_name: str | None = None
    academic_year_name: str | None = None
    class_fee_mapping_terms: list[FeeClassMappingTermAmountRead] = []
    model_config = {"from_attributes": True}


class FeeClassMappingList(BaseModel):
    id: UUID
    class_id: UUID
    class_name: str | None = None
    fee_type_id: UUID
    fee_type_name: str | None = None
    total_fee: Decimal
    academic_year_id: UUID
    academic_year_name: str | None = None
    all_by_default: bool
    class_fee_mapping_terms: list[FeeClassMappingTermAmountRead] = []
    model_config = {"from_attributes": True}


class FeeClassMappingBulkCreate(BaseModel):
    class_ids: list[UUID]
    fee_type_id: UUID
    total_fee: Decimal
    academic_year_id: UUID
    all_by_default: bool = False

    @field_validator("total_fee")
    def validate_total_fee(cls, v):
        if v < 0:
            raise ValueError("total_fee must be non-negative")
        return v

    @field_validator("class_ids")
    def validate_class_ids(cls, v):
        if not v or len(v) == 0:
            raise ValueError("at least one class_id is required")
        if len(v) != len(set(v)):
            raise ValueError("duplicate class_ids are not allowed")
        return v


class FeeClassMappingBulkError(BaseModel):
    class_id: UUID
    class_name: str | None = None
    error: str
    error_code: str


class FeeClassMappingBulkResponse(BaseModel):
    success_count: int
    total_count: int
    created_mappings: list[FeeClassMappingRead] = []
    errors: list[FeeClassMappingBulkError] = []
    message: str
