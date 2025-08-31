import pytest
from decimal import Decimal
from pydantic import ValidationError
from app.schemas.fee.fee_student_mapping_schema import (
    FeeStudentMappingCreate,
    FeeStudentMappingUpdate,
    FeeStudentMappingRead,
    FeeStudentMappingList,
    FeeStudentMapTermAmountCreate,
    FeeStudentMapTermAmountRead,
    StudentDetailsRead
)

class TestFeeStudentMappingSchemas:
    """Test cases for fee student mapping schemas"""

    def test_fee_student_mapping_create_valid(self):
        """Test valid fee student mapping creation"""
        data = {
            "student_id": 1,
            "student_admission_num": "ADM001",
            "class_id": 1,
            "section_id": 1,
            "fee_type_id": "123e4567-e89b-12d3-a456-426614174000",
            "total_fee": Decimal("10000.00"),
            "academic_year_id": 1
        }
        mapping = FeeStudentMappingCreate(**data)
        assert mapping.student_id == 1
        assert mapping.student_admission_num == "ADM001"
        assert mapping.class_id == 1
        assert mapping.section_id == 1
        assert mapping.fee_type_id == "123e4567-e89b-12d3-a456-426614174000"
        assert mapping.total_fee == Decimal("10000.00")
        assert mapping.academic_year_id == 1

    def test_fee_student_mapping_create_negative_total_fee(self):
        """Test fee student mapping creation with negative total fee"""
        data = {
            "student_id": 1,
            "student_admission_num": "ADM001",
            "class_id": 1,
            "section_id": 1,
            "fee_type_id": "123e4567-e89b-12d3-a456-426614174000",
            "total_fee": Decimal("-1000.00"),
            "academic_year_id": 1
        }
        with pytest.raises(ValidationError) as exc_info:
            FeeStudentMappingCreate(**data)
        
        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["loc"] == ("total_fee",)
        assert "total_fee must be non-negative" in errors[0]["msg"]

    def test_fee_student_mapping_create_missing_required_fields(self):
        """Test fee student mapping creation with missing required fields"""
        data = {
            "student_id": 1,
            "class_id": 1
        }
        with pytest.raises(ValidationError) as exc_info:
            FeeStudentMappingCreate(**data)
        
        errors = exc_info.value.errors()
        required_fields = {"student_admission_num", "section_id", "fee_type_id", "total_fee", "academic_year_id"}
        error_fields = {error["loc"][0] for error in errors}
        assert required_fields.issubset(error_fields)

    def test_fee_student_mapping_update_valid(self):
        """Test valid fee student mapping update"""
        data = {
            "student_id": 2,
            "total_fee": Decimal("15000.00"),
            "academic_year_id": 2
        }
        mapping = FeeStudentMappingUpdate(**data)
        assert mapping.student_id == 2
        assert mapping.total_fee == Decimal("15000.00")
        assert mapping.academic_year_id == 2
        assert mapping.student_admission_num is None
        assert mapping.class_id is None

    def test_fee_student_mapping_update_negative_total_fee(self):
        """Test fee student mapping update with negative total fee"""
        data = {
            "total_fee": Decimal("-500.00")
        }
        with pytest.raises(ValidationError) as exc_info:
            FeeStudentMappingUpdate(**data)
        
        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["loc"] == ("total_fee",)
        assert "total_fee must be non-negative" in errors[0]["msg"]

    def test_fee_student_mapping_update_empty(self):
        """Test fee student mapping update with no fields"""
        mapping = FeeStudentMappingUpdate()
        assert mapping.student_id is None
        assert mapping.student_admission_num is None
        assert mapping.class_id is None
        assert mapping.section_id is None
        assert mapping.fee_type_id is None
        assert mapping.total_fee is None
        assert mapping.academic_year_id is None

    def test_fee_student_map_term_amount_create_valid(self):
        """Test valid fee student map term amount creation"""
        data = {
            "term_id": "123e4567-e89b-12d3-a456-426614174000",
            "term_amount": Decimal("2500.00")
        }
        term_amount = FeeStudentMapTermAmountCreate(**data)
        assert term_amount.term_id == "123e4567-e89b-12d3-a456-426614174000"
        assert term_amount.term_amount == Decimal("2500.00")

    def test_fee_student_map_term_amount_create_negative_amount(self):
        """Test fee student map term amount creation with negative amount"""
        data = {
            "term_id": "123e4567-e89b-12d3-a456-426614174000",
            "term_amount": Decimal("-100.00")
        }
        with pytest.raises(ValidationError) as exc_info:
            FeeStudentMapTermAmountCreate(**data)
        
        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["loc"] == ("term_amount",)
        assert "term_amount must be non-negative" in errors[0]["msg"]

    def test_student_details_read_valid(self):
        """Test valid student details read schema"""
        data = {
            "student_id": 1,
            "student_name": "John Doe",
            "student_admission_number": "ADM001",
            "student_class": {"id": 1, "name": "Class 10"},
            "student_section": {"id": 1, "name": "Section A"}
        }
        details = StudentDetailsRead(**data)
        assert details.student_id == 1
        assert details.student_name == "John Doe"
        assert details.student_admission_number == "ADM001"
        assert details.student_class == {"id": 1, "name": "Class 10"}
        assert details.student_section == {"id": 1, "name": "Section A"}

    def test_fee_student_mapping_read_with_defaults(self):
        """Test fee student mapping read schema with default values"""
        data = {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "student_id": 1,
            "student_admission_num": "ADM001",
            "class_id": 1,
            "section_id": 1,
            "fee_type_id": "123e4567-e89b-12d3-a456-426614174001",
            "total_fee": Decimal("10000.00"),
            "academic_year_id": 1
        }
        mapping = FeeStudentMappingRead(**data)
        assert mapping.id == "123e4567-e89b-12d3-a456-426614174000"
        assert mapping.student_details is None
        assert mapping.fee_type_name is None
        assert mapping.academic_year_name is None
        assert mapping.student_fee_mapping_terms == []

    def test_fee_student_mapping_list_with_relationships(self):
        """Test fee student mapping list schema with relationship data"""
        student_details = {
            "student_id": 1,
            "student_name": "Jane Smith",
            "student_admission_number": "ADM002",
            "student_class": {"id": 2, "name": "Class 11"},
            "student_section": {"id": 2, "name": "Section B"}
        }
        
        term_amount = {
            "id": "123e4567-e89b-12d3-a456-426614174002",
            "term_id": "123e4567-e89b-12d3-a456-426614174003",
            "term_amount": Decimal("2500.00"),
            "term_name": "Term 1"
        }
        
        data = {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "student_id": 1,
            "student_admission_num": "ADM002",
            "class_id": 2,
            "section_id": 2,
            "fee_type_id": "123e4567-e89b-12d3-a456-426614174001",
            "fee_type_name": "Tuition Fee",
            "total_fee": Decimal("10000.00"),
            "academic_year_id": 1,
            "academic_year_name": "2023-2024",
            "student_details": student_details,
            "student_fee_mapping_terms": [term_amount]
        }
        
        mapping_list = FeeStudentMappingList(**data)
        assert mapping_list.fee_type_name == "Tuition Fee"
        assert mapping_list.academic_year_name == "2023-2024"
        assert mapping_list.student_details.student_name == "Jane Smith"
        assert len(mapping_list.student_fee_mapping_terms) == 1
        assert mapping_list.student_fee_mapping_terms[0].term_amount == Decimal("2500.00")

    def test_zero_total_fee_allowed(self):
        """Test that zero total fee is allowed"""
        data = {
            "student_id": 1,
            "student_admission_num": "ADM001",
            "class_id": 1,
            "section_id": 1,
            "fee_type_id": "123e4567-e89b-12d3-a456-426614174000",
            "total_fee": Decimal("0.00"),
            "academic_year_id": 1
        }
        mapping = FeeStudentMappingCreate(**data)
        assert mapping.total_fee == Decimal("0.00")

    def test_high_precision_decimal(self):
        """Test handling of high precision decimal values"""
        data = {
            "student_id": 1,
            "student_admission_num": "ADM001",
            "class_id": 1,
            "section_id": 1,
            "fee_type_id": "123e4567-e89b-12d3-a456-426614174000",
            "total_fee": Decimal("10000.99"),
            "academic_year_id": 1
        }
        mapping = FeeStudentMappingCreate(**data)
        assert mapping.total_fee == Decimal("10000.99")

    def test_string_numeric_conversion(self):
        """Test automatic conversion of string numbers to Decimal"""
        data = {
            "student_id": 1,
            "student_admission_num": "ADM001",
            "class_id": 1,
            "section_id": 1,
            "fee_type_id": "123e4567-e89b-12d3-a456-426614174000",
            "total_fee": "15000.50",
            "academic_year_id": 1
        }
        mapping = FeeStudentMappingCreate(**data)
        assert mapping.total_fee == Decimal("15000.50")