from pydantic import BaseModel, field_validator
from typing import Optional, List
from decimal import Decimal
from uuid import UUID

class FeeClassMappingTermAmountBase(BaseModel):
    term_date_id: UUID
    term_amount: Decimal
    
    @field_validator('term_amount')
    def validate_term_amount(cls, v):
        if v <= 0:
            raise ValueError('term_amount must be positive')
        return v

class FeeClassMappingTermAmountCreate(FeeClassMappingTermAmountBase):
    fee_class_mapping_id: Optional[UUID] = None  # Will be set by service

class FeeClassMappingTermAmountUpdate(BaseModel):
    id: Optional[UUID] = None  # For identifying existing records
    term_date_id: UUID
    term_amount: Decimal
    
    @field_validator('term_amount')
    def validate_term_amount(cls, v):
        if v <= 0:
            raise ValueError('term_amount must be positive')
        return v

class FeeClassMappingTermAmountRead(FeeClassMappingTermAmountBase):
    id: UUID
    fee_class_mapping_id: UUID
    term_id: Optional[UUID] = None  # DEPRECATED: Use term_date_id instead. Kept for frontend backward compatibility.
    term_date: Optional[str] = None  # Actual date string for UI
    term_name: Optional[str] = None  # Parent term name (computed from fee_term_date.fee_term)
    model_config = {"from_attributes": True}

class FeeClassMappingTermAmountBulkCreate(BaseModel):
    fee_class_mapping_id: UUID
    term_amounts: List[FeeClassMappingTermAmountCreate]
    
    @field_validator('term_amounts')
    def validate_term_amounts_not_empty(cls, v):
        if not v:
            raise ValueError('term_amounts list cannot be empty')
        return v

class FeeClassMappingTermAmountBulkUpdate(BaseModel):
    fee_class_mapping_id: UUID
    term_amounts: List[FeeClassMappingTermAmountUpdate]
    
    @field_validator('term_amounts')
    def validate_term_amounts_not_empty(cls, v):
        if not v:
            raise ValueError('term_amounts list cannot be empty')
        return v

class FeeClassMappingTermAmountBulkDelete(BaseModel):
    term_amount_ids: List[UUID]
    
    @field_validator('term_amount_ids')
    def validate_ids_not_empty(cls, v):
        if not v:
            raise ValueError('term_amount_ids list cannot be empty')
        return v