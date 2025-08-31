"""
Unit tests for Fee Category schemas
"""
import pytest
from pydantic import ValidationError

from app.schemas.fee.fee_category_schema import (
    FeeCategoryCreate, 
    FeeCategoryUpdate, 
    FeeCategoryRead,
    FeeCategoryDropdown
)

class TestFeeCategorySchemas:
    """Test Fee Category Pydantic schemas"""

    def test_fee_category_create_valid(self):
        """Test valid fee category creation"""
        category = FeeCategoryCreate(
            category_name="Academic Fee",
            category_status="active",
            academic_year_id=1
        )
        
        assert category.category_name == "Academic Fee"
        assert category.category_status == "active"
        assert category.academic_year_id == 1

    def test_fee_category_create_default_status(self):
        """Test fee category creation with default status"""
        category = FeeCategoryCreate(
            category_name="Transport Fee",
            academic_year_id=1
        )
        
        assert category.category_name == "Transport Fee"
        assert category.category_status == "active"  # Default value
        assert category.academic_year_id == 1

    def test_fee_category_create_required_fields(self):
        """Test fee category creation with missing required fields"""
        with pytest.raises(ValidationError) as exc_info:
            FeeCategoryCreate(
                category_status="active"
                # Missing category_name and academic_year_id
            )
        
        errors = exc_info.value.errors()
        error_fields = [error["loc"][0] for error in errors]
        assert "category_name" in error_fields
        assert "academic_year_id" in error_fields

    def test_fee_category_update_partial(self):
        """Test fee category partial update"""
        update_data = FeeCategoryUpdate(
            category_name="Updated Academic Fee"
        )
        
        assert update_data.category_name == "Updated Academic Fee"
        assert update_data.category_status is None
        assert update_data.academic_year_id is None

    def test_fee_category_update_all_fields(self):
        """Test fee category update with all fields"""
        update_data = FeeCategoryUpdate(
            category_name="Updated Fee",
            category_status="inactive",
            academic_year_id=2
        )
        
        assert update_data.category_name == "Updated Fee"
        assert update_data.category_status == "inactive"
        assert update_data.academic_year_id == 2

    def test_fee_category_read_model(self):
        """Test fee category read model"""
        # This would typically be created from a database model
        # but we're testing the schema structure
        read_data = {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "category_name": "Academic Fee",
            "category_status": "active",
            "academic_year_id": 1,
            "academic_year_title": "2024-2025"
        }
        
        category = FeeCategoryRead.model_validate(read_data)
        assert category.id == "123e4567-e89b-12d3-a456-426614174000"
        assert category.category_name == "Academic Fee"
        assert category.academic_year_title == "2024-2025"

    def test_fee_category_dropdown_model(self):
        """Test fee category dropdown model"""
        dropdown_data = {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "category_name": "Transport Fee"
        }
        
        dropdown = FeeCategoryDropdown.model_validate(dropdown_data)
        assert dropdown.id == "123e4567-e89b-12d3-a456-426614174000"
        assert dropdown.category_name == "Transport Fee"