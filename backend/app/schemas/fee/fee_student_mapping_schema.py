from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, field_validator


# Forward reference for term amounts
class FeeStudentMapTermAmountRead(BaseModel):
    id: UUID
    term_date_id: UUID
    term_amount: Decimal
    term_date: str | None = None  # Actual date string for UI
    term_name: str | None = None  # Parent term name
    model_config = {"from_attributes": True}


class FeeStudentMapTermAmountCreate(BaseModel):
    term_date_id: UUID
    term_amount: Decimal

    @field_validator("term_amount")
    def validate_term_amount(cls, v):
        if v < 0:
            raise ValueError("term_amount must be non-negative")
        return v


# Student details schema for responses
class StudentDetailsRead(BaseModel):
    student_id: UUID
    student_name: str
    student_admission_number: str
    student_class: dict  # {"id": int, "name": str}
    student_section: dict  # {"id": int, "name": str}


class FeeStudentMappingBase(BaseModel):
    student_id: UUID
    student_admission_num: str
    class_id: UUID
    section_id: UUID
    fee_type_id: UUID
    total_fee: Decimal
    academic_year_id: UUID

    @field_validator("total_fee")
    def validate_total_fee(cls, v):
        if v < 0:
            raise ValueError("total_fee must be non-negative")
        return v


class FeeStudentMappingCreate(FeeStudentMappingBase):
    pass


class FeeStudentMappingUpdate(BaseModel):
    student_id: UUID | None = None
    student_admission_num: str | None = None
    class_id: UUID | None = None
    section_id: UUID | None = None
    fee_type_id: UUID | None = None
    total_fee: Decimal | None = None
    academic_year_id: UUID | None = None

    @field_validator("total_fee")
    def validate_total_fee(cls, v):
        if v is not None and v < 0:
            raise ValueError("total_fee must be non-negative")
        return v


class FeeStudentMappingRead(FeeStudentMappingBase):
    id: UUID
    student_details: StudentDetailsRead | None = None
    fee_type_name: str | None = None
    academic_year_name: str | None = None
    student_fee_mapping_terms: list[FeeStudentMapTermAmountRead] = []
    model_config = {"from_attributes": True}


class FeeStudentMappingList(BaseModel):
    id: UUID
    student_id: UUID
    student_admission_num: str
    class_id: UUID
    section_id: UUID
    fee_type_id: UUID
    fee_type_name: str | None = None
    total_fee: Decimal
    academic_year_id: UUID
    academic_year_name: str | None = None
    student_details: StudentDetailsRead | None = None
    student_fee_mapping_terms: list[FeeStudentMapTermAmountRead] = []
    model_config = {"from_attributes": True}


class FeeStudentMappingBulkCreate(BaseModel):
    student_ids: list[UUID]
    class_id: UUID
    section_id: UUID
    fee_type_id: UUID
    total_fee: Decimal
    academic_year_id: UUID

    @field_validator("total_fee")
    def validate_total_fee(cls, v):
        if v < 0:
            raise ValueError("total_fee must be non-negative")
        return v

    @field_validator("student_ids")
    def validate_student_ids(cls, v):
        if not v or len(v) == 0:
            raise ValueError("at least one student_id is required")
        if len(v) != len(set(v)):
            raise ValueError("duplicate student_ids are not allowed")
        return v


class FeeStudentMappingBulkError(BaseModel):
    student_id: UUID
    student_name: str | None = None
    student_admission_num: str | None = None
    error: str
    error_code: str


class FeeStudentMappingBulkResponse(BaseModel):
    success_count: int
    total_count: int
    created_mappings: list[FeeStudentMappingRead] = []
    errors: list[FeeStudentMappingBulkError] = []
    message: str
