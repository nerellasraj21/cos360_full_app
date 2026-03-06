from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class FeeReceiptBase(BaseModel):
    receipt_number: str
    fee_transaction_id: UUID
    student_name: str
    student_admission_num: str
    class_section: str
    academic_year: str
    content_hash: str


class FeeReceiptCreate(FeeReceiptBase):
    generated_by_user_id: UUID
    pdf_file_path: str | None = None
    remarks: str | None = None


class FeeReceiptUpdate(BaseModel):
    pdf_file_path: str | None = None
    is_reprinted: bool | None = None
    reprint_count: str | None = None
    remarks: str | None = None


class FeeReceiptRead(FeeReceiptBase):
    id: UUID
    pdf_file_path: str | None = None
    is_reprinted: bool
    reprint_count: str
    generated_by_user_id: UUID
    remarks: str | None = None
    generated_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FeeReceiptSummary(BaseModel):
    """Lightweight receipt summary for list views"""

    id: UUID
    receipt_number: str
    student_name: str
    student_admission_num: str
    generated_at: datetime
    is_reprinted: bool
    reprint_count: str

    model_config = {"from_attributes": True}


# Receipt content for PDF generation
class ReceiptItemDetail(BaseModel):
    fee_type_name: str
    fee_term_name: str
    amount_paid: Decimal


class ReceiptContent(BaseModel):
    """Complete receipt data for PDF generation"""

    receipt_number: str
    transaction_number: str
    student_name: str
    student_admission_num: str
    class_section: str
    academic_year: str
    payment_method: str
    payment_reference: str | None = None  # UPI ref, cheque number, etc.
    total_amount: Decimal
    transaction_date: datetime
    collected_by_user: str
    receipt_items: list[ReceiptItemDetail]
    remarks: str | None = None
    school_name: str
    school_address: str
