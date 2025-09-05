from pydantic import BaseModel, field_validator
from typing import Optional, List
from decimal import Decimal
from uuid import UUID

# Forward reference to avoid circular imports
class FeeClassMappingTermAmountRead(BaseModel):
    id: UUID
    term_id: UUID
    term_amount: Decimal
    term_name: Optional[str] = None
    model_config = {"from_attributes": True}

class FeeClassMappingBase(BaseModel):
    class_id: UUID
    fee_type_id: UUID
    total_fee: Decimal
    academic_year_id: UUID
    all_by_default: bool = False
    
    @field_validator('total_fee')
    def validate_total_fee(cls, v):
        if v < 0:
            raise ValueError('total_fee must be non-negative')
        return v

class FeeClassMappingCreate(FeeClassMappingBase):
    pass

class FeeClassMappingUpdate(BaseModel):
    class_id: Optional[int] = None
    fee_type_id: Optional[UUID] = None
    total_fee: Optional[Decimal] = None
    academic_year_id: Optional[int] = None
    all_by_default: Optional[bool] = None
    
    @field_validator('total_fee')
    def validate_total_fee(cls, v):
        if v is not None and v < 0:
            raise ValueError('total_fee must be non-negative')
        return v

class FeeClassMappingRead(FeeClassMappingBase):
    id: UUID
    class_name: Optional[str] = None
    fee_type_name: Optional[str] = None
    academic_year_name: Optional[str] = None
    class_fee_mapping_terms: List[FeeClassMappingTermAmountRead] = []
    model_config = {"from_attributes": True}

class FeeClassMappingList(BaseModel):
    id: UUID
    class_id: UUID
    class_name: Optional[str] = None
    fee_type_id: UUID
    fee_type_name: Optional[str] = None
    total_fee: Decimal
    academic_year_id: UUID
    academic_year_name: Optional[str] = None
    all_by_default: bool
    class_fee_mapping_terms: List[FeeClassMappingTermAmountRead] = []
    model_config = {"from_attributes": True}