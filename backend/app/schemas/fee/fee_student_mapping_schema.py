from pydantic import BaseModel, field_validator
from typing import Optional, List
from decimal import Decimal

# Forward reference for term amounts
class FeeStudentMapTermAmountRead(BaseModel):
    id: str
    term_id: str
    term_amount: Decimal
    term_name: Optional[str] = None
    model_config = {"from_attributes": True}

class FeeStudentMapTermAmountCreate(BaseModel):
    term_id: str
    term_amount: Decimal
    
    @field_validator('term_amount')
    def validate_term_amount(cls, v):
        if v < 0:
            raise ValueError('term_amount must be non-negative')
        return v

# Student details schema for responses
class StudentDetailsRead(BaseModel):
    student_id: int
    student_name: str
    student_admission_number: str
    student_class: dict  # {"id": int, "name": str}
    student_section: dict  # {"id": int, "name": str}

class FeeStudentMappingBase(BaseModel):
    student_id: int
    student_admission_num: str
    class_id: int
    section_id: int
    fee_type_id: str  # UUID as string
    total_fee: Decimal
    academic_year_id: int
    
    @field_validator('total_fee')
    def validate_total_fee(cls, v):
        if v < 0:
            raise ValueError('total_fee must be non-negative')
        return v

class FeeStudentMappingCreate(FeeStudentMappingBase):
    pass

class FeeStudentMappingUpdate(BaseModel):
    student_id: Optional[int] = None
    student_admission_num: Optional[str] = None
    class_id: Optional[int] = None
    section_id: Optional[int] = None
    fee_type_id: Optional[str] = None  # UUID as string
    total_fee: Optional[Decimal] = None
    academic_year_id: Optional[int] = None
    
    @field_validator('total_fee')
    def validate_total_fee(cls, v):
        if v is not None and v < 0:
            raise ValueError('total_fee must be non-negative')
        return v

class FeeStudentMappingRead(FeeStudentMappingBase):
    id: str  # UUID as string
    student_details: Optional[StudentDetailsRead] = None
    fee_type_name: Optional[str] = None
    academic_year_name: Optional[str] = None
    student_fee_mapping_terms: List[FeeStudentMapTermAmountRead] = []
    model_config = {"from_attributes": True}

class FeeStudentMappingList(BaseModel):
    id: str  # UUID as string
    student_id: int
    student_admission_num: str
    class_id: int
    section_id: int
    fee_type_id: str
    fee_type_name: Optional[str] = None
    total_fee: Decimal
    academic_year_id: int
    academic_year_name: Optional[str] = None
    student_details: Optional[StudentDetailsRead] = None
    student_fee_mapping_terms: List[FeeStudentMapTermAmountRead] = []
    model_config = {"from_attributes": True}