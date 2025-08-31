"""
Integration tests for Fee Type API endpoints
"""
import pytest
from datetime import date

from app.models.masters.academic_year_model import AcademicYear
from app.models.fee.fee_category_model import FeeCategory
from app.models.fee.fee_term_model import FeeTerm
from app.models.fee.fee_term_dates_model import FeeTermDates
from app.models.fee.fee_type_model import FeeType

class TestFeeTypeAPI:
    """Test Fee Type API endpoints"""

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

    @pytest.fixture
    async def setup_fee_category(self, test_db_session, setup_academic_year):
        """Create a fee category for testing"""
        academic_year = setup_academic_year
        fee_category = FeeCategory(
            category_name="Academic Fee",
            category_status="active",
            academic_year_id=academic_year.id
        )
        test_db_session.add(fee_category)
        await test_db_session.commit()
        await test_db_session.refresh(fee_category)
        return fee_category

    @pytest.fixture
    async def setup_second_fee_category(self, test_db_session, setup_academic_year):
        """Create a second fee category for testing"""
        academic_year = setup_academic_year
        fee_category = FeeCategory(
            category_name="Transport Fee",
            category_status="active",
            academic_year_id=academic_year.id
        )
        test_db_session.add(fee_category)
        await test_db_session.commit()
        await test_db_session.refresh(fee_category)
        return fee_category

    @pytest.fixture
    async def setup_fee_term(self, test_db_session, setup_academic_year):
        """Create a fee term with dates for testing"""
        academic_year = setup_academic_year
        fee_term = FeeTerm(
            term_name="Quarterly",
            term_status="active",
            number_of_terms=4,
            academic_year_id=academic_year.id
        )
        test_db_session.add(fee_term)
        await test_db_session.commit()
        await test_db_session.refresh(fee_term)
        
        # Add fee term dates
        term_dates = [
            FeeTermDates(fee_term_id=fee_term.id, fee_term_date=date(2024, 6, 1)),
            FeeTermDates(fee_term_id=fee_term.id, fee_term_date=date(2024, 9, 1)),
            FeeTermDates(fee_term_id=fee_term.id, fee_term_date=date(2024, 12, 1)),
            FeeTermDates(fee_term_id=fee_term.id, fee_term_date=date(2025, 3, 1))
        ]
        
        for term_date in term_dates:
            test_db_session.add(term_date)
        
        await test_db_session.commit()
        return fee_term

    @pytest.mark.api
    async def test_create_fee_type_success(self, test_client, setup_academic_year, setup_fee_category, setup_fee_term):
        """Test successful fee type creation"""
        academic_year = setup_academic_year
        fee_category = setup_fee_category
        fee_term = setup_fee_term
        
        fee_type_data = {
            "type_name": "Tuition Fee",
            "fee_category_id": str(fee_category.id),
            "fee_status": "active",
            "fee_term_id": str(fee_term.id),
            "academic_year_id": academic_year.id
        }
        
        response = await test_client.post("/api/v1/fee/types/", json=fee_type_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["type_name"] == "Tuition Fee"
        assert data["fee_category_id"] == str(fee_category.id)
        assert data["fee_status"] == "active"
        assert data["fee_term_id"] == str(fee_term.id)
        assert data["academic_year_id"] == academic_year.id
        assert data["fee_category_name"] == "Academic Fee"
        assert data["fee_term_name"] == "Quarterly"
        assert data["academic_year_name"] == "2024-2025"
        assert len(data["fee_term_dates"]) == 4
        assert "id" in data

    @pytest.mark.api
    async def test_create_fee_type_default_status(self, test_client, setup_academic_year, setup_fee_category, setup_fee_term):
        """Test fee type creation with default status"""
        academic_year = setup_academic_year
        fee_category = setup_fee_category
        fee_term = setup_fee_term
        
        fee_type_data = {
            "type_name": "Books Fee",
            "fee_category_id": str(fee_category.id),
            "fee_term_id": str(fee_term.id),
            "academic_year_id": academic_year.id
        }
        
        response = await test_client.post("/api/v1/fee/types/", json=fee_type_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["type_name"] == "Books Fee"
        assert data["fee_status"] == "active"  # Default value

    @pytest.mark.api
    async def test_create_fee_type_invalid_status(self, test_client, setup_academic_year, setup_fee_category, setup_fee_term):
        """Test fee type creation with invalid status"""
        academic_year = setup_academic_year
        fee_category = setup_fee_category
        fee_term = setup_fee_term
        
        fee_type_data = {
            "type_name": "Invalid Fee",
            "fee_category_id": str(fee_category.id),
            "fee_status": "invalid_status",
            "fee_term_id": str(fee_term.id),
            "academic_year_id": academic_year.id
        }
        
        response = await test_client.post("/api/v1/fee/types/", json=fee_type_data)
        
        assert response.status_code == 422  # Validation error
        assert "fee_status must be either" in str(response.json())

    @pytest.mark.api
    async def test_create_fee_type_invalid_academic_year(self, test_client, setup_fee_category, setup_fee_term):
        """Test fee type creation with invalid academic year"""
        fee_category = setup_fee_category
        fee_term = setup_fee_term
        
        fee_type_data = {
            "type_name": "Invalid Fee",
            "fee_category_id": str(fee_category.id),
            "fee_status": "active",
            "fee_term_id": str(fee_term.id),
            "academic_year_id": 999  # Non-existent
        }
        
        response = await test_client.post("/api/v1/fee/types/", json=fee_type_data)
        
        assert response.status_code == 404
        assert "Academic year with id 999 not found" in response.json()["detail"]

    @pytest.mark.api
    async def test_create_fee_type_invalid_fee_category(self, test_client, setup_academic_year, setup_fee_term):
        """Test fee type creation with invalid fee category"""
        academic_year = setup_academic_year
        fee_term = setup_fee_term
        non_existent_id = "123e4567-e89b-12d3-a456-426614174000"
        
        fee_type_data = {
            "type_name": "Invalid Fee",
            "fee_category_id": non_existent_id,
            "fee_status": "active",
            "fee_term_id": str(fee_term.id),
            "academic_year_id": academic_year.id
        }
        
        response = await test_client.post("/api/v1/fee/types/", json=fee_type_data)
        
        assert response.status_code == 404
        assert f"Fee category with id {non_existent_id} not found" in response.json()["detail"]

    @pytest.mark.api
    async def test_create_fee_type_invalid_fee_term(self, test_client, setup_academic_year, setup_fee_category):
        """Test fee type creation with invalid fee term"""
        academic_year = setup_academic_year
        fee_category = setup_fee_category
        non_existent_id = "123e4567-e89b-12d3-a456-426614174000"
        
        fee_type_data = {
            "type_name": "Invalid Fee",
            "fee_category_id": str(fee_category.id),
            "fee_status": "active",
            "fee_term_id": non_existent_id,
            "academic_year_id": academic_year.id
        }
        
        response = await test_client.post("/api/v1/fee/types/", json=fee_type_data)
        
        assert response.status_code == 404
        assert f"Fee term with id {non_existent_id} not found" in response.json()["detail"]

    @pytest.mark.api
    async def test_create_fee_type_duplicate_name_same_category(self, test_client, test_db_session, setup_academic_year, setup_fee_category, setup_fee_term):
        """Test fee type creation with duplicate name in same fee category"""
        academic_year = setup_academic_year
        fee_category = setup_fee_category
        fee_term = setup_fee_term
        
        # Create first fee type
        fee_type1 = FeeType(
            type_name="Tuition Fee",
            fee_category_id=fee_category.id,
            fee_status="active",
            fee_term_id=fee_term.id,
            academic_year_id=academic_year.id
        )
        test_db_session.add(fee_type1)
        await test_db_session.commit()
        
        # Try to create duplicate
        fee_type_data = {
            "type_name": "Tuition Fee",  # Same name
            "fee_category_id": str(fee_category.id),  # Same category
            "fee_status": "active",
            "fee_term_id": str(fee_term.id),
            "academic_year_id": academic_year.id
        }
        
        response = await test_client.post("/api/v1/fee/types/", json=fee_type_data)
        
        assert response.status_code == 400
        assert "already exists for this fee category" in response.json()["detail"]

    @pytest.mark.api
    async def test_create_fee_type_same_name_different_category(self, test_client, setup_academic_year, setup_fee_category, setup_second_fee_category, setup_fee_term):
        """Test fee type creation with same name in different fee category (should succeed)"""
        academic_year = setup_academic_year
        fee_category1 = setup_fee_category
        fee_category2 = setup_second_fee_category
        fee_term = setup_fee_term
        
        # Create fee type in first category
        fee_type_data1 = {
            "type_name": "Tuition Fee",
            "fee_category_id": str(fee_category1.id),
            "fee_status": "active",
            "fee_term_id": str(fee_term.id),
            "academic_year_id": academic_year.id
        }
        
        response1 = await test_client.post("/api/v1/fee/types/", json=fee_type_data1)
        assert response1.status_code == 201
        
        # Create fee type with same name in second category (should succeed)
        fee_type_data2 = {
            "type_name": "Tuition Fee",  # Same name
            "fee_category_id": str(fee_category2.id),  # Different category
            "fee_status": "active",
            "fee_term_id": str(fee_term.id),
            "academic_year_id": academic_year.id
        }
        
        response2 = await test_client.post("/api/v1/fee/types/", json=fee_type_data2)
        assert response2.status_code == 201

    @pytest.mark.api
    async def test_get_fee_type_success(self, test_client, test_db_session, setup_academic_year, setup_fee_category, setup_fee_term):
        """Test successful fee type retrieval"""
        academic_year = setup_academic_year
        fee_category = setup_fee_category
        fee_term = setup_fee_term
        
        # Create a fee type
        fee_type = FeeType(
            type_name="Test Fee Type",
            fee_category_id=fee_category.id,
            fee_status="active",
            fee_term_id=fee_term.id,
            academic_year_id=academic_year.id
        )
        test_db_session.add(fee_type)
        await test_db_session.commit()
        
        response = await test_client.get(f"/api/v1/fee/types/{fee_type.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["type_name"] == "Test Fee Type"
        assert data["fee_status"] == "active"
        assert data["fee_category_name"] == "Academic Fee"
        assert data["fee_term_name"] == "Quarterly"
        assert data["academic_year_name"] == "2024-2025"
        assert len(data["fee_term_dates"]) == 4

    @pytest.mark.api
    async def test_get_fee_type_not_found(self, test_client):
        """Test fee type retrieval with non-existent ID"""
        non_existent_id = "123e4567-e89b-12d3-a456-426614174000"
        
        response = await test_client.get(f"/api/v1/fee/types/{non_existent_id}")
        
        assert response.status_code == 404
        assert f"Fee type with id {non_existent_id} not found" in response.json()["detail"]

    @pytest.mark.api
    async def test_get_all_fee_types(self, test_client, test_db_session, setup_academic_year, setup_fee_category, setup_fee_term):
        """Test retrieving all fee types"""
        academic_year = setup_academic_year
        fee_category = setup_fee_category
        fee_term = setup_fee_term
        
        # Create multiple fee types
        fee_types = [
            FeeType(type_name="Tuition Fee", fee_category_id=fee_category.id, fee_status="active", fee_term_id=fee_term.id, academic_year_id=academic_year.id),
            FeeType(type_name="Books Fee", fee_category_id=fee_category.id, fee_status="inactive", fee_term_id=fee_term.id, academic_year_id=academic_year.id)
        ]
        
        for fee_type in fee_types:
            test_db_session.add(fee_type)
        
        await test_db_session.commit()
        
        response = await test_client.get("/api/v1/fee/types/")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2
        type_names = [ft["type_name"] for ft in data]
        assert "Tuition Fee" in type_names
        assert "Books Fee" in type_names

    @pytest.mark.api
    async def test_get_fee_types_dropdown(self, test_client, test_db_session, setup_academic_year, setup_fee_category, setup_fee_term):
        """Test retrieving fee types for dropdown"""
        academic_year = setup_academic_year
        fee_category = setup_fee_category
        fee_term = setup_fee_term
        
        # Create fee type
        fee_type = FeeType(
            type_name="Library Fee",
            fee_category_id=fee_category.id,
            fee_status="active",
            fee_term_id=fee_term.id,
            academic_year_id=academic_year.id
        )
        test_db_session.add(fee_type)
        await test_db_session.commit()
        
        response = await test_client.get("/api/v1/fee/types/dropdown")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert "id" in data[0]
        assert "type_name" in data[0]
        # Should not have other fields like fee_status
        assert "fee_status" not in data[0]

    @pytest.mark.api
    async def test_get_fee_types_dropdown_filtered(self, test_client, test_db_session, setup_academic_year, setup_fee_category, setup_second_fee_category, setup_fee_term):
        """Test retrieving fee types dropdown filtered by fee category"""
        academic_year = setup_academic_year
        fee_category1 = setup_fee_category
        fee_category2 = setup_second_fee_category
        fee_term = setup_fee_term
        
        # Create fee types in different categories
        fee_types = [
            FeeType(type_name="Academic Fee Type", fee_category_id=fee_category1.id, fee_status="active", fee_term_id=fee_term.id, academic_year_id=academic_year.id),
            FeeType(type_name="Transport Fee Type", fee_category_id=fee_category2.id, fee_status="active", fee_term_id=fee_term.id, academic_year_id=academic_year.id)
        ]
        
        for fee_type in fee_types:
            test_db_session.add(fee_type)
        
        await test_db_session.commit()
        
        # Filter by first fee category
        response = await test_client.get(f"/api/v1/fee/types/dropdown?fee_category_id={fee_category1.id}")
        
        assert response.status_code == 200
        data = response.json()
        type_names = [ft["type_name"] for ft in data]
        assert "Academic Fee Type" in type_names
        assert "Transport Fee Type" not in type_names

    @pytest.mark.api
    async def test_update_fee_type_success(self, test_client, test_db_session, setup_academic_year, setup_fee_category, setup_fee_term):
        """Test successful fee type update"""
        academic_year = setup_academic_year
        fee_category = setup_fee_category
        fee_term = setup_fee_term
        
        # Create a fee type
        fee_type = FeeType(
            type_name="Original Fee Type",
            fee_category_id=fee_category.id,
            fee_status="active",
            fee_term_id=fee_term.id,
            academic_year_id=academic_year.id
        )
        test_db_session.add(fee_type)
        await test_db_session.commit()
        
        # Update the fee type
        update_data = {
            "type_name": "Updated Fee Type",
            "fee_status": "inactive"
        }
        
        response = await test_client.put(f"/api/v1/fee/types/{fee_type.id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["type_name"] == "Updated Fee Type"
        assert data["fee_status"] == "inactive"

    @pytest.mark.api
    async def test_update_fee_type_duplicate_name(self, test_client, test_db_session, setup_academic_year, setup_fee_category, setup_fee_term):
        """Test fee type update with duplicate name in same fee category"""
        academic_year = setup_academic_year
        fee_category = setup_fee_category
        fee_term = setup_fee_term
        
        # Create two fee types
        fee_type1 = FeeType(type_name="Fee Type 1", fee_category_id=fee_category.id, fee_status="active", fee_term_id=fee_term.id, academic_year_id=academic_year.id)
        fee_type2 = FeeType(type_name="Fee Type 2", fee_category_id=fee_category.id, fee_status="active", fee_term_id=fee_term.id, academic_year_id=academic_year.id)
        
        test_db_session.add(fee_type1)
        test_db_session.add(fee_type2)
        await test_db_session.commit()
        
        # Try to update fee_type2 to have the same name as fee_type1
        update_data = {"type_name": "Fee Type 1"}
        
        response = await test_client.put(f"/api/v1/fee/types/{fee_type2.id}", json=update_data)
        
        assert response.status_code == 400
        assert "already exists for this fee category" in response.json()["detail"]

    @pytest.mark.api
    async def test_delete_fee_type_success(self, test_client, test_db_session, setup_academic_year, setup_fee_category, setup_fee_term):
        """Test successful fee type deletion"""
        academic_year = setup_academic_year
        fee_category = setup_fee_category
        fee_term = setup_fee_term
        
        # Create a fee type
        fee_type = FeeType(
            type_name="Fee Type to Delete",
            fee_category_id=fee_category.id,
            fee_status="active",
            fee_term_id=fee_term.id,
            academic_year_id=academic_year.id
        )
        test_db_session.add(fee_type)
        await test_db_session.commit()
        
        response = await test_client.delete(f"/api/v1/fee/types/{fee_type.id}")
        
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]
        
        # Verify it's actually deleted
        get_response = await test_client.get(f"/api/v1/fee/types/{fee_type.id}")
        assert get_response.status_code == 404

    @pytest.mark.api
    async def test_delete_fee_type_not_found(self, test_client):
        """Test fee type deletion with non-existent ID"""
        non_existent_id = "123e4567-e89b-12d3-a456-426614174000"
        
        response = await test_client.delete(f"/api/v1/fee/types/{non_existent_id}")
        
        assert response.status_code == 404
        assert f"Fee type with id {non_existent_id} not found" in response.json()["detail"]