from pydantic import BaseModel, field_validator
from typing import Optional, List
from decimal import Decimal

class FeeClassMappingTermAmountBase(BaseModel):
    term_id: str  # UUID as string
    term_amount: Decimal
    
    @field_validator('term_amount')
    def validate_term_amount(cls, v):
        if v <= 0:
            raise ValueError('term_amount must be positive')
        return v

class FeeClassMappingTermAmountCreate(FeeClassMappingTermAmountBase):
    fee_class_mapping_id: Optional[str] = None  # UUID as string, will be set by service

class FeeClassMappingTermAmountUpdate(BaseModel):
    id: Optional[str] = None  # UUID as string, for identifying existing records
    term_id: str  # UUID as string
    term_amount: Decimal
    
    @field_validator('term_amount')
    def validate_term_amount(cls, v):
        if v <= 0:
            raise ValueError('term_amount must be positive')
        return v

class FeeClassMappingTermAmountRead(FeeClassMappingTermAmountBase):
    id: str  # UUID as string
    fee_class_mapping_id: str  # UUID as string
    term_name: Optional[str] = None  # For joined queries
    model_config = {"from_attributes": True}

class FeeClassMappingTermAmountBulkCreate(BaseModel):
    fee_class_mapping_id: str  # UUID as string
    term_amounts: List[FeeClassMappingTermAmountCreate]
    
    @field_validator('term_amounts')
    def validate_term_amounts_not_empty(cls, v):
        if not v:
            raise ValueError('term_amounts list cannot be empty')
        return v

class FeeClassMappingTermAmountBulkUpdate(BaseModel):
    fee_class_mapping_id: str  # UUID as string
    term_amounts: List[FeeClassMappingTermAmountUpdate]
    
    @field_validator('term_amounts')
    def validate_term_amounts_not_empty(cls, v):
        if not v:
            raise ValueError('term_amounts list cannot be empty')
        return v

class FeeClassMappingTermAmountBulkDelete(BaseModel):
    term_amount_ids: List[str]  # List of UUID strings
    
    @field_validator('term_amount_ids')
    def validate_ids_not_empty(cls, v):
        if not v:
            raise ValueError('term_amount_ids list cannot be empty')
        return v