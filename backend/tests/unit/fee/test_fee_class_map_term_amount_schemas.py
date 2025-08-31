"""
Unit tests for Fee Class Mapping Term Amount schemas
"""
import pytest
from pydantic import ValidationError
from decimal import Decimal

from app.schemas.fee.fee_class_map_term_amount_schema import (
    FeeClassMappingTermAmountCreate,
    FeeClassMappingTermAmountUpdate,
    FeeClassMappingTermAmountRead,
    FeeClassMappingTermAmountBulkCreate,
    FeeClassMappingTermAmountBulkUpdate,
    FeeClassMappingTermAmountBulkDelete
)

class TestFeeClassMappingTermAmountSchemas:
    """Test Fee Class Mapping Term Amount Pydantic schemas"""

    def test_fee_class_mapping_term_amount_create_valid(self):
        """Test valid fee class mapping term amount creation"""
        term_amount = FeeClassMappingTermAmountCreate(
            term_id="123e4567-e89b-12d3-a456-426614174001",
            term_amount=Decimal("1250.00")
        )
        
        assert term_amount.term_id == "123e4567-e89b-12d3-a456-426614174001"
        assert term_amount.term_amount == Decimal("1250.00")
        assert term_amount.fee_class_mapping_id is None

    def test_fee_class_mapping_term_amount_create_with_mapping_id(self):
        """Test fee class mapping term amount creation with mapping ID"""
        term_amount = FeeClassMappingTermAmountCreate(
            term_id="123e4567-e89b-12d3-a456-426614174001",
            term_amount=Decimal("1250.00"),
            fee_class_mapping_id="123e4567-e89b-12d3-a456-426614174002"
        )
        
        assert term_amount.fee_class_mapping_id == "123e4567-e89b-12d3-a456-426614174002"

    def test_fee_class_mapping_term_amount_create_required_fields(self):
        """Test fee class mapping term amount creation with missing required fields"""
        with pytest.raises(ValidationError) as exc_info:
            FeeClassMappingTermAmountCreate(
                term_id="123e4567-e89b-12d3-a456-426614174001"
                # Missing term_amount
            )
        
        errors = exc_info.value.errors()
        error_fields = [error["loc"][0] for error in errors]
        assert "term_amount" in error_fields

    def test_fee_class_mapping_term_amount_create_zero_amount(self):
        """Test fee class mapping term amount creation with zero amount"""
        with pytest.raises(ValidationError) as exc_info:
            FeeClassMappingTermAmountCreate(
                term_id="123e4567-e89b-12d3-a456-426614174001",
                term_amount=Decimal("0.00")
            )
        
        errors = exc_info.value.errors()
        assert any("term_amount must be positive" in str(error["msg"]) for error in errors)

    def test_fee_class_mapping_term_amount_create_negative_amount(self):
        """Test fee class mapping term amount creation with negative amount"""
        with pytest.raises(ValidationError) as exc_info:
            FeeClassMappingTermAmountCreate(
                term_id="123e4567-e89b-12d3-a456-426614174001",
                term_amount=Decimal("-100.00")
            )
        
        errors = exc_info.value.errors()
        assert any("term_amount must be positive" in str(error["msg"]) for error in errors)

    def test_fee_class_mapping_term_amount_update_valid(self):
        """Test valid fee class mapping term amount update"""
        term_amount = FeeClassMappingTermAmountUpdate(
            id="123e4567-e89b-12d3-a456-426614174003",
            term_id="123e4567-e89b-12d3-a456-426614174001",
            term_amount=Decimal("1500.00")
        )
        
        assert term_amount.id == "123e4567-e89b-12d3-a456-426614174003"
        assert term_amount.term_id == "123e4567-e89b-12d3-a456-426614174001"
        assert term_amount.term_amount == Decimal("1500.00")

    def test_fee_class_mapping_term_amount_update_without_id(self):
        """Test fee class mapping term amount update without ID (for new record)"""
        term_amount = FeeClassMappingTermAmountUpdate(
            term_id="123e4567-e89b-12d3-a456-426614174001",
            term_amount=Decimal("1500.00")
        )
        
        assert term_amount.id is None
        assert term_amount.term_id == "123e4567-e89b-12d3-a456-426614174001"
        assert term_amount.term_amount == Decimal("1500.00")

    def test_fee_class_mapping_term_amount_update_negative_amount(self):
        """Test fee class mapping term amount update with negative amount"""
        with pytest.raises(ValidationError) as exc_info:
            FeeClassMappingTermAmountUpdate(
                term_id="123e4567-e89b-12d3-a456-426614174001",
                term_amount=Decimal("-200.00")
            )
        
        errors = exc_info.value.errors()
        assert any("term_amount must be positive" in str(error["msg"]) for error in errors)

    def test_fee_class_mapping_term_amount_read_model(self):
        """Test fee class mapping term amount read model"""
        read_data = {
            "id": "123e4567-e89b-12d3-a456-426614174003",
            "term_id": "123e4567-e89b-12d3-a456-426614174001",
            "term_amount": Decimal("1250.00"),
            "fee_class_mapping_id": "123e4567-e89b-12d3-a456-426614174002",
            "term_name": "First Term"
        }
        
        term_amount = FeeClassMappingTermAmountRead.model_validate(read_data)
        assert term_amount.id == "123e4567-e89b-12d3-a456-426614174003"
        assert term_amount.term_id == "123e4567-e89b-12d3-a456-426614174001"
        assert term_amount.term_amount == Decimal("1250.00")
        assert term_amount.fee_class_mapping_id == "123e4567-e89b-12d3-a456-426614174002"
        assert term_amount.term_name == "First Term"

    def test_fee_class_mapping_term_amount_read_minimal_data(self):
        """Test fee class mapping term amount read model with minimal data"""
        read_data = {
            "id": "123e4567-e89b-12d3-a456-426614174003",
            "term_id": "123e4567-e89b-12d3-a456-426614174001",
            "term_amount": Decimal("1250.00"),
            "fee_class_mapping_id": "123e4567-e89b-12d3-a456-426614174002"
        }
        
        term_amount = FeeClassMappingTermAmountRead.model_validate(read_data)
        assert term_amount.term_name is None  # Optional field

    def test_fee_class_mapping_term_amount_bulk_create_valid(self):
        """Test valid bulk create schema"""
        bulk_data = FeeClassMappingTermAmountBulkCreate(
            fee_class_mapping_id="123e4567-e89b-12d3-a456-426614174002",
            term_amounts=[
                FeeClassMappingTermAmountCreate(
                    term_id="123e4567-e89b-12d3-a456-426614174001",
                    term_amount=Decimal("1250.00")
                ),
                FeeClassMappingTermAmountCreate(
                    term_id="123e4567-e89b-12d3-a456-426614174004",
                    term_amount=Decimal("1250.00")
                )
            ]
        )
        
        assert bulk_data.fee_class_mapping_id == "123e4567-e89b-12d3-a456-426614174002"
        assert len(bulk_data.term_amounts) == 2
        assert bulk_data.term_amounts[0].term_amount == Decimal("1250.00")

    def test_fee_class_mapping_term_amount_bulk_create_empty_list(self):
        """Test bulk create with empty term amounts list"""
        with pytest.raises(ValidationError) as exc_info:
            FeeClassMappingTermAmountBulkCreate(
                fee_class_mapping_id="123e4567-e89b-12d3-a456-426614174002",
                term_amounts=[]
            )
        
        errors = exc_info.value.errors()
        assert any("term_amounts list cannot be empty" in str(error["msg"]) for error in errors)

    def test_fee_class_mapping_term_amount_bulk_update_valid(self):
        """Test valid bulk update schema"""
        bulk_data = FeeClassMappingTermAmountBulkUpdate(
            fee_class_mapping_id="123e4567-e89b-12d3-a456-426614174002",
            term_amounts=[
                FeeClassMappingTermAmountUpdate(
                    id="123e4567-e89b-12d3-a456-426614174003",
                    term_id="123e4567-e89b-12d3-a456-426614174001",
                    term_amount=Decimal("1500.00")
                ),
                FeeClassMappingTermAmountUpdate(
                    term_id="123e4567-e89b-12d3-a456-426614174004",
                    term_amount=Decimal("1000.00")
                )
            ]
        )
        
        assert bulk_data.fee_class_mapping_id == "123e4567-e89b-12d3-a456-426614174002"
        assert len(bulk_data.term_amounts) == 2
        assert bulk_data.term_amounts[0].id == "123e4567-e89b-12d3-a456-426614174003"
        assert bulk_data.term_amounts[1].id is None  # New record

    def test_fee_class_mapping_term_amount_bulk_update_empty_list(self):
        """Test bulk update with empty term amounts list"""
        with pytest.raises(ValidationError) as exc_info:
            FeeClassMappingTermAmountBulkUpdate(
                fee_class_mapping_id="123e4567-e89b-12d3-a456-426614174002",
                term_amounts=[]
            )
        
        errors = exc_info.value.errors()
        assert any("term_amounts list cannot be empty" in str(error["msg"]) for error in errors)

    def test_fee_class_mapping_term_amount_bulk_delete_valid(self):
        """Test valid bulk delete schema"""
        bulk_data = FeeClassMappingTermAmountBulkDelete(
            term_amount_ids=[
                "123e4567-e89b-12d3-a456-426614174003",
                "123e4567-e89b-12d3-a456-426614174005"
            ]
        )
        
        assert len(bulk_data.term_amount_ids) == 2
        assert "123e4567-e89b-12d3-a456-426614174003" in bulk_data.term_amount_ids

    def test_fee_class_mapping_term_amount_bulk_delete_empty_list(self):
        """Test bulk delete with empty IDs list"""
        with pytest.raises(ValidationError) as exc_info:
            FeeClassMappingTermAmountBulkDelete(
                term_amount_ids=[]
            )
        
        errors = exc_info.value.errors()
        assert any("term_amount_ids list cannot be empty" in str(error["msg"]) for error in errors)

    def test_fee_class_mapping_term_amount_decimal_precision(self):
        """Test fee class mapping term amount with decimal precision"""
        term_amount = FeeClassMappingTermAmountCreate(
            term_id="123e4567-e89b-12d3-a456-426614174001",
            term_amount=Decimal("1249.99")
        )
        
        assert term_amount.term_amount == Decimal("1249.99")
        assert str(term_amount.term_amount) == "1249.99"