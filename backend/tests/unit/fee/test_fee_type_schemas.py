"""
Unit tests for Fee Type schemas
"""
import pytest
from pydantic import ValidationError

from app.schemas.fee.fee_type_schema import (
    FeeTypeCreate, 
    FeeTypeUpdate, 
    FeeTypeRead,
    FeeTypeDropdown
)

class TestFeeTypeSchemas:
    """Test Fee Type Pydantic schemas"""

    def test_fee_type_create_valid(self):
        """Test valid fee type creation"""
        fee_type = FeeTypeCreate(
            type_name="Tuition Fee",
            fee_category_id="123e4567-e89b-12d3-a456-426614174001",
            fee_status="active",
            fee_term_id="123e4567-e89b-12d3-a456-426614174002",
            academic_year_id=1
        )
        
        assert fee_type.type_name == "Tuition Fee"
        assert fee_type.fee_category_id == "123e4567-e89b-12d3-a456-426614174001"
        assert fee_type.fee_status == "active"
        assert fee_type.fee_term_id == "123e4567-e89b-12d3-a456-426614174002"
        assert fee_type.academic_year_id == 1

    def test_fee_type_create_default_status(self):
        """Test fee type creation with default status"""
        fee_type = FeeTypeCreate(
            type_name="Books Fee",
            fee_category_id="123e4567-e89b-12d3-a456-426614174001",
            fee_term_id="123e4567-e89b-12d3-a456-426614174002",
            academic_year_id=1
        )
        
        assert fee_type.type_name == "Books Fee"
        assert fee_type.fee_status == "active"  # Default value
        assert fee_type.academic_year_id == 1

    def test_fee_type_create_required_fields(self):
        """Test fee type creation with missing required fields"""
        with pytest.raises(ValidationError) as exc_info:
            FeeTypeCreate(
                type_name="Incomplete Fee"
                # Missing fee_category_id, fee_term_id, academic_year_id
            )
        
        errors = exc_info.value.errors()
        error_fields = [error["loc"][0] for error in errors]
        assert "fee_category_id" in error_fields
        assert "fee_term_id" in error_fields
        assert "academic_year_id" in error_fields

    def test_fee_type_create_invalid_status(self):
        """Test fee type creation with invalid status"""
        with pytest.raises(ValidationError) as exc_info:
            FeeTypeCreate(
                type_name="Test Fee",
                fee_category_id="123e4567-e89b-12d3-a456-426614174001",
                fee_status="invalid_status",
                fee_term_id="123e4567-e89b-12d3-a456-426614174002",
                academic_year_id=1
            )
        
        errors = exc_info.value.errors()
        assert any("fee_status must be either" in str(error["msg"]) for error in errors)

    def test_fee_type_create_valid_statuses(self):
        """Test fee type creation with valid statuses"""
        # Test active status
        fee_type_active = FeeTypeCreate(
            type_name="Test Fee Active",
            fee_category_id="123e4567-e89b-12d3-a456-426614174001",
            fee_status="active",
            fee_term_id="123e4567-e89b-12d3-a456-426614174002",
            academic_year_id=1
        )
        assert fee_type_active.fee_status == "active"
        
        # Test inactive status
        fee_type_inactive = FeeTypeCreate(
            type_name="Test Fee Inactive",
            fee_category_id="123e4567-e89b-12d3-a456-426614174001",
            fee_status="inactive",
            fee_term_id="123e4567-e89b-12d3-a456-426614174002",
            academic_year_id=1
        )
        assert fee_type_inactive.fee_status == "inactive"

    def test_fee_type_update_partial(self):
        """Test fee type partial update"""
        update_data = FeeTypeUpdate(
            type_name="Updated Tuition Fee"
        )
        
        assert update_data.type_name == "Updated Tuition Fee"
        assert update_data.fee_category_id is None
        assert update_data.fee_status is None
        assert update_data.fee_term_id is None
        assert update_data.academic_year_id is None

    def test_fee_type_update_all_fields(self):
        """Test fee type update with all fields"""
        update_data = FeeTypeUpdate(
            type_name="Updated Fee",
            fee_category_id="123e4567-e89b-12d3-a456-426614174003",
            fee_status="inactive",
            fee_term_id="123e4567-e89b-12d3-a456-426614174004",
            academic_year_id=2
        )
        
        assert update_data.type_name == "Updated Fee"
        assert update_data.fee_category_id == "123e4567-e89b-12d3-a456-426614174003"
        assert update_data.fee_status == "inactive"
        assert update_data.fee_term_id == "123e4567-e89b-12d3-a456-426614174004"
        assert update_data.academic_year_id == 2

    def test_fee_type_update_invalid_status(self):
        """Test fee type update with invalid status"""
        with pytest.raises(ValidationError) as exc_info:
            FeeTypeUpdate(
                fee_status="invalid_status"
            )
        
        errors = exc_info.value.errors()
        assert any("fee_status must be either" in str(error["msg"]) for error in errors)

    def test_fee_type_read_model(self):
        """Test fee type read model"""
        # This would typically be created from a database model
        # but we're testing the schema structure
        read_data = {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "type_name": "Tuition Fee",
            "fee_category_id": "123e4567-e89b-12d3-a456-426614174001",
            "fee_status": "active",
            "fee_term_id": "123e4567-e89b-12d3-a456-426614174002",
            "academic_year_id": 1,
            "fee_category_name": "Academic Fee",
            "fee_term_name": "Quarterly",
            "academic_year_name": "2024-2025",
            "fee_term_dates": []
        }
        
        fee_type = FeeTypeRead.model_validate(read_data)
        assert fee_type.id == "123e4567-e89b-12d3-a456-426614174000"
        assert fee_type.type_name == "Tuition Fee"
        assert fee_type.fee_category_name == "Academic Fee"
        assert fee_type.fee_term_name == "Quarterly"
        assert fee_type.academic_year_name == "2024-2025"
        assert fee_type.fee_term_dates == []

    def test_fee_type_dropdown_model(self):
        """Test fee type dropdown model"""
        dropdown_data = {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "type_name": "Books Fee"
        }
        
        dropdown = FeeTypeDropdown.model_validate(dropdown_data)
        assert dropdown.id == "123e4567-e89b-12d3-a456-426614174000"
        assert dropdown.type_name == "Books Fee"

    def test_fee_type_read_with_minimal_data(self):
        """Test fee type read model with minimal required data"""
        read_data = {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "type_name": "Library Fee",
            "fee_category_id": "123e4567-e89b-12d3-a456-426614174001",
            "fee_status": "active",
            "fee_term_id": "123e4567-e89b-12d3-a456-426614174002",
            "academic_year_id": 1
        }
        
        fee_type = FeeTypeRead.model_validate(read_data)
        assert fee_type.id == "123e4567-e89b-12d3-a456-426614174000"
        assert fee_type.type_name == "Library Fee"
        assert fee_type.fee_category_name is None  # Optional field
        assert fee_type.fee_term_name is None  # Optional field
        assert fee_type.academic_year_name is None  # Optional field
        assert fee_type.fee_term_dates == []  # Default empty list