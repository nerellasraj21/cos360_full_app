"""
Unit tests for Fee Class Mapping schemas
"""
import pytest
from pydantic import ValidationError
from decimal import Decimal

from app.schemas.fee.fee_class_mapping_schema import (
    FeeClassMappingCreate, 
    FeeClassMappingUpdate, 
    FeeClassMappingRead,
    FeeClassMappingList
)

class TestFeeClassMappingSchemas:
    """Test Fee Class Mapping Pydantic schemas"""

    def test_fee_class_mapping_create_valid(self):
        """Test valid fee class mapping creation"""
        mapping = FeeClassMappingCreate(
            class_id=1,
            fee_type_id="123e4567-e89b-12d3-a456-426614174001",
            total_fee=Decimal("5000.00"),
            academic_year_id=1,
            all_by_default=True
        )
        
        assert mapping.class_id == 1
        assert mapping.fee_type_id == "123e4567-e89b-12d3-a456-426614174001"
        assert mapping.total_fee == Decimal("5000.00")
        assert mapping.academic_year_id == 1
        assert mapping.all_by_default == True

    def test_fee_class_mapping_create_default_all_by_default(self):
        """Test fee class mapping creation with default all_by_default"""
        mapping = FeeClassMappingCreate(
            class_id=2,
            fee_type_id="123e4567-e89b-12d3-a456-426614174001",
            total_fee=Decimal("3000.00"),
            academic_year_id=1
        )
        
        assert mapping.class_id == 2
        assert mapping.total_fee == Decimal("3000.00")
        assert mapping.all_by_default == False  # Default value

    def test_fee_class_mapping_create_required_fields(self):
        """Test fee class mapping creation with missing required fields"""
        with pytest.raises(ValidationError) as exc_info:
            FeeClassMappingCreate(
                class_id=1
                # Missing fee_type_id, total_fee, academic_year_id
            )
        
        errors = exc_info.value.errors()
        error_fields = [error["loc"][0] for error in errors]
        assert "fee_type_id" in error_fields
        assert "total_fee" in error_fields
        assert "academic_year_id" in error_fields

    def test_fee_class_mapping_create_negative_total_fee(self):
        """Test fee class mapping creation with negative total_fee"""
        with pytest.raises(ValidationError) as exc_info:
            FeeClassMappingCreate(
                class_id=1,
                fee_type_id="123e4567-e89b-12d3-a456-426614174001",
                total_fee=Decimal("-100.00"),
                academic_year_id=1
            )
        
        errors = exc_info.value.errors()
        assert any("total_fee must be non-negative" in str(error["msg"]) for error in errors)

    def test_fee_class_mapping_create_zero_total_fee(self):
        """Test fee class mapping creation with zero total_fee"""
        mapping = FeeClassMappingCreate(
            class_id=1,
            fee_type_id="123e4567-e89b-12d3-a456-426614174001",
            total_fee=Decimal("0.00"),
            academic_year_id=1
        )
        
        assert mapping.total_fee == Decimal("0.00")

    def test_fee_class_mapping_update_partial(self):
        """Test fee class mapping partial update"""
        update_data = FeeClassMappingUpdate(
            total_fee=Decimal("6000.00")
        )
        
        assert update_data.total_fee == Decimal("6000.00")
        assert update_data.class_id is None
        assert update_data.fee_type_id is None
        assert update_data.academic_year_id is None
        assert update_data.all_by_default is None

    def test_fee_class_mapping_update_all_fields(self):
        """Test fee class mapping update with all fields"""
        update_data = FeeClassMappingUpdate(
            class_id=2,
            fee_type_id="123e4567-e89b-12d3-a456-426614174002",
            total_fee=Decimal("7500.00"),
            academic_year_id=2,
            all_by_default=False
        )
        
        assert update_data.class_id == 2
        assert update_data.fee_type_id == "123e4567-e89b-12d3-a456-426614174002"
        assert update_data.total_fee == Decimal("7500.00")
        assert update_data.academic_year_id == 2
        assert update_data.all_by_default == False

    def test_fee_class_mapping_update_negative_total_fee(self):
        """Test fee class mapping update with negative total_fee"""
        with pytest.raises(ValidationError) as exc_info:
            FeeClassMappingUpdate(
                total_fee=Decimal("-200.00")
            )
        
        errors = exc_info.value.errors()
        assert any("total_fee must be non-negative" in str(error["msg"]) for error in errors)

    def test_fee_class_mapping_read_model(self):
        """Test fee class mapping read model"""
        read_data = {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "class_id": 1,
            "fee_type_id": "123e4567-e89b-12d3-a456-426614174001",
            "total_fee": Decimal("5000.00"),
            "academic_year_id": 1,
            "all_by_default": True,
            "class_name": "Grade 1",
            "fee_type_name": "Tuition Fee",
            "academic_year_name": "2024-2025"
        }
        
        mapping = FeeClassMappingRead.model_validate(read_data)
        assert mapping.id == "123e4567-e89b-12d3-a456-426614174000"
        assert mapping.class_id == 1
        assert mapping.fee_type_id == "123e4567-e89b-12d3-a456-426614174001"
        assert mapping.total_fee == Decimal("5000.00")
        assert mapping.academic_year_id == 1
        assert mapping.all_by_default == True
        assert mapping.class_name == "Grade 1"
        assert mapping.fee_type_name == "Tuition Fee"
        assert mapping.academic_year_name == "2024-2025"

    def test_fee_class_mapping_list_model(self):
        """Test fee class mapping list model"""
        list_data = {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "class_id": 2,
            "class_name": "Grade 2",
            "fee_type_id": "123e4567-e89b-12d3-a456-426614174001",
            "fee_type_name": "Library Fee",
            "total_fee": Decimal("1500.00"),
            "academic_year_id": 1,
            "academic_year_name": "2024-2025",
            "all_by_default": False
        }
        
        mapping = FeeClassMappingList.model_validate(list_data)
        assert mapping.id == "123e4567-e89b-12d3-a456-426614174000"
        assert mapping.class_id == 2
        assert mapping.class_name == "Grade 2"
        assert mapping.fee_type_id == "123e4567-e89b-12d3-a456-426614174001"
        assert mapping.fee_type_name == "Library Fee"
        assert mapping.total_fee == Decimal("1500.00")
        assert mapping.academic_year_id == 1
        assert mapping.academic_year_name == "2024-2025"
        assert mapping.all_by_default == False

    def test_fee_class_mapping_read_with_minimal_data(self):
        """Test fee class mapping read model with minimal required data"""
        read_data = {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "class_id": 3,
            "fee_type_id": "123e4567-e89b-12d3-a456-426614174001",
            "total_fee": Decimal("2000.00"),
            "academic_year_id": 1,
            "all_by_default": False
        }
        
        mapping = FeeClassMappingRead.model_validate(read_data)
        assert mapping.id == "123e4567-e89b-12d3-a456-426614174000"
        assert mapping.class_id == 3
        assert mapping.fee_type_id == "123e4567-e89b-12d3-a456-426614174001"
        assert mapping.total_fee == Decimal("2000.00")
        assert mapping.academic_year_id == 1
        assert mapping.all_by_default == False
        assert mapping.class_name is None  # Optional field
        assert mapping.fee_type_name is None  # Optional field
        assert mapping.academic_year_name is None  # Optional field

    def test_fee_class_mapping_decimal_precision(self):
        """Test fee class mapping with decimal precision"""
        mapping = FeeClassMappingCreate(
            class_id=1,
            fee_type_id="123e4567-e89b-12d3-a456-426614174001",
            total_fee=Decimal("4999.99"),
            academic_year_id=1
        )
        
        assert mapping.total_fee == Decimal("4999.99")
        assert str(mapping.total_fee) == "4999.99"

    def test_fee_class_mapping_boolean_validation(self):
        """Test fee class mapping boolean field validation"""
        # Test with True
        mapping_true = FeeClassMappingCreate(
            class_id=1,
            fee_type_id="123e4567-e89b-12d3-a456-426614174001",
            total_fee=Decimal("5000.00"),
            academic_year_id=1,
            all_by_default=True
        )
        assert mapping_true.all_by_default is True
        
        # Test with False
        mapping_false = FeeClassMappingCreate(
            class_id=1,
            fee_type_id="123e4567-e89b-12d3-a456-426614174001",
            total_fee=Decimal("5000.00"),
            academic_year_id=1,
            all_by_default=False
        )
        assert mapping_false.all_by_default is False