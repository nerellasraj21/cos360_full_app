"""
Integration tests for Fee Term API endpoints
"""
import pytest
from datetime import date

from app.models.masters.academic_year_model import AcademicYear
from app.models.fee.fee_term_model import FeeTerm
from app.models.fee.fee_term_dates_model import FeeTermDates

class TestFeeTermAPI:
    """Test Fee Term API endpoints"""

    @pytest.fixture
    async def setup_academic_year(self, test_db_session):
        """Create an academic year for testing"""
        academic_year = AcademicYear(
            title="2024-2025",
            is_active=True,
            start_date=date(2024, 4, 1),
            end_date=date(2025, 3, 31)
        )
        test_db_session.add(academic_year)
        await test_db_session.commit()
        await test_db_session.refresh(academic_year)
        return academic_year

    @pytest.mark.api
    async def test_create_fee_term_success(self, test_client, setup_academic_year):
        """Test successful fee term creation"""
        academic_year = setup_academic_year
        
        fee_term_data = {
            "term_name": "Quarterly",
            "term_status": "active",
            "number_of_terms": 4,
            "academic_year_id": academic_year.id,
            "fee_term_dates": [
                {"fee_term_date": "2024-01-15"},
                {"fee_term_date": "2024-04-15"},
                {"fee_term_date": "2024-07-15"},
                {"fee_term_date": "2024-10-15"}
            ]
        }
        
        response = await test_client.post("/api/v1/fee/terms/", json=fee_term_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["term_name"] == "Quarterly"
        assert data["term_status"] == "active"
        assert data["number_of_terms"] == 4
        assert data["academic_year_id"] == academic_year.id
        assert len(data["fee_term_dates"]) == 4

    @pytest.mark.api
    async def test_create_fee_term_invalid_academic_year(self, test_client):
        """Test fee term creation with invalid academic year"""
        fee_term_data = {
            "term_name": "Quarterly",
            "term_status": "active",
            "number_of_terms": 4,
            "academic_year_id": 999,  # Non-existent
            "fee_term_dates": [
                {"fee_term_date": "2024-01-15"},
                {"fee_term_date": "2024-04-15"},
                {"fee_term_date": "2024-07-15"},
                {"fee_term_date": "2024-10-15"}
            ]
        }
        
        response = await test_client.post("/api/v1/fee/terms/", json=fee_term_data)
        
        assert response.status_code == 404
        assert "Academic year with id 999 not found" in response.json()["detail"]

    @pytest.mark.api
    async def test_create_fee_term_mismatched_dates_count(self, test_client, setup_academic_year):
        """Test fee term creation with mismatched dates count"""
        academic_year = setup_academic_year
        
        fee_term_data = {
            "term_name": "Quarterly",
            "term_status": "active",
            "number_of_terms": 4,
            "academic_year_id": academic_year.id,
            "fee_term_dates": [
                {"fee_term_date": "2024-01-15"},
                {"fee_term_date": "2024-04-15"}  # Only 2 dates for 4 terms
            ]
        }
        
        response = await test_client.post("/api/v1/fee/terms/", json=fee_term_data)
        
        assert response.status_code == 422  # Validation error
        error_detail = response.json()["detail"][0]
        assert "Number of fee term dates (2) must match number_of_terms (4)" in error_detail["msg"]

    @pytest.mark.api
    async def test_get_fee_term_success(self, test_client, test_db_session, setup_academic_year):
        """Test successful fee term retrieval"""
        academic_year = setup_academic_year
        
        # Create a fee term
        fee_term = FeeTerm(
            term_name="Test Term",
            term_status="active",
            number_of_terms=2,
            academic_year_id=academic_year.id
        )
        test_db_session.add(fee_term)
        await test_db_session.flush()
        
        # Add fee term dates
        dates = [
            FeeTermDates(term_id=fee_term.id, fee_term_date=date(2024, 1, 15)),
            FeeTermDates(term_id=fee_term.id, fee_term_date=date(2024, 7, 15))
        ]
        for fee_date in dates:
            test_db_session.add(fee_date)
        
        await test_db_session.commit()
        
        response = await test_client.get(f"/api/v1/fee/terms/{fee_term.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["term_name"] == "Test Term"
        assert data["term_status"] == "active"
        assert data["number_of_terms"] == 2
        assert len(data["fee_term_dates"]) == 2

    @pytest.mark.api
    async def test_get_fee_term_not_found(self, test_client):
        """Test fee term retrieval with non-existent ID"""
        non_existent_id = "123e4567-e89b-12d3-a456-426614174000"
        
        response = await test_client.get(f"/api/v1/fee/terms/{non_existent_id}")
        
        assert response.status_code == 404
        assert f"Fee term with id {non_existent_id} not found" in response.json()["detail"]

    @pytest.mark.api
    async def test_get_all_fee_terms(self, test_client, test_db_session, setup_academic_year):
        """Test retrieving all fee terms"""
        academic_year = setup_academic_year
        
        # Create multiple fee terms
        terms = [
            FeeTerm(term_name="Term 1", term_status="active", number_of_terms=2, academic_year_id=academic_year.id),
            FeeTerm(term_name="Term 2", term_status="inactive", number_of_terms=3, academic_year_id=academic_year.id)
        ]
        
        for term in terms:
            test_db_session.add(term)
        
        await test_db_session.commit()
        
        response = await test_client.get("/api/v1/fee/terms/")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2
        term_names = [term["term_name"] for term in data]
        assert "Term 1" in term_names
        assert "Term 2" in term_names

    @pytest.mark.api
    async def test_update_fee_term_success(self, test_client, test_db_session, setup_academic_year):
        """Test successful fee term update"""
        academic_year = setup_academic_year
        
        # Create a fee term
        fee_term = FeeTerm(
            term_name="Original Term",
            term_status="active",
            number_of_terms=2,
            academic_year_id=academic_year.id
        )
        test_db_session.add(fee_term)
        await test_db_session.commit()
        
        # Update the fee term
        update_data = {
            "term_name": "Updated Term",
            "term_status": "inactive"
        }
        
        response = await test_client.put(f"/api/v1/fee/terms/{fee_term.id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["term_name"] == "Updated Term"
        assert data["term_status"] == "inactive"
        assert data["number_of_terms"] == 2  # Unchanged

    @pytest.mark.api
    async def test_delete_fee_term_success(self, test_client, test_db_session, setup_academic_year):
        """Test successful fee term deletion"""
        academic_year = setup_academic_year
        
        # Create a fee term
        fee_term = FeeTerm(
            term_name="Term to Delete",
            term_status="active",
            number_of_terms=1,
            academic_year_id=academic_year.id
        )
        test_db_session.add(fee_term)
        await test_db_session.commit()
        
        response = await test_client.delete(f"/api/v1/fee/terms/{fee_term.id}")
        
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]
        
        # Verify it's actually deleted
        get_response = await test_client.get(f"/api/v1/fee/terms/{fee_term.id}")
        assert get_response.status_code == 404