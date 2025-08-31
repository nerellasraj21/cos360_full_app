"""
Integration tests for Fee Category API endpoints
"""
import pytest
from datetime import date

from app.models.masters.academic_year_model import AcademicYear
from app.models.fee.fee_category_model import FeeCategory

class TestFeeCategoryAPI:
    """Test Fee Category API endpoints"""

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
    async def setup_second_academic_year(self, test_db_session):
        """Create a second academic year for testing"""
        academic_year = AcademicYear(
            title="2025-2026",
            is_active=True,
            start_date=date(2025, 4, 1),
            end_date=date(2026, 3, 31)
        )
        test_db_session.add(academic_year)
        await test_db_session.commit()
        await test_db_session.refresh(academic_year)
        return academic_year

    @pytest.mark.api
    async def test_create_fee_category_success(self, test_client, setup_academic_year):
        """Test successful fee category creation"""
        academic_year = setup_academic_year
        
        category_data = {
            "category_name": "Academic Fee",
            "category_status": "active",
            "academic_year_id": academic_year.id
        }
        
        response = await test_client.post("/api/v1/fee/categories/", json=category_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["category_name"] == "Academic Fee"
        assert data["category_status"] == "active"
        assert data["academic_year_id"] == academic_year.id
        assert "id" in data

    @pytest.mark.api
    async def test_create_fee_category_default_status(self, test_client, setup_academic_year):
        """Test fee category creation with default status"""
        academic_year = setup_academic_year
        
        category_data = {
            "category_name": "Transport Fee",
            "academic_year_id": academic_year.id
        }
        
        response = await test_client.post("/api/v1/fee/categories/", json=category_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["category_name"] == "Transport Fee"
        assert data["category_status"] == "active"  # Default value

    @pytest.mark.api
    async def test_create_fee_category_invalid_academic_year(self, test_client):
        """Test fee category creation with invalid academic year"""
        category_data = {
            "category_name": "Invalid Fee",
            "category_status": "active",
            "academic_year_id": 999  # Non-existent
        }
        
        response = await test_client.post("/api/v1/fee/categories/", json=category_data)
        
        assert response.status_code == 404
        assert "Academic year with id 999 not found" in response.json()["detail"]

    @pytest.mark.api
    async def test_create_fee_category_duplicate_name_same_year(self, test_client, test_db_session, setup_academic_year):
        """Test fee category creation with duplicate name in same academic year"""
        academic_year = setup_academic_year
        
        # Create first category
        category1 = FeeCategory(
            category_name="Academic Fee",
            category_status="active",
            academic_year_id=academic_year.id
        )
        test_db_session.add(category1)
        await test_db_session.commit()
        
        # Try to create duplicate
        category_data = {
            "category_name": "Academic Fee",  # Same name
            "category_status": "active",
            "academic_year_id": academic_year.id  # Same academic year
        }
        
        response = await test_client.post("/api/v1/fee/categories/", json=category_data)
        
        assert response.status_code == 400
        assert "already exists for this academic year" in response.json()["detail"]

    @pytest.mark.api
    async def test_create_fee_category_same_name_different_year(self, test_client, setup_academic_year, setup_second_academic_year):
        """Test fee category creation with same name in different academic year (should succeed)"""
        academic_year1 = setup_academic_year
        academic_year2 = setup_second_academic_year
        
        # Create category in first year
        category_data1 = {
            "category_name": "Academic Fee",
            "category_status": "active",
            "academic_year_id": academic_year1.id
        }
        
        response1 = await test_client.post("/api/v1/fee/categories/", json=category_data1)
        assert response1.status_code == 201
        
        # Create category with same name in second year (should succeed)
        category_data2 = {
            "category_name": "Academic Fee",  # Same name
            "category_status": "active",
            "academic_year_id": academic_year2.id  # Different academic year
        }
        
        response2 = await test_client.post("/api/v1/fee/categories/", json=category_data2)
        assert response2.status_code == 201

    @pytest.mark.api
    async def test_get_fee_category_success(self, test_client, test_db_session, setup_academic_year):
        """Test successful fee category retrieval"""
        academic_year = setup_academic_year
        
        # Create a fee category
        category = FeeCategory(
            category_name="Test Category",
            category_status="active",
            academic_year_id=academic_year.id
        )
        test_db_session.add(category)
        await test_db_session.commit()
        
        response = await test_client.get(f"/api/v1/fee/categories/{category.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["category_name"] == "Test Category"
        assert data["category_status"] == "active"
        assert data["academic_year_id"] == academic_year.id

    @pytest.mark.api
    async def test_get_fee_category_not_found(self, test_client):
        """Test fee category retrieval with non-existent ID"""
        non_existent_id = "123e4567-e89b-12d3-a456-426614174000"
        
        response = await test_client.get(f"/api/v1/fee/categories/{non_existent_id}")
        
        assert response.status_code == 404
        assert f"Fee category with id {non_existent_id} not found" in response.json()["detail"]

    @pytest.mark.api
    async def test_get_all_fee_categories(self, test_client, test_db_session, setup_academic_year):
        """Test retrieving all fee categories"""
        academic_year = setup_academic_year
        
        # Create multiple categories
        categories = [
            FeeCategory(category_name="Academic Fee", category_status="active", academic_year_id=academic_year.id),
            FeeCategory(category_name="Transport Fee", category_status="inactive", academic_year_id=academic_year.id)
        ]
        
        for category in categories:
            test_db_session.add(category)
        
        await test_db_session.commit()
        
        response = await test_client.get("/api/v1/fee/categories/")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2
        category_names = [cat["category_name"] for cat in data]
        assert "Academic Fee" in category_names
        assert "Transport Fee" in category_names

    @pytest.mark.api
    async def test_get_fee_categories_dropdown(self, test_client, test_db_session, setup_academic_year):
        """Test retrieving fee categories for dropdown"""
        academic_year = setup_academic_year
        
        # Create categories
        category = FeeCategory(
            category_name="Academic Fee",
            category_status="active",
            academic_year_id=academic_year.id
        )
        test_db_session.add(category)
        await test_db_session.commit()
        
        response = await test_client.get("/api/v1/fee/categories/dropdown")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert "id" in data[0]
        assert "category_name" in data[0]
        # Should not have other fields like category_status
        assert "category_status" not in data[0]

    @pytest.mark.api
    async def test_get_fee_categories_dropdown_filtered(self, test_client, test_db_session, setup_academic_year, setup_second_academic_year):
        """Test retrieving fee categories dropdown filtered by academic year"""
        academic_year1 = setup_academic_year
        academic_year2 = setup_second_academic_year
        
        # Create categories in different years
        categories = [
            FeeCategory(category_name="Year 1 Fee", category_status="active", academic_year_id=academic_year1.id),
            FeeCategory(category_name="Year 2 Fee", category_status="active", academic_year_id=academic_year2.id)
        ]
        
        for category in categories:
            test_db_session.add(category)
        
        await test_db_session.commit()
        
        # Filter by first academic year
        response = await test_client.get(f"/api/v1/fee/categories/dropdown?academic_year_id={academic_year1.id}")
        
        assert response.status_code == 200
        data = response.json()
        category_names = [cat["category_name"] for cat in data]
        assert "Year 1 Fee" in category_names
        assert "Year 2 Fee" not in category_names

    @pytest.mark.api
    async def test_update_fee_category_success(self, test_client, test_db_session, setup_academic_year):
        """Test successful fee category update"""
        academic_year = setup_academic_year
        
        # Create a category
        category = FeeCategory(
            category_name="Original Category",
            category_status="active",
            academic_year_id=academic_year.id
        )
        test_db_session.add(category)
        await test_db_session.commit()
        
        # Update the category
        update_data = {
            "category_name": "Updated Category",
            "category_status": "inactive"
        }
        
        response = await test_client.put(f"/api/v1/fee/categories/{category.id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["category_name"] == "Updated Category"
        assert data["category_status"] == "inactive"

    @pytest.mark.api
    async def test_update_fee_category_duplicate_name(self, test_client, test_db_session, setup_academic_year):
        """Test fee category update with duplicate name in same academic year"""
        academic_year = setup_academic_year
        
        # Create two categories
        category1 = FeeCategory(category_name="Category 1", category_status="active", academic_year_id=academic_year.id)
        category2 = FeeCategory(category_name="Category 2", category_status="active", academic_year_id=academic_year.id)
        
        test_db_session.add(category1)
        test_db_session.add(category2)
        await test_db_session.commit()
        
        # Try to update category2 to have the same name as category1
        update_data = {"category_name": "Category 1"}
        
        response = await test_client.put(f"/api/v1/fee/categories/{category2.id}", json=update_data)
        
        assert response.status_code == 400
        assert "already exists for this academic year" in response.json()["detail"]

    @pytest.mark.api
    async def test_delete_fee_category_success(self, test_client, test_db_session, setup_academic_year):
        """Test successful fee category deletion"""
        academic_year = setup_academic_year
        
        # Create a category
        category = FeeCategory(
            category_name="Category to Delete",
            category_status="active",
            academic_year_id=academic_year.id
        )
        test_db_session.add(category)
        await test_db_session.commit()
        
        response = await test_client.delete(f"/api/v1/fee/categories/{category.id}")
        
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]
        
        # Verify it's actually deleted
        get_response = await test_client.get(f"/api/v1/fee/categories/{category.id}")
        assert get_response.status_code == 404

    @pytest.mark.api
    async def test_delete_fee_category_not_found(self, test_client):
        """Test fee category deletion with non-existent ID"""
        non_existent_id = "123e4567-e89b-12d3-a456-426614174000"
        
        response = await test_client.delete(f"/api/v1/fee/categories/{non_existent_id}")
        
        assert response.status_code == 404
        assert f"Fee category with id {non_existent_id} not found" in response.json()["detail"]