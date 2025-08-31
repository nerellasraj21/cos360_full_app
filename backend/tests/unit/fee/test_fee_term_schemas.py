"""
Unit tests for Fee Term schemas
"""
import pytest
from datetime import date
from pydantic import ValidationError

from app.schemas.fee.fee_term_schema import FeeTermCreate, FeeTermUpdate, FeeTermRead
from app.schemas.fee.fee_term_dates_schema import FeeTermDatesCreate

class TestFeeTermSchemas:
    """Test Fee Term Pydantic schemas"""

    def test_fee_term_create_valid(self):
        """Test valid fee term creation"""
        fee_dates = [
            FeeTermDatesCreate(fee_term_date=date(2024, 1, 15)),
            FeeTermDatesCreate(fee_term_date=date(2024, 4, 15)),
            FeeTermDatesCreate(fee_term_date=date(2024, 7, 15)),
            FeeTermDatesCreate(fee_term_date=date(2024, 10, 15))
        ]
        
        fee_term = FeeTermCreate(
            term_name="Quarterly",
            term_status="active",
            number_of_terms=4,
            academic_year_id=1,
            fee_term_dates=fee_dates
        )
        
        assert fee_term.term_name == "Quarterly"
        assert fee_term.term_status == "active"
        assert fee_term.number_of_terms == 4
        assert fee_term.academic_year_id == 1
        assert len(fee_term.fee_term_dates) == 4

    def test_fee_term_create_mismatched_dates_count(self):
        """Test fee term creation with mismatched dates count"""
        fee_dates = [
            FeeTermDatesCreate(fee_term_date=date(2024, 1, 15)),
            FeeTermDatesCreate(fee_term_date=date(2024, 4, 15))
        ]
        
        with pytest.raises(ValidationError) as exc_info:
            FeeTermCreate(
                term_name="Quarterly",
                term_status="active",
                number_of_terms=4,
                academic_year_id=1,
                fee_term_dates=fee_dates
            )
        
        assert "Number of fee term dates (2) must match number_of_terms (4)" in str(exc_info.value)

    def test_fee_term_create_duplicate_dates(self):
        """Test fee term creation with duplicate dates"""
        fee_dates = [
            FeeTermDatesCreate(fee_term_date=date(2024, 1, 15)),
            FeeTermDatesCreate(fee_term_date=date(2024, 1, 15)),  # Duplicate
            FeeTermDatesCreate(fee_term_date=date(2024, 7, 15)),
            FeeTermDatesCreate(fee_term_date=date(2024, 10, 15))
        ]
        
        with pytest.raises(ValidationError) as exc_info:
            FeeTermCreate(
                term_name="Quarterly",
                term_status="active",
                number_of_terms=4,
                academic_year_id=1,
                fee_term_dates=fee_dates
            )
        
        assert "Duplicate fee term dates are not allowed" in str(exc_info.value)

    def test_fee_term_update_partial(self):
        """Test fee term partial update"""
        update_data = FeeTermUpdate(
            term_name="Updated Term",
            number_of_terms=2
        )
        
        assert update_data.term_name == "Updated Term"
        assert update_data.number_of_terms == 2
        assert update_data.term_status is None
        assert update_data.academic_year_id is None

    def test_fee_term_update_with_dates_validation(self):
        """Test fee term update with dates validation"""
        fee_dates = [
            FeeTermDatesCreate(fee_term_date=date(2024, 1, 15)),
            FeeTermDatesCreate(fee_term_date=date(2024, 7, 15))
        ]
        
        update_data = FeeTermUpdate(
            number_of_terms=2,
            fee_term_dates=fee_dates
        )
        
        assert len(update_data.fee_term_dates) == 2
        assert update_data.number_of_terms == 2